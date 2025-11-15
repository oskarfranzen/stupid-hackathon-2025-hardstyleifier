// Audio Visualization for Pixoo 64x64 Display
// Maps audio metrics to visual elements during playback

import { PixooClient } from "./client";

export interface AudioMetrics {
  bpm: number; // 0-250 (typical range)
  energy: number; // 0-100
  score: number; // 0-100 (banger score)
  danceability: number; // 0-100
  spectralEnergy: number; // 0-100
}

export class PixooVisualizer {
  private client: PixooClient;
  private isRunning: boolean = false;
  private animationFrame: number | null = null;
  private beatInterval: number | null = null;
  private currentBpm: number = 120;

  constructor(client: PixooClient) {
    this.client = client;
  }

  /**
   * Start visualization
   */
  start(): void {
    this.isRunning = true;
    console.log("Pixoo visualizer started");
  }

  /**
   * Stop visualization
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.beatInterval !== null) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    this.client.clear();
    console.log("Pixoo visualizer stopped");
  }

  /**
   * Update display with current audio metrics
   */
  async updateMetrics(metrics: AudioMetrics): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Draw everything in one batch (push_immediately = false until last call)

      // 1. Background: Fill based on score (red -> yellow -> green)
      const bgColor = this.scoreToColor(metrics.score);
      await this.client.fillScreen(bgColor.r, bgColor.g, bgColor.b, false);

      // 2. BPM Bar (top section, 0-8 lines, horizontal)
      // Map 0-200 BPM to 0-64 pixels width
      const bpmWidth = Math.min(Math.floor((metrics.bpm / 200) * 64), 64);
      if (bpmWidth > 0) {
        await this.client.drawRectangle(
          0,
          0,
          bpmWidth - 1,
          7,
          255,
          0,
          255,
          false,
        ); // Magenta
      }

      // 3. Energy Bar (left section, 8-16 lines, vertical)
      // Map 0-100 to 0-64 pixels height
      const energyHeight = Math.min(
        Math.floor((metrics.energy / 100) * 64),
        64,
      );
      if (energyHeight > 0) {
        await this.client.drawRectangle(
          0,
          64 - energyHeight,
          7,
          63,
          0,
          255,
          255,
          false,
        ); // Cyan
      }

      // 4. Danceability Bar (right section, vertical)
      const danceHeight = Math.min(
        Math.floor((metrics.danceability / 100) * 64),
        64,
      );
      if (danceHeight > 0) {
        await this.client.drawRectangle(
          56,
          64 - danceHeight,
          63,
          63,
          255,
          255,
          0,
          false,
        ); // Yellow
      }

      // 5. Spectral Energy (bottom section, horizontal)
      const spectralWidth = Math.min(
        Math.floor((metrics.spectralEnergy / 100) * 64),
        64,
      );
      if (spectralWidth > 0) {
        await this.client.drawRectangle(
          0,
          56,
          spectralWidth - 1,
          63,
          255,
          128,
          0,
          false,
        ); // Orange
      }

      // 6. Text labels (center area)
      await this.client.drawText(
        `${Math.round(metrics.bpm)}`,
        24,
        20,
        255,
        255,
        255,
        false,
      );

