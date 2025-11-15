"use client";

import { useState } from "react";
import "../page.css";
import Link from "next/link";
import { generateBrainrotSong, audioBufferToWav } from "../brainrotProcessor";

export default function BrainrotPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [brainrotUrl, setBrainrotUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      setMessage(`📁 ${e.target.files.length} files loaded!`);
      setBrainrotUrl(null);
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!files || files.length === 0) {
      setMessage("🚨 DROP YOUR FOLDER FIRST! 🚨");
      return;
    }

    // Filter MP3 files
    const mp3Files = Array.from(files).filter(
      (file) =>
        file.type === "audio/mpeg" ||
        file.type === "audio/mp3" ||
        file.name.toLowerCase().endsWith(".mp3")
    );

    if (mp3Files.length === 0) {
      setMessage("🚨 NO MP3 FILES FOUND! 🚨");
      return;
    }

    setProcessing(true);
    setMessage(`🧠 LOADING ${mp3Files.length} TRACKS INTO MEMORY...`);

    try {
      // Create audio context
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Load all MP3 files into audio buffers
      const audioBuffers: AudioBuffer[] = [];

      for (let i = 0; i < mp3Files.length; i++) {
        setMessage(`📀 DECODING TRACK ${i + 1}/${mp3Files.length}...`);
        const arrayBuffer = await mp3Files[i].arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.push(audioBuffer);
      }

      // Generate brainrot song
      const brainrotBuffer = await generateBrainrotSong(
        audioBuffers,
        (progress) => {
          setMessage(progress);
        }
      );

      // Convert to WAV and create URL
      const wav = audioBufferToWav(brainrotBuffer);
      const blob = new Blob([wav], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      setBrainrotUrl(url);
      setMessage(`🧠 BRAINROT COMPLETE! CHAOS UNLEASHED! 🧠`);
    } catch (error) {
      setMessage("💥 BRAIN EXPLOSION! TRY AGAIN!");
      console.error("Processing error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handlePlay = () => {
    if (!brainrotUrl) return;

    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
    } else if (brainrotUrl) {
      if (audio) {
        audio.play();
        setIsPlaying(true);
      } else {
        const newAudio = new Audio(brainrotUrl);
        newAudio.onended = () => setIsPlaying(false);
        newAudio.play();
        setAudio(newAudio);
        setIsPlaying(true);
      }
    }
  };

  const handleDownload = () => {
    if (!brainrotUrl) return;

    const a = document.createElement("a");
    a.href = brainrotUrl;
    a.download = `brainrot-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <main className="container">
      <div className="card">
        <h1>🧠 BRAINROT GENERATOR 🧠</h1>
        <p className="subtitle">⚡ MAXIMUM CHAOS MODE ⚡</p>

        <Link href="/" className="nav-link">
          ← Back to Hardstyle
        </Link>

        <form onSubmit={handleProcess} className="upload-form">
          <div className="file-input-wrapper">
            <input
              id="folder-input"
              type="file"
              // @ts-ignore - webkitdirectory is not in TS types
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFolderChange}
              disabled={processing}
              className="file-input"
            />
            <label htmlFor="folder-input" className="file-label">
              {files
                ? `📁 ${files.length} FILES LOADED`
                : "📂 DROP YOUR FOLDER HERE 📂"}
            </label>
          </div>

          <button
            type="submit"
            disabled={!files || processing}
            className="submit-button"
          >
            {processing ? "🧠 ROTTING BRAINS... 🧠" : "🔥 GENERATE BRAINROT 🔥"}
          </button>
        </form>

        {brainrotUrl && (
          <div className="playback-controls">
            <button
              onClick={handlePlay}
              className="submit-button"
              style={{ marginTop: "10px" }}
            >
              {isPlaying ? "🛑 STOP THE MADNESS" : "🚀 EMBRACE THE CHAOS"}
            </button>
            <button
              onClick={handleDownload}
              className="submit-button"
              style={{ marginTop: "10px", marginLeft: "10px" }}
            >
              💾 SAVE THE CHAOS
            </button>
          </div>
        )}

        {message && (
          <div
            className={`message ${
              message.includes("🧠") && message.includes("COMPLETE")
                ? "success"
                : message.includes("💥") || message.includes("🚨")
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
