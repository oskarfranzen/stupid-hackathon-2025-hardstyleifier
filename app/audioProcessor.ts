"use client";

export interface BanificationScore {
    score: number; // 0-100
    bpm: number;
    energy: number;
    danceability: number;
    dynamicComplexity: number;
    spectralEnergy: number;
    verdict: 'ALREADY A BANGER' | 'NEEDS TO BE BANGIFIED';
    message: string;
}

/**
 * Analyze audio and calculate banification score
 * @param audioFile - The input audio file
 * @param onProgress - Optional callback for progress updates
 * @returns BanificationScore object with analysis results
 */
export async function analyzeBanification(
    audioFile: File,
    onProgress?: (message: string) => void
): Promise<BanificationScore> {
    onProgress?.('SCANNING YOUR TRACK... 🔍');

    // Dynamically import essentia.js for browser use
    //@ts-ignore
    const EssentiaModule = await import('essentia.js/dist/essentia-wasm.web.js');
    //@ts-ignore
    const EssentiaClass = await import('essentia.js/dist/essentia.js-core.es.js');

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Read the uploaded file
    const arrayBuffer = await audioFile.arrayBuffer();

    onProgress?.('LOADING YOUR JAM... 🎵');
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Initialize Essentia with the WASM backend
    onProgress?.('ANALYZING THE VIBES... 💫');
    //@ts-ignore
    const EssentiaWASM = await EssentiaModule.default({
        locateFile: (file: string) => {
            return `/essentia-wasm.web.wasm`;
        }
    });
    //@ts-ignore
    const essentia = new EssentiaClass.default(EssentiaWASM);

    try {
        console.log('[ANALYSIS] Starting analysis...');

        // Get audio data
        const audioData = audioBuffer.getChannelData(0);
        console.log('[ANALYSIS] Audio data length:', audioData.length);

        let audioVector = essentia.arrayToVector(audioData);
        console.log('[ANALYSIS] Created audio vector');

        onProgress?.('MEASURING THE ENERGY... ⚡');

        // 1. Estimate BPM using RhythmDescriptors (simpler than RhythmExtractor2013)
        let bpm = 120; // default
        try {
            console.log('[ANALYSIS] Calculating BPM...');
            const rhythmResult = essentia.RhythmDescriptors(audioVector);
            bpm = rhythmResult.bpm || 120;
            console.log('[ANALYSIS] BPM:', bpm);
        } catch (e) {
            console.warn('[ANALYSIS] BPM detection failed, using default:', e);
        }

        // 2. Calculate Energy
        console.log('[ANALYSIS] Calculating energy...');
        const energy = essentia.Energy(audioVector).energy;
        console.log('[ANALYSIS] Energy:', energy);

        // 3. Calculate RMS for loudness
        console.log('[ANALYSIS] Calculating RMS...');
        const rms = essentia.RMS(audioVector).rms;
        console.log('[ANALYSIS] RMS:', rms);

        // 4. Calculate Zero Crossing Rate (indicates percussive/noise content)
        console.log('[ANALYSIS] Calculating Zero Crossing Rate...');
        let zcr = 0;
        const frameSize = 2048;
        const hopSize = 1024;
        let zcrCount = 0;

        for (let i = 0; i + frameSize < audioData.length; i += hopSize) {
            const frame = audioData.slice(i, i + frameSize);
            const frameVector = essentia.arrayToVector(frame);
            const zcrResult = essentia.ZeroCrossingRate(frameVector);
            zcr += zcrResult.zeroCrossingRate;
            zcrCount++;
            // Don't delete frameVector - it causes Essentia to become invalid
        }
        zcr = zcrCount > 0 ? zcr / zcrCount : 0;
        console.log('[ANALYSIS] ZCR:', zcr, 'from', zcrCount, 'frames');

        // 5. Calculate spectral energy (high frequency content)
        onProgress?.('SCANNING FREQUENCIES... 🎚️');
        console.log('[ANALYSIS] Calculating spectral features...');
        let spectralEnergySum = 0;
        let spectralCentroidSum = 0;
        let frameCount = 0;

        for (let i = 0; i + frameSize < audioData.length; i += hopSize) {
            const frame = audioData.slice(i, i + frameSize);
            const frameVector = essentia.arrayToVector(frame);
            const windowed = essentia.Windowing(frameVector);
            const spectrum = essentia.Spectrum(windowed.frame);

            // High Frequency Content
            const hfc = essentia.HFC(spectrum.spectrum);
            spectralEnergySum += hfc.hfc;

            // Spectral Centroid (brightness)
            const centroid = essentia.Centroid(spectrum.spectrum);
            spectralCentroidSum += centroid.centroid;

            frameCount++;
            // Don't delete any objects - let garbage collector handle it
        }

        const spectralEnergy = frameCount > 0 ? spectralEnergySum / frameCount : 0;
        const spectralCentroid = frameCount > 0 ? spectralCentroidSum / frameCount : 0;
        console.log('[ANALYSIS] Spectral energy:', spectralEnergy, 'centroid:', spectralCentroid, 'from', frameCount, 'frames');

        onProgress?.('CALCULATING BANGER POTENTIAL... 🎯');
        console.log('[ANALYSIS] Calculating scores...');

        // Normalize and score each component (0-100)
        const bpmScore = Math.min(100, Math.max(0, ((bpm - 80) / 70) * 100)); // 150+ BPM is ideal
        const energyScore = Math.min(100, Math.log10(energy + 1) * 20); // Logarithmic scale
        const loudnessScore = Math.min(100, rms * 200); // RMS-based loudness
        const zcrScore = Math.min(100, zcr * 500); // Zero crossing indicates percussion
        const spectralScore = Math.min(100, (spectralEnergy / 5) * 100); // High frequency energy
        const brightnessScore = Math.min(100, (spectralCentroid / 5000) * 100); // Spectral brightness

        console.log('[ANALYSIS] Component scores:', { bpmScore, energyScore, loudnessScore, zcrScore, spectralScore, brightnessScore });

        // Calculate danceability estimate (combination of rhythm and energy)
        const danceability = (bpmScore * 0.4 + energyScore * 0.3 + zcrScore * 0.3) / 100;
        const dynamicComplexity = Math.min(10, (spectralEnergy + energy) / 10000);

        // Calculate weighted average (BPM and energy are most important for hardstyle)
        const totalScore = (
            bpmScore * 0.25 +          // 25% weight on BPM
            energyScore * 0.20 +       // 20% weight on energy
            loudnessScore * 0.20 +     // 20% weight on loudness
            spectralScore * 0.15 +     // 15% weight on spectral energy
            brightnessScore * 0.10 +   // 10% weight on brightness
            zcrScore * 0.10            // 10% weight on percussion
        );

        const verdict = totalScore >= 65 ? 'ALREADY A BANGER' : 'NEEDS TO BE BANGIFIED';

        let message = '';
        if (totalScore >= 80) {
            message = `🔥 THIS TRACK SLAPS! Score: ${totalScore.toFixed(0)}/100 - Pure fire! 🔥`;
        } else if (totalScore >= 65) {
            message = `✨ Nice vibes! Score: ${totalScore.toFixed(0)}/100 - Already a solid banger! ✨`;
        } else if (totalScore >= 45) {
            message = `⚡ Has potential! Score: ${totalScore.toFixed(0)}/100 - Let's make it BANG! ⚡`;
        } else {
            message = `💥 Needs work! Score: ${totalScore.toFixed(0)}/100 - Time to hardstylify! 💥`;
        }

        console.log('[ANALYSIS] Final score:', totalScore, 'verdict:', verdict);
        console.log('[ANALYSIS] Analysis complete, preparing result...');

        // Don't delete audioVector here - it will cause issues
        // Just prepare and return the result
        const result = {
            score: totalScore,
            bpm,
            energy,
            danceability,
            dynamicComplexity,
            spectralEnergy,
            verdict: verdict as 'ALREADY A BANGER' | 'NEEDS TO BE BANGIFIED',
            message
        };

        console.log('[ANALYSIS] Returning result');
        return result;
    } catch (error) {
        console.error('[ANALYSIS] ERROR occurred:', error);
        console.error('[ANALYSIS] Error type:', (error as any)?.constructor?.name);
        console.error('[ANALYSIS] Error message:', (error as any)?.message);
        console.error('[ANALYSIS] Error stack:', (error as any)?.stack);
        throw error;
    }
}