      await this.client.drawText(
        `${Math.round(metrics.score)}`,
        24,
        32,
        255,
        255,
        255,
        true, // Last call - push everything to display
      );
    } catch (error) {
      console.error("Error updating Pixoo display:", error);
    }
  }

  /**
   * Simple beat flash effect
   */
  async flashBeat(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Quick white flash
      await this.client.fillScreen(255, 255, 255, true);

      // Fade back after short delay
      setTimeout(() => {
        if (this.isRunning) {
          this.client.fillScreen(0, 0, 0, true);
        }
      }, 50);
    } catch (error) {
      console.error("Error flashing beat:", error);
    }
  }

  /**
   * Start beat-synced playback visualization with GIF background
   */
  async startBeatSync(bpm: number): Promise<void> {
    if (!this.isRunning) {
      this.start();
    }

    this.currentBpm = bpm;

    try {
      // Calculate beat interval in milliseconds
      const beatInterval = (60 / bpm) * 1000;

      console.log(
        `Starting beat sync at ${bpm} BPM (${beatInterval}ms per beat)`,
      );

      // Set up beat-synced random effects
      this.beatInterval = window.setInterval(() => {
        if (!this.isRunning) return;
        this.drawRandomBeatEffect();
      }, beatInterval);
    } catch (error) {
      console.error("Failed to start beat sync:", error);
    }
  }

  /**
   * Draw random visual effects on beat
   */
  private async drawRandomBeatEffect(): Promise<void> {
    const effects = [
      // Random colored rectangles
      () => {
        const x = Math.floor(Math.random() * 48);
        const y = Math.floor(Math.random() * 48);
        const size = Math.floor(Math.random() * 16) + 4;
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        this.client.drawRectangle(x, y, Math.min(x + size, 63), Math.min(y + size, 63), r, g, b, true);
      },
      // Random lines
      () => {
        const x1 = Math.floor(Math.random() * 63);
        const y1 = Math.floor(Math.random() * 63);
        const x2 = Math.floor(Math.random() * 63);
        const y2 = Math.floor(Math.random() * 63);
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        this.client.drawLine(x1, y1, x2, y2, r, g, b, true);
      },
      // Diagonal stripes
      () => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        for (let i = 0; i < 64; i += 8) {
          this.client.drawLine(i, 0, Math.min(i + 32, 63), 63, r, g, b, false);
        }
        this.client.drawPixel(0, 0, 0, 0, 0, true); // Push
      },
      // Random pixels spray
      () => {
        for (let i = 0; i < 20; i++) {
          const x = Math.floor(Math.random() * 63);
          const y = Math.floor(Math.random() * 63);
          const r = Math.floor(Math.random() * 256);
          const g = Math.floor(Math.random() * 256);
          const b = Math.floor(Math.random() * 256);
          this.client.drawPixel(x, y, r, g, b, false);
        }
        this.client.drawPixel(0, 0, 0, 0, 0, true); // Push
      },
      // Corner flash
      () => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        this.client.drawRectangle(0, 0, 15, 15, r, g, b, false);
        this.client.drawRectangle(48, 0, 63, 15, r, g, b, false);
        this.client.drawRectangle(0, 48, 15, 63, r, g, b, false);
        this.client.drawRectangle(48, 48, 63, 63, r, g, b, true);
      },
      // Border flash
      () => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        // Top
        this.client.drawRectangle(0, 0, 63, 3, r, g, b, false);
        // Bottom
        this.client.drawRectangle(0, 60, 63, 63, r, g, b, false);
        // Left
        this.client.drawRectangle(0, 0, 3, 63, r, g, b, false);
        // Right
        this.client.drawRectangle(60, 0, 63, 63, r, g, b, true);
      },
      // Crazy crosshair explosion
      () => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        // Horizontal line through center
        this.client.drawLine(0, 32, 63, 32, r, g, b, false);
        // Vertical line through center
        this.client.drawLine(32, 0, 32, 63, r, g, b, false);
        // Diagonal lines
        this.client.drawLine(0, 0, 63, 63, r, g, b, false);
        this.client.drawLine(63, 0, 0, 63, r, g, b, true);
      },
    ];

    // Pick a random effect
    const effect = effects[Math.floor(Math.random() * effects.length)];
    try {
      await effect();
    } catch (error) {
      console.error("Error drawing beat effect:", error);
    }
  }

  /**
   * Test visualization with dummy data
   */
  async test(): Promise<void> {
    console.log("Testing Pixoo visualization...");

    // Test connection first
    const connected = await this.client.testConnection();
    if (!connected) {
      console.error("Failed to connect to Pixoo display");
      return;
    }

    this.start();

    // Animate through different values
    for (let i = 0; i <= 100; i += 10) {
      await this.updateMetrics({
        bpm: 150 + i * 0.5,
        energy: i,
        score: i,
        danceability: i,
        spectralEnergy: 100 - i,
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    this.stop();
    console.log("Test complete");
  }

  /**
   * Convert score (0-100) to RGB color gradient
   * 0-65: Red -> Yellow
   * 65-100: Yellow -> Green
   */
  private scoreToColor(score: number): { r: number; g: number; b: number } {
    if (score < 65) {
      // Red (255,0,0) -> Yellow (255,255,0)
      const t = score / 65;
      return {
        r: 255,
        g: Math.floor(255 * t),
        b: 0,
      };
    } else {
      // Yellow (255,255,0) -> Green (0,255,0)
      const t = (score - 65) / 35;
      return {
        r: Math.floor(255 * (1 - t)),
        g: 255,
        b: 0,
      };
    }
  }
}
