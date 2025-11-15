"use client";

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

        // Copy original audio at reduced volume
        for (let i = 0; i < totalSamples; i++) {
            outputData[i] = audioData[i] * 0.5;
        }

        // Add beats at detected positions
        beats.forEach((beatTime: number, index: number, arr: number[]) => {
            const samplePosition = Math.floor(beatTime * sampleRate);
            const nextBeat = arr[index + 1] || beatTime + 0.5;
            const halfBeatSeconds = beatTime + Math.abs(nextBeat - beatTime) / 2;
            const halfBeatPosition = Math.floor(halfBeatSeconds * sampleRate);

            // Add tick sound on the beat
            for (let i = 0; i < tickSamples.length; i++) {
                const outputIndex = samplePosition + i;
                if (outputIndex < totalSamples) {
                    outputData[outputIndex] += tickSamples[i] * 0.4;
                }
            }

            // Add tock sound at half beat
            for (let i = 0; i < tockSamples.length; i++) {
                const outputIndex = halfBeatPosition + i;
                if (outputIndex < totalSamples) {
                    outputData[outputIndex] += tockSamples[i] * 0.4;
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
    } finally {
        essentia.shutdown();
        essentia.delete();
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
