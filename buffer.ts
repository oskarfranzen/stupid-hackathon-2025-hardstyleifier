//@ts-ignore
import esPkg from 'essentia.js'

import type { default as EssentiaType } from 'essentia.js/dist/core_api.d.ts';
import { readFile } from 'fs/promises';
import decode from 'audio-decode';
import { WaveFile } from 'wavefile';
import path from 'path';

/**
 * Process an audio file and add hardstyle beats to it
 * @param audioBuffer - The input audio file as a Buffer
 * @returns The processed audio as a Buffer (WAV format)
 */
export async function processAudioWithBeats(audioBuffer: Buffer): Promise<Buffer> {
    const essentia: EssentiaType = new esPkg.Essentia(esPkg.EssentiaWASM);

    try {
        // Decode the input audio
        const music = await decode(audioBuffer);

        // Analyze rhythm and find beat positions
        const audioVector = essentia.arrayToVector(music.getChannelData(0));
        const result = essentia.RhythmDescriptors(audioVector);
        const ticks = essentia.vectorToArray(result.beats_position);

        // Load tick and tock samples
        const tickBuffer = await readFile(path.join(process.cwd(), 'hskick.wav'));
        const tickAudio = await decode(tickBuffer);
        const tickSamples = tickAudio.getChannelData(0);

        const tockBuffer = await readFile(path.join(process.cwd(), 'tick.wav'));
        const tockAudio = await decode(tockBuffer);
        const tockSamples = tockAudio.getChannelData(0);

        const sampleRate = music.sampleRate;
        const totalSamples = music.getChannelData(0).length;
        const outputBuffer = new Float32Array(totalSamples);

        // Copy original audio at reduced volume
        for (let i = 0; i < totalSamples; i++) {
            outputBuffer[i] = music.getChannelData(0)[i] * 0.5;
        }

        // Add beats at detected positions
        ticks.slice(0).forEach((tickTime, index, arr) => {
            const samplePosition = Math.floor(tickTime * sampleRate);
            const halfBeatSeconds = tickTime + (Math.abs(arr[index + 1] - tickTime) / 2)
            const halfBeatPostition = Math.floor(halfBeatSeconds * sampleRate)

            // Add tick sound
            for (let i = 0; i < tickSamples.length; i++) {
                const outputIndex = samplePosition + i;
                if (outputIndex < totalSamples) {
                    outputBuffer[outputIndex] += tickSamples[i] * 0.4;
                }
            }

            // Add tock sound at half beat
            for (let i = 0; i < tockSamples.length; i++) {
                const outputIndex = halfBeatPostition + i;
                if (outputIndex < totalSamples) {
                    outputBuffer[outputIndex] += tockSamples[i] * 0.4;
                }
            }
        });

        // Convert to 16-bit PCM
        const int16Buffer = new Int16Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const sample = Math.max(-1, Math.min(1, outputBuffer[i]));
            int16Buffer[i] = Math.floor(sample * 32767);
        }

        // Create WAV file
        const wav = new WaveFile();
        wav.fromScratch(1, sampleRate, '16', int16Buffer);

        return Buffer.from(wav.toBuffer());
    } finally {
        essentia.shutdown();
        essentia.delete();
    }
}

