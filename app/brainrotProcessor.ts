"use client";

import { getEssentiaInstance } from './essentiaInstance';

/**
 * Analyze audio and find downbeat positions
 */
export async function findDownbeats(audioBuffer: AudioBuffer): Promise<number[]> {
    // Get the shared Essentia instance
    const essentia = await getEssentiaInstance();

    const audioData = audioBuffer.getChannelData(0);
    console.log(`Analyzing ${(audioData.length / audioBuffer.sampleRate).toFixed(2)}s of audio...`);

    const audioVector = essentia.arrayToVector(audioData);
    const result = essentia.RhythmDescriptors(audioVector);
    const beats = essentia.vectorToArray(result.beats_position);

    return beats;
}

interface SongSlice {
    audioData: Float32Array;
    startTime: number;
    duration: number;
}

/**
 * Generate a brainrot song by combining random slices from multiple songs
 */
export async function generateBrainrotSong(
    audioBuffers: AudioBuffer[],
    onProgress?: (message: string) => void
): Promise<AudioBuffer> {
    onProgress?.('🧠 INITIALIZING BEAT ANALYZER...');

    // Initialize Essentia once before processing
    await getEssentiaInstance();
    onProgress?.('✅ ANALYZER READY!');

    // Find downbeats for all songs sequentially to show progress
    const allDownbeats: { buffer: AudioBuffer; downbeats: number[] }[] = [];

    for (let index = 0; index < audioBuffers.length; index++) {
        const buffer = audioBuffers[index];
        onProgress?.(`🔍 ANALYZING TRACK ${index + 1}/${audioBuffers.length}...`);
        const downbeats = await findDownbeats(buffer);
        allDownbeats.push({ buffer, downbeats });
        console.log(`✅ Track ${index + 1}/${audioBuffers.length} complete: found ${downbeats.length} beats`);
        onProgress?.(`✅ TRACK ${index + 1}/${audioBuffers.length} DONE - ${downbeats.length} BEATS FOUND!`);
    }

    onProgress?.('🎲 SHUFFLING THE CHAOS...');

    // Create slices from each song at downbeat positions
    const slices: SongSlice[] = [];
    const minSliceDuration = 0.2; // 200ms minimum
    const maxSliceDuration = 2.0; // 2 seconds maximum

    console.log('Creating slices from beat patterns...');
    allDownbeats.forEach(({ buffer, downbeats }, songIndex) => {
        const audioData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        let slicesFromThisSong = 0;

        // Create slices between consecutive downbeats
        for (let i = 0; i < downbeats.length - 1; i++) {
            const startTime = downbeats[i];
            const endTime = downbeats[i + 1];
            const duration = endTime - startTime;

            // Only use slices of reasonable duration
            if (duration >= minSliceDuration && duration <= maxSliceDuration) {
                const startSample = Math.floor(startTime * sampleRate);
                const endSample = Math.floor(endTime * sampleRate);
                const sliceData = audioData.slice(startSample, endSample);

                slices.push({
                    audioData: sliceData,
                    startTime,
                    duration
                });
                slicesFromThisSong++;
            }
        }
        console.log(`Song ${songIndex + 1}: Created ${slicesFromThisSong} slices`);
    });

    console.log(`Total slices created: ${slices.length}`);
    onProgress?.(`🎵 CREATED ${slices.length} SLICES!`);

    // Shuffle slices randomly
    console.log('Shuffling slices...');
    for (let i = slices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slices[i], slices[j]] = [slices[j], slices[i]];
    }

    // Take a random subset of slices (30-60 slices for rapid-fire chaos)
    const numSlices = Math.min(slices.length, Math.floor(Math.random() * 30) + 30);
    const selectedSlices = slices.slice(0, numSlices);
    console.log(`Selected ${numSlices} slices for final mix`);

    onProgress?.(`🎲 SELECTED ${numSlices} RANDOM SLICES!`);
    onProgress?.('🔥 ASSEMBLING THE MADNESS...');

    // Calculate total length
    let totalSamples = 0;
    const sampleRate = audioBuffers[0].sampleRate;

    selectedSlices.forEach(slice => {
        totalSamples += slice.audioData.length;
    });

    const totalDuration = totalSamples / sampleRate;
    console.log(`Total output duration: ${totalDuration.toFixed(2)} seconds`);
    onProgress?.(`⏱️ OUTPUT LENGTH: ${totalDuration.toFixed(1)} SECONDS`);

    // Create output buffer
    const outputData = new Float32Array(totalSamples);
    let currentPosition = 0;

    // Combine slices with crossfade
    const crossfadeSamples = Math.floor(0.01 * sampleRate); // 10ms crossfade

    console.log('Combining slices with crossfades...');
    selectedSlices.forEach((slice, index) => {
        const sliceData = slice.audioData;

        for (let i = 0; i < sliceData.length; i++) {
            let sample = sliceData[i];

            // Fade in at the start of each slice
            if (i < crossfadeSamples) {
                const fadeIn = i / crossfadeSamples;
                sample *= fadeIn;
            }

            // Fade out at the end of each slice
            if (i > sliceData.length - crossfadeSamples) {
                const fadeOut = (sliceData.length - i) / crossfadeSamples;
                sample *= fadeOut;
            }

            outputData[currentPosition + i] = sample;
        }

        currentPosition += sliceData.length;
    });

    console.log('Slice combination complete!');
    onProgress?.('✨ FINALIZING BRAINROT...');

    // Create audio context and buffer
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const processedBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);
    processedBuffer.copyToChannel(outputData, 0);

    console.log('Brainrot generation complete! 🧠');
    return processedBuffer;
}

/**
 * Convert AudioBuffer to WAV format
 */
export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952);
    // file length
    setUint32(length - 8);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(1);
    // channel count
    setUint16(buffer.numberOfChannels);
    // sample rate
    setUint32(buffer.sampleRate);
    // byte rate
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
    // block align
    setUint16(buffer.numberOfChannels * 2);
    // bits per sample
    setUint16(16);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length - pos - 4);

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return arrayBuffer;
}
