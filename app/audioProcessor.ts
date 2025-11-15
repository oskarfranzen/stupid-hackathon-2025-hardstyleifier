"use client";

import { getEssentiaInstance } from './essentiaInstance';

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

    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Read the uploaded file
    const arrayBuffer = await audioFile.arrayBuffer();

    onProgress?.('LOADING YOUR JAM... 🎵');
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get the shared Essentia instance
    onProgress?.('FIRING UP THE BASS CANNON... 💥');
    const essentia = await getEssentiaInstance();

    // Get audio data
    const audioData = audioBuffer.getChannelData(0);

    onProgress?.('SCANNING FOR THE DROP... 🔍');

    // Analyze rhythm and find beat positions
    const audioVector = essentia.arrayToVector(audioData);
    const result = essentia.RhythmDescriptors(audioVector);
    const beats = essentia.vectorToArray(result.beats_position);

    onProgress?.(`LOCKED ${beats.length} BEATS! LOADING KICKS... 🥁`);

    // Load kick sample
    const tickBuffer = await fetch('/hskick.wav').then(r => r.arrayBuffer()).then(b => audioContext.decodeAudioData(b));
    const tickSamples = tickBuffer.getChannelData(0);

    onProgress?.('INJECTING THE MADNESS... 💉');

    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = audioData.length;
    const outputData = new Float32Array(totalSamples);

    // Copy original audio at full volume
    for (let i = 0; i < totalSamples; i++) {
        outputData[i] = audioData[i];
    }

    // Sidechain parameters
    const duckAmount = 0.2; // Duck to 20% volume
    const attackSamples = Math.floor(0.01 * sampleRate); // 10ms attack
    const releaseSamples = Math.floor(0.15 * sampleRate); // 150ms release

    // Add beats at detected positions with sidechaining
    beats.forEach((beatTime: number) => {
        const samplePosition = Math.floor(beatTime * sampleRate);

        // Apply sidechain ducking for the kick
        const kickDuration = tickSamples.length;
        const duckDuration = kickDuration + releaseSamples;

        for (let i = 0; i < duckDuration && (samplePosition + i) < totalSamples; i++) {
            const outputIndex = samplePosition + i;
            let envelope = 1.0;

            if (i < attackSamples) {
                // Attack: fade down quickly
                envelope = 1.0 - ((1.0 - duckAmount) * (i / attackSamples));
            } else if (i < kickDuration) {
                // Sustain: keep ducked
                envelope = duckAmount;
            } else {
                // Release: fade back up
                const releaseProgress = (i - kickDuration) / releaseSamples;
                envelope = duckAmount + (1.0 - duckAmount) * releaseProgress;
            }

            outputData[outputIndex] *= envelope;
        }

        // Add kick sound on the beat
        for (let i = 0; i < tickSamples.length; i++) {
            const outputIndex = samplePosition + i;
            if (outputIndex < totalSamples) {
                outputData[outputIndex] += tickSamples[i] * 0.6;
            }
        }
    });

    onProgress?.('Creating audio buffer...');

    // Create new audio buffer with processed data
    const processedBuffer = audioContext.createBuffer(
        1,
        totalSamples,
        sampleRate
    );
    processedBuffer.copyToChannel(outputData, 0);

    return processedBuffer;
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
