import { Container } from 'pixi.js';

export class ViewportController {
  private container: Container;
  private canvas: HTMLCanvasElement;

  private isDragging = false;
  private startPointer = { x: 0, y: 0 };
  private startPosition = { x: 0, y: 0 };

  public minZoom = 0.15;
  public maxZoom = 8.0;

  public onViewportChange?: () => void;

  constructor(container: Container, canvas: HTMLCanvasElement, onViewportChange?: () => void) {
    this.container = container;
    this.canvas = canvas;
    this.onViewportChange = onViewportChange;
    this.initEvents();
  }

  private initEvents() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  public destroy() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private onPointerDown = (e: PointerEvent) => {
    // Only drag with left mouse click (button = 0) or touch/pen
    if (e.button !== 0) return;
    
    this.isDragging = true;
    this.startPointer = { x: e.clientX, y: e.clientY };
    this.startPosition = { x: this.container.x, y: this.container.y };
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignored if pointer capture failed
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.startPointer.x;
    const dy = e.clientY - this.startPointer.y;
    
    this.container.x = this.startPosition.x + dx;
    this.container.y = this.startPosition.y + dy;
    this.onViewportChange?.();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignored if pointer capture was already lost
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault(); // Prevent page scrolling

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Get world coordinates under cursor before zoom
    const worldX = (mouseX - this.container.x) / this.container.scale.x;
    const worldY = (mouseY - this.container.y) / this.container.scale.y;

    // Determine zoom factor (closer to 1.0 means smoother zoom)
    const zoomFactor = 1.15;
    let newScale = this.container.scale.x;

    if (e.deltaY < 0) {
      newScale *= zoomFactor;
    } else {
      newScale /= zoomFactor;
    }

    // Constrain zoom level
    newScale = Math.max(this.minZoom, Math.min(this.maxZoom, newScale));

    // Update container scale
    this.container.scale.set(newScale);

    // Adjust container position so the same world coordinate remains under cursor
    this.container.x = mouseX - worldX * newScale;
    this.container.y = mouseY - worldY * newScale;
    this.onViewportChange?.();
  };

  // Center the camera on a specific grid tile
  public centerOn(gridWidth: number, gridHeight: number, tileSize: number) {
    const worldWidth = gridWidth * tileSize;
    const worldHeight = gridHeight * tileSize;
    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;

    // Set initial scale to fit the map height with some margin if it fits nicely
    const scale = Math.max(0.2, Math.min(1.5, canvasHeight / (worldHeight * 1.2)));
    this.container.scale.set(scale);

    // Set translation to center the map
    this.container.x = (canvasWidth - worldWidth * scale) / 2;
    this.container.y = (canvasHeight - worldHeight * scale) / 2;
    this.onViewportChange?.();
  }
}
