export interface WorldSize {
  width: number;
  height: number;
}

export class TouchInput {
  private activePointer: number | null = null;
  private target: { x: number; y: number } | null = null;
  private readonly downHandler = (event: PointerEvent) => this.onDown(event);
  private readonly moveHandler = (event: PointerEvent) => this.onMove(event);
  private readonly upHandler = (event: PointerEvent) => this.onUp(event);
  private readonly cancelHandler = (event: PointerEvent) => this.onUp(event);

  constructor(
    private readonly element: HTMLCanvasElement,
    private readonly getWorldSize: () => WorldSize,
    private readonly sensitivity: () => number,
    private readonly onTarget: (target: { x: number; y: number } | null) => void
  ) {
    element.addEventListener("pointerdown", this.downHandler, { passive: false });
    element.addEventListener("pointermove", this.moveHandler, { passive: false });
    element.addEventListener("pointerup", this.upHandler);
    element.addEventListener("pointercancel", this.cancelHandler);
    element.addEventListener("lostpointercapture", this.cancelHandler);
  }

  get isActive(): boolean {
    return this.activePointer !== null;
  }

  private onDown(event: PointerEvent): void {
    if (this.activePointer !== null || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    this.activePointer = event.pointerId;
    try {
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort on browsers that do not expose it for a given input.
    }
    this.updateTarget(event);
  }

  private onMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) return;
    event.preventDefault();
    this.updateTarget(event);
  }

  private onUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) return;
    this.activePointer = null;
    this.target = null;
    this.onTarget(null);
  }

  private updateTarget(event: PointerEvent): void {
    const rect = this.element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const world = this.getWorldSize();
    const normalizedX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const normalizedY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const factor = Math.max(0.35, Math.min(2.5, this.sensitivity()));
    const next = {
      x: (normalizedX - 0.5) * world.width * factor,
      y: (0.5 - normalizedY) * world.height * factor
    };
    this.target = next;
    this.onTarget(next);
  }

  dispose(): void {
    this.element.removeEventListener("pointerdown", this.downHandler);
    this.element.removeEventListener("pointermove", this.moveHandler);
    this.element.removeEventListener("pointerup", this.upHandler);
    this.element.removeEventListener("pointercancel", this.cancelHandler);
    this.element.removeEventListener("lostpointercapture", this.cancelHandler);
    this.activePointer = null;
    this.target = null;
    this.onTarget(null);
  }
}
