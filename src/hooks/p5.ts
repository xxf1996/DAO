import type { P5CanvasInstance } from '@p5-wrapper/react'

interface P5Setup {
  (p5: P5CanvasInstance): void
}

interface P5Draw {
  (p5: P5CanvasInstance): void
}

export function useP5(setup: P5Setup, draw: P5Draw) {
  const sketch = (p5: P5CanvasInstance) => {
    p5.setup = () => {
      setup(p5)
    }

    p5.draw = () => {
      draw(p5)
    }
  }
  return {
    sketch
  }
}
