// Audio Visualization for Pixoo 64x64 Display
// Maps audio metrics to visual elements during playback

import { PixooClient } from './client';

export interface AudioMetrics {
  bpm: number;           // 0-250 (typical range)
  energy: number;        // 0-100
  score: number;         // 0-100 (banger score)
  danceability: number;  // 0-100
  spectralEnergy: number; // 0-100
}

export class PixooVisualizer {
  private client: PixooClient;
  private isRunning: boolean = false;
  private animationFrame: number | null = null;

  constructor(client: PixooClient) {
    this.client = client;
  }

  /**
   * Start visualization
   */
  start(): void {
    this.isRunning = true;
    console.log('Pixoo visualizer started');
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
    this.client.clear();
    console.log('Pixoo visualizer stopped');
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
        await this.client.drawRectangle(0, 0, bpmWidth - 1, 7, 255, 0, 255, false); // Magenta
      }

      // 3. Energy Bar (left section, 8-16 lines, vertical)
      // Map 0-100 to 0-64 pixels height
      const energyHeight = Math.min(Math.floor((metrics.energy / 100) * 64), 64);
      if (energyHeight > 0) {
        await this.client.drawRectangle(0, 64 - energyHeight, 7, 63, 0, 255, 255, false); // Cyan
      }

      // 4. Danceability Bar (right section, vertical)
      const danceHeight = Math.min(Math.floor((metrics.danceability / 100) * 64), 64);
      if (danceHeight > 0) {
        await this.client.drawRectangle(56, 64 - danceHeight, 63, 63, 255, 255, 0, false); // Yellow
      }

      // 5. Spectral Energy (bottom section, horizontal)
      const spectralWidth = Math.min(Math.floor((metrics.spectralEnergy / 100) * 64), 64);
      if (spectralWidth > 0) {
        await this.client.drawRectangle(0, 56, spectralWidth - 1, 63, 255, 128, 0, false); // Orange
      }

      // 6. Text labels (center area)
      await this.client.drawText(
        `${Math.round(metrics.bpm)}`,
        24,
        20,
        255, 255, 255,
        false
      );

      await this.client.drawText(
        `${Math.round(metrics.score)}`,
        24,
        32,
        255, 255, 255,
        true // Last call - push everything to display
      );

    } catch (error) {
      console.error('Error updating Pixoo display:', error);
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
      console.error('Error flashing beat:', error);
    }
  }

  /**
   * Test visualization with dummy data
   */
  async test(): Promise<void> {
    console.log('Testing Pixoo visualization...');

    // Test connection first
    const connected = await this.client.testConnection();
    if (!connected) {
      console.error('Failed to connect to Pixoo display');
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
        spectralEnergy: 100 - i
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    this.stop();
    console.log('Test complete');
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
        b: 0
      };
    } else {
      // Yellow (255,255,0) -> Green (0,255,0)
      const t = (score - 65) / 35;
      return {
        r: Math.floor(255 * (1 - t)),
        g: 255,
        b: 0
      };
    }
  }
}
