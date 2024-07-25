import type { P5CanvasInstance } from '@p5-wrapper/react'
import { ReactP5Wrapper } from '@p5-wrapper/react'
import './index.scss'

abstract class P5Code {
  constructor(private p5: P5CanvasInstance) {
    p5.setup = this.setup
    p5.draw = this.draw
  }

  abstract setup(): void
  abstract draw(): void

  // static sketch(p5: P5CanvasInstance) {
  //   return new this(p5)
  // }

  // test() {
  //   background(250)
  // }
}

function sketch(p5: P5CanvasInstance) {
  p5.setup = () => p5.createCanvas(400, 400, p5.WEBGL)

  p5.draw = () => {
    p5.background(50)
    p5.normalMaterial()
    p5.push()
    p5.rotateZ(p5.frameCount * 0.01)
    p5.rotateX(p5.frameCount * 0.01)
    p5.rotateY(p5.frameCount * 0.01)
    p5.plane(100)
    p5.pop()
  }
}

export default function App() {
  return <ReactP5Wrapper sketch={sketch} />
}
