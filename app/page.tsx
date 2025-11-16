"use client";

import { useEffect, useRef, useState } from "react";
import "./page.css";
import {
  analyzeBanification,
  BanificationScore,
  playAudioBuffer,
  processAudioInBrowser,
} from "./audioProcessor";
import { PixooClient } from "./pixoo/client";
import { PixooVisualizer } from "./pixoo/visualizer";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [banificationScore, setBanificationScore] = useState<
    BanificationScore | null
  >(null);
  const [processedAudio, setProcessedAudio] = useState<AudioBuffer | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioControl, setAudioControl] = useState<
    {
      stop: () => void;
      context: AudioContext;
    } | null
  >(null);

  // Pixoo visualizer setup
  const visualizerRef = useRef<PixooVisualizer | null>(null);
  const updateIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize visualizer on mount
    const pixooClient = new PixooClient();
    visualizerRef.current = new PixooVisualizer(pixooClient);

    return () => {
      // Cleanup on unmount
      if (visualizerRef.current) {
        visualizerRef.current.stop();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage("");
      setProcessedAudio(null);
      setBanificationScore(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setMessage("YO! DROP A TRACK FIRST! 🎵");
      return;
    }

    setAnalyzing(true);
    setBanificationScore(null);
    setMessage("");

    // Start visualizer
    if (visualizerRef.current) {
      visualizerRef.current.start();
    }

    try {
      const score = await analyzeBanification(file, (progress) => {
        setMessage(`🔍 ${progress}`);
      });

      setBanificationScore(score);
      setMessage(score.message);

      // Update visualizer with final score
      if (visualizerRef.current) {
        await visualizerRef.current.updateMetrics({
          bpm: score.bpm,
          energy: score.energy,
          score: score.score,
          danceability: score.danceability * 100,
          spectralEnergy: score.spectralEnergy * 100,
        });
      }
    } catch (error) {
      setMessage("💥 ANALYSIS FAILED! TRY AGAIN!");
      console.error("Analysis error:", error);
    } finally {
      setAnalyzing(false);

      // Stop visualizer after a delay to show final result
      setTimeout(() => {
        if (visualizerRef.current) {
          visualizerRef.current.stop();
        }
      }, 3000);
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

  const handlePlay = async () => {
    if (!processedAudio) return;

    if (isPlaying && audioControl) {
      // Stop current playback
      audioControl.stop();
      setIsPlaying(false);
      setAudioControl(null);

      // Stop visualizer
      if (visualizerRef.current) {
        visualizerRef.current.stop();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    } else {
      // Start playback
      const control = playAudioBuffer(processedAudio, () => {
        setIsPlaying(false);
        setAudioControl(null);

        // Stop visualizer when playback ends
        if (visualizerRef.current) {
          visualizerRef.current.stop();
        }
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
      });
      setAudioControl(control);
      setIsPlaying(true);

      // Start beat-synced visualizer with GIF background and random effects
      if (visualizerRef.current && banificationScore) {
        await visualizerRef.current.startBeatSync(banificationScore.bpm);
      }
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

  const handleTestPixoo = async () => {
    if (!visualizerRef.current) return;

    setMessage("🎨 TESTING PIXOO DISPLAY...");
    try {
      await visualizerRef.current.test();
      setMessage("✅ PIXOO TEST COMPLETE!");
    } catch (error) {
      setMessage("❌ PIXOO CONNECTION FAILED! Is the server running?");
      console.error("Pixoo test error:", error);
    }
  };

  return (
    <main className="container">
      {/* Festival Lasers - behind everything */}
      {isPlaying && (
        <>
          <div className="laser-container">
            {[...Array(24)].map((_, i) => (
              <div
                key={`main-${i}`}
                className="laser"
                style={{
                  "--angle": `${(i * 360) / 24}deg`,
                  "--delay": `${i * 0.05}s`,
                  "--duration": `${0.8 + Math.random() * 0.6}s`,
                  "--thickness": "3px",
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="laser-container laser-container-secondary">
            {[...Array(16)].map((_, i) => (
              <div
                key={`secondary-${i}`}
                className="laser laser-thin"
                style={{
                  "--angle": `${(i * 360) / 16 + 11.25}deg`,
                  "--delay": `${i * 0.08}s`,
                  "--duration": `${1 + Math.random() * 0.5}s`,
                  "--thickness": "2px",
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="laser-container laser-container-rotating">
            {[...Array(8)].map((_, i) => (
              <div
                key={`rotating-${i}`}
                className="laser laser-sweep"
                style={{
                  "--angle": `${(i * 360) / 8}deg`,
                  "--delay": `${i * 0.15}s`,
                  "--duration": `${1.2 + Math.random() * 0.4}s`,
                  "--thickness": "4px",
                } as React.CSSProperties}
              />
            ))}
          </div>
        </>
      )}

      <div className={`card ${isPlaying ? "playing" : ""}`}>
        <h1 className="subtitle">⚡ UNLEASH THE BASS ⚡</h1>

        {/* Step 1: Upload and Analyze - Only show if no score yet */}
        {!banificationScore && (
          <form onSubmit={handleProcess} className="upload-form">
            <div className="file-input-wrapper">
              <input
                id="file-input"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={processing || analyzing}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-label">
                {file ? `🎵 ${file.name}` : "🔊 DROP YOUR TRACK HERE 🔊"}
              </label>
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!file || analyzing || processing}
              className="submit-button"
              style={{ marginTop: "10px" }}
            >
              {analyzing ? "🔍 ANALYZING... 🔍" : "🎯 CHECK IF IT BANGS"}
            </button>

            <button
              type="button"
              onClick={handleTestPixoo}
              disabled={processing || analyzing}
              className="submit-button"
              style={{ marginTop: "10px", fontSize: "0.8em" }}
            >
              🎨 TEST PIXOO DISPLAY
            </button>
          </form>
        )}

        {/* Step 2: Score Display - Shows after analysis */}
        {banificationScore && (
          <div className="score-display">
            <div className="score-header">
              <h2>BANGER ANALYSIS</h2>
              <div
                className={`verdict ${
                  banificationScore.verdict === "ALREADY A BANGER"
                    ? "banger"
                    : "needs-work"
                }`}
              >
                {banificationScore.verdict}
              </div>
            </div>
            <div className="score-bar">
              <div
                className="score-fill"
                style={{
                  width: `${banificationScore.score}%`,
                  backgroundColor: banificationScore.score >= 65
                    ? "#00ff00"
                    : "#ff0000",
                }}
              />
              <span className="score-text">
                {banificationScore.score.toFixed(0)}/100
              </span>
            </div>
            <div className="score-details">
              <div className="detail-item">
                <span className="detail-label">🎵 BPM:</span>
                <span className="detail-value">
                  {banificationScore.bpm.toFixed(0)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">⚡ Energy:</span>
                <span className="detail-value">
                  {(banificationScore.energy / 100).toFixed(2)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">💃 Danceability:</span>
                <span className="detail-value">
                  {(banificationScore.danceability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🎛️ Dynamics:</span>
                <span className="detail-value">
                  {banificationScore.dynamicComplexity.toFixed(2)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🔊 Spectral Energy:</span>
                <span className="detail-value">
                  {banificationScore.spectralEnergy.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Generate Button - Only show if score < 65 and no processed audio yet */}
        {banificationScore &&
          banificationScore.score < 99 &&
          !processedAudio && (
          <button
            onClick={handleProcess}
            disabled={!file || processing}
            className="submit-button"
            style={{ marginTop: "20px", width: "100%" }}
          >
            {processing ? "🔥 IGNITING THE BASS 🔥" : "⚡ MAKE IT HARD ⚡"}
          </button>
        )}

        {/* Step 4: Play Button - Shows after generation */}
        {processedAudio && (
          <button
            onClick={handlePlay}
            className="submit-button"
            style={{ marginTop: "20px", width: "100%" }}
          >
            {isPlaying ? "🛑 KILL IT" : "🚀 BLAST IT"}
          </button>
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
