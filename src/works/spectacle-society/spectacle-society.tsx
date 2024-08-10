import { useP5 } from '@/hooks/p5'
import type { P5CanvasInstance } from '@p5-wrapper/react'
import { ReactP5Wrapper } from '@p5-wrapper/react'
import type { Vector } from 'p5'

const spectacles: Spectacles[] = []

class Spectacles {
  static spectaclesSize = 20
  constructor(private p5: P5CanvasInstance, private position: Vector) {}

  display() {
    this.p5.push()
    this.p5.fill(20)
    this.p5.stroke(240)
    this.p5.strokeWeight(3)
    this.p5.strokeCap(this.p5.SQUARE)
    this.p5.translate(this.position.x, this.position.y)
    this.p5.rotateY(this.p5.frameCount * 0.01)
    const left = -Spectacles.spectaclesSize * 1.5
    const right = Spectacles.spectaclesSize * 1.5
    const top = -Spectacles.spectaclesSize * 0.5
    this.p5.rect(left, top, Spectacles.spectaclesSize, Spectacles.spectaclesSize)
    this.p5.rect(Spectacles.spectaclesSize * 0.5, top, Spectacles.spectaclesSize, Spectacles.spectaclesSize)
    this.p5.line(-Spectacles.spectaclesSize * 0.5, 0, Spectacles.spectaclesSize * 0.5, 0)
    this.p5.strokeWeight(1)
    this.p5.noFill()
    this.p5.beginShape()
    this.p5.vertex(left, 0, 0)
    this.p5.vertex(left, 0, Spectacles.spectaclesSize * 2)
    this.p5.vertex(left, 5, Spectacles.spectaclesSize * 2)
    this.p5.endShape()
    this.p5.beginShape()
    this.p5.vertex(right, 0, 0)
    this.p5.vertex(right, 0, Spectacles.spectaclesSize * 2)
    this.p5.vertex(right, 5, Spectacles.spectaclesSize * 2)
    this.p5.endShape()
    this.p5.pop()
  }
}

function setup(p5: P5CanvasInstance) {
  p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL)
  for (let x = -5; x <= 5; x++) {
    for (let y = -5; y <= 5; y++) {
      spectacles.push(new Spectacles(p5, p5.createVector(x * 100, y * 100)))
    }
  }
  p5.debugMode(p5.AXES)
}

function draw(p5: P5CanvasInstance) {
  p5.background(20)
  p5.orbitControl()
  spectacles.forEach(s => s.display())
}

function SpectacleSociety() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default SpectacleSociety
