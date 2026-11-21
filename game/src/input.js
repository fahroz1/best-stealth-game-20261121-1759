// Midnight Courier — keyboard and mouse input.
// Holds the live key set, the mouse position in canvas pixels, and the
// edge-triggered presses (a key that was pressed since the last frame).
// A mouse click is a coin toss aimed at that spot; Q tosses toward the
// mouse as well. Enter starts or restarts, P pauses, M mutes.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, inside: false };
    this.tossTarget = null;
    this.sneakToggle = false;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
      if (event.code === 'KeyQ') this.queueToss();
      if (event.code === 'KeyC') this.sneakToggle = !this.sneakToggle;
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      this.mouse.inside = true;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      this.tossTarget = { x: this.mouse.x, y: this.mouse.y };
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  queueToss() {
    this.tossTarget = { x: this.mouse.x, y: this.mouse.y };
  }

  isDown(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  // True once for each physical press; the set clears at the end of a frame.
  consumePressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  consumeCoinToss() {
    const target = this.tossTarget;
    this.tossTarget = null;
    return target;
  }

  endFrame() {
    this.pressed.clear();
  }
}