/**
 * Process an audio file in the browser and add hardstyle beats to it
 * @param audioFile - The input audio file
 * @param onProgress - Optional callback for progress updates
 * @returns An AudioBuffer with the processed audio
 */
export async function processAudioInBrowser(
    audioFile: File,
    onProgress?: (message: string) => void
): Promise<AudioBuffer> {
    onProgress?.('WARMING UP THE SYSTEM... 🎛️');

    // Dynamically import essentia.js for browser use
    //@ts-ignore
    const EssentiaModule = await import('essentia.js/dist/essentia-wasm.web.js');
    //@ts-ignore
    const EssentiaClass = await import('essentia.js/dist/essentia.js-core.es.js');

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Read the uploaded file
    const arrayBuffer = await audioFile.arrayBuffer();

    onProgress?.('LOADING YOUR JAM... 🎵');
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Initialize Essentia with the WASM backend
    onProgress?.('FIRING UP THE BASS CANNON... 💥');
    //@ts-ignore
    const EssentiaWASM = await EssentiaModule.default({
        locateFile: (file: string) => {
            // Tell Essentia where to find the WASM file
            return `/essentia-wasm.web.wasm`;
        }
    });
    //@ts-ignore
    const essentia = new EssentiaClass.default(EssentiaWASM);

    try {
        // Get audio data
        const audioData = audioBuffer.getChannelData(0);

        onProgress?.('SCANNING FOR THE DROP... 🔍');

        // Analyze rhythm and find beat positions
        const audioVector = essentia.arrayToVector(audioData);
        const result = essentia.RhythmDescriptors(audioVector);
        const beats = essentia.vectorToArray(result.beats_position);

        onProgress?.(`LOCKED ${beats.length} BEATS! LOADING KICKS... 🥁`);

        // Load tick and tock samples
        const [tickBuffer, tockBuffer] = await Promise.all([
            fetch('/hskick.wav').then(r => r.arrayBuffer()).then(b => audioContext.decodeAudioData(b)),
            fetch('/tick.wav').then(r => r.arrayBuffer()).then(b => audioContext.decodeAudioData(b))
        ]);

        const tickSamples = tickBuffer.getChannelData(0);
        const tockSamples = tockBuffer.getChannelData(0);

        onProgress?.('INJECTING THE MADNESS... 💉');

        const sampleRate = audioBuffer.sampleRate;
        const totalSamples = audioData.length;
        const outputData = new Float32Array(totalSamples);

        // Copy original audio
        for (let i = 0; i < totalSamples; i++) {
            outputData[i] = audioData[i];
        }

        // Apply ducking and add beats at detected positions
        const duckingAmount = 0.2; // Duck to 10% volume
        const attackTime = 0.01; // 5ms attack
        const releaseTime = 0.15; // 150ms release
        const attackSamples = Math.floor(attackTime * sampleRate);
        const releaseSamples = Math.floor(releaseTime * sampleRate);

        beats.forEach((beatTime: number, index: number, arr: number[]) => {
            const samplePosition = Math.floor(beatTime * sampleRate);
            const nextBeat = arr[index + 1] || beatTime + 0.5;
            const halfBeatSeconds = beatTime + Math.abs(nextBeat - beatTime) / 2;
            const halfBeatPosition = Math.floor(halfBeatSeconds * sampleRate);

            // Apply ducking envelope to original audio around the kick
            const duckStart = Math.max(0, samplePosition - attackSamples);
            const duckEnd = Math.min(totalSamples, samplePosition + releaseSamples);

            for (let i = duckStart; i < duckEnd; i++) {
                let duckGain = 1.0;

                if (i < samplePosition) {
                    // Attack phase - reduce volume as we approach the kick
                    const progress = (i - duckStart) / attackSamples;
                    duckGain = 1.0 - (progress * (1.0 - duckingAmount));
                } else {
                    // Stay at ducked volume for the entire release period
                    duckGain = duckingAmount;
                }

                outputData[i] *= duckGain;
            }

            // Add tick sound on the beat
            for (let i = 0; i < tickSamples.length; i++) {
                const outputIndex = samplePosition + i;
                if (outputIndex < totalSamples) {
                    outputData[outputIndex] += tickSamples[i] * 0.5;
                }
            }

        });

        onProgress?.('FINAL BOSS MODE ACTIVATED... 🎮');

        // Create new audio buffer with processed data
        const processedBuffer = audioContext.createBuffer(
            1,
            totalSamples,
            sampleRate
        );
        processedBuffer.copyToChannel(outputData, 0);

        return processedBuffer;
    } catch (error) {
        console.error('Processing error:', error);
        throw error;
    }
}

/**
 * Play an audio buffer in the browser
 * @param audioBuffer - The audio buffer to play
 * @param onEnded - Optional callback when playback ends
 * @returns An object with methods to control playback
 */
export function playAudioBuffer(
    audioBuffer: AudioBuffer,
    onEnded?: () => void
): { stop: () => void; context: AudioContext } {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    if (onEnded) {
        source.onended = onEnded;
    }

    source.start(0);

    return {
        stop: () => {
            source.stop();
        },
        context: audioContext
    };
}
