// Pixoo 64x64 Display API Client
// Communicates with pixoo-rest server via Next.js API proxy

const PIXOO_API_URL = '/api/pixoo';

export class PixooClient {
  private baseUrl: string;

  constructor(baseUrl: string = PIXOO_API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Draw a single pixel
   */
  async drawPixel(x: number, y: number, r: number, g: number, b: number, pushImmediately: boolean = true): Promise<void> {
    const formData = new URLSearchParams({
      x: x.toString(),
      y: y.toString(),
      r: r.toString(),
      g: g.toString(),
      b: b.toString(),
      push_immediately: pushImmediately.toString()
    });

    await fetch(`${this.baseUrl}/pixel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
  }

  /**
   * Draw a line
   */
  async drawLine(
    startX: number,
    startY: number,
    stopX: number,
    stopY: number,
    r: number,
    g: number,
    b: number,
    pushImmediately: boolean = true
  ): Promise<void> {
    const formData = new URLSearchParams({
      start_x: startX.toString(),
      start_y: startY.toString(),
      stop_x: stopX.toString(),
      stop_y: stopY.toString(),
      r: r.toString(),
      g: g.toString(),
      b: b.toString(),
      push_immediately: pushImmediately.toString()
    });

    await fetch(`${this.baseUrl}/line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
  }

  /**
   * Draw a filled rectangle
   */
  async drawRectangle(
    topLeftX: number,
    topLeftY: number,
    bottomRightX: number,
    bottomRightY: number,
    r: number,
    g: number,
    b: number,
    pushImmediately: boolean = true
  ): Promise<void> {
    const formData = new URLSearchParams({
      top_left_x: topLeftX.toString(),
      top_left_y: topLeftY.toString(),
      bottom_right_x: bottomRightX.toString(),
      bottom_right_y: bottomRightY.toString(),
      r: r.toString(),
      g: g.toString(),
      b: b.toString(),
      push_immediately: pushImmediately.toString()
    });

    await fetch(`${this.baseUrl}/rectangle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
  }

  /**
   * Fill entire screen with color
   */
  async fillScreen(r: number, g: number, b: number, pushImmediately: boolean = true): Promise<void> {
    const formData = new URLSearchParams({
      r: r.toString(),
      g: g.toString(),
      b: b.toString(),
      push_immediately: pushImmediately.toString()
    });

    await fetch(`${this.baseUrl}/fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
  }

  /**
   * Draw text at position
   */
  async drawText(
    text: string,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    pushImmediately: boolean = true
  ): Promise<void> {
    const formData = new URLSearchParams({
      text: text,
      x: x.toString(),
      y: y.toString(),
      r: r.toString(),
      g: g.toString(),
      b: b.toString(),
      push_immediately: pushImmediately.toString()
    });

    await fetch(`${this.baseUrl}/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
  }

  /**
   * Clear the screen (fill with black)
   */
  async clear(): Promise<void> {
    await this.fillScreen(0, 0, 0, true);
  }

  /**
   * Send a GIF to the display
   */
  async sendGif(gifPath: string, speed: number = 100, skipFirstFrame: boolean = false): Promise<void> {
    try {
      // Fetch the GIF from public folder
      const response = await fetch(gifPath);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('gif', blob, 'output.gif');
      formData.append('speed', speed.toString());
      formData.append('skip_first_frame', skipFirstFrame.toString());

      await fetch(`${this.baseUrl}/sendGif`, {
        method: 'POST',
        body: formData
      });
    } catch (error) {
      console.error('Failed to send GIF:', error);
      throw error;
    }
  }

  /**
   * Test connection by drawing a test rectangle
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.drawRectangle(28, 28, 36, 36, 0, 255, 0, true);
      return true;
    } catch (error) {
      console.error('Pixoo connection test failed:', error);
      return false;
    }
  }
}

export const pixoo = new PixooClient();
