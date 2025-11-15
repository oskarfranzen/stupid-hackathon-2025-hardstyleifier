"use client";

import { useState } from "react";
import "./page.css";
import { processAudioInBrowser, playAudioBuffer } from "./audioProcessor";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [processedAudio, setProcessedAudio] = useState<AudioBuffer | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioControl, setAudioControl] = useState<{
    stop: () => void;
    context: AudioContext;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage("");
      setProcessedAudio(null);
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setMessage("YO! DROP A TRACK FIRST! 🎵");
      return;
    }

    setProcessing(true);
    setProcessedAudio(null);

    try {
      const audioBuffer = await processAudioInBrowser(file, (progress) => {
        setMessage(`🔥 ${progress}`);
      });

      setProcessedAudio(audioBuffer);
      setMessage(`⚡ BOOM! YOUR TRACK IS READY TO RAGE! ⚡`);
    } catch (error) {
      setMessage("💥 SYSTEM OVERLOAD! TRY AGAIN!");
      console.error("Processing error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handlePlay = () => {
    if (!processedAudio) return;

    if (isPlaying && audioControl) {
      // Stop current playback
      audioControl.stop();
      setIsPlaying(false);
      setAudioControl(null);
    } else {
      // Start playback
      const control = playAudioBuffer(processedAudio, () => {
        setIsPlaying(false);
        setAudioControl(null);
      });
      setAudioControl(control);
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!processedAudio) return;

    // Convert AudioBuffer to WAV and download
    const wav = audioBufferToWav(processedAudio);
    const blob = new Blob([wav], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, "")}-hardstyle.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="container">
      <div className="card">
        <h1>🔥 HARDSTYLE 🔥</h1>
        <p className="subtitle">⚡ UNLEASH THE BASS ⚡</p>

        <form onSubmit={handleProcess} className="upload-form">
          <div className="file-input-wrapper">
            <input
              id="file-input"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={processing}
              className="file-input"
            />
            <label htmlFor="file-input" className="file-label">
              {file ? `🎵 ${file.name}` : "🔊 DROP YOUR TRACK HERE 🔊"}
            </label>
          </div>

          <button
            type="submit"
            disabled={!file || processing}
            className="submit-button"
          >
            {processing ? "🔥 IGNITING THE BASS 🔥" : "⚡ MAKE IT HARD ⚡"}
          </button>
        </form>

        {processedAudio && (
          <div className="playback-controls">
            <button
              onClick={handlePlay}
              className="submit-button"
              style={{ marginTop: "10px" }}
            >
              {isPlaying ? "🛑 KILL IT" : "🚀 BLAST IT"}
            </button>
            <button
              onClick={handleDownload}
              className="submit-button"
              style={{ marginTop: "10px", marginLeft: "10px" }}
            >
              💾 SAVE THE MADNESS
            </button>
          </div>
        )}

        {message && (
          <div
            className={`message ${
              message.includes("⚡") || message.includes("READY")
                ? "success"
                : message.includes("💥") || message.includes("OVERLOAD")
                ? "error"
                : ""
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}

// Helper function to convert AudioBuffer to WAV
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
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
  // byte rate (sample rate * block align)
  setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
  // block align (channel count * bytes per sample)
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
