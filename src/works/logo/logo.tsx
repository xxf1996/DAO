import { useP5 } from '@/hooks/p5'
import type { P5CanvasInstance } from '@p5-wrapper/react'
import { ReactP5Wrapper } from '@p5-wrapper/react'
import type { Vector } from 'p5'
let logoSketch: LogoSketch

class BoxParticle {
  static readonly size = 2
  private isValid = true

  constructor(private position: Vector, private velocity: Vector, private end: number) {}

  update() {
    this.position.add(this.velocity)

    if (this.position.y > this.end) {
      this.isValid = false
    }
  }

  display(p5: P5CanvasInstance) {
    p5.noStroke()
    p5.fill(255, 255, 255, 100)
    p5.rect(this.position.x, this.position.y, BoxParticle.size, BoxParticle.size)
  }

  get valid() {
    return this.isValid
  }
}

// TODO: 或者干脆用矩形的小粒子拼接成大的矩形
class BoxParticles {
  private particles: BoxParticle[] = []
  constructor(private p5: P5CanvasInstance, private totalNums: number, private start: Vector, private end: number) {

  }

  private create() {
    if (this.particles.length >= this.totalNums) {
      return
    }

    const position = this.p5.createVector(
      this.p5.random(this.start.x - 20, this.start.x + 20),
      this.p5.random(this.start.y - 10, this.start.y + 10)
    )
    const velocity = this.p5.createVector(
      this.p5.random(-0.02, 0.02),
      this.p5.random(0.2, 0.3)
    )

    this.particles.push(new BoxParticle(position, velocity, this.end))
  }

  private update() {
    const invalidIdx: number[] = []
    this.particles.forEach((particle, idx) => {
      particle.update()
      if (!particle.valid) {
        invalidIdx.push(idx)
      }
    })

    invalidIdx.reverse().forEach((idx) => {
      this.particles.splice(idx, 1)
    })

    this.create()
  }

  display() {
    this.update()
    this.particles.forEach((particle) => {
      particle.display(this.p5)
    })
  }
}

class LogoSketch {
  private halfSize: number
  static padding = 20
  private layer1Particles: BoxParticles
  constructor(private p5: P5CanvasInstance, private size: number) {
    this.halfSize = size / 2
    this.layer1Particles = new BoxParticles(p5, 100, p5.createVector(0, -this.size - LogoSketch.padding), -this.halfSize)
  }

  display() {
    // layer1
    this.linearRect(-this.halfSize, -this.size * 1.5 - LogoSketch.padding, 0, 0.6)
    // layer2
    this.linearRect(-this.size - LogoSketch.padding / 2, -this.halfSize, 0, 0.8)
    this.linearRect(LogoSketch.padding / 2, -this.halfSize, 0, 0.8)
    // layer3
    this.linearRect(-this.size * 1.5 - LogoSketch.padding, this.halfSize + LogoSketch.padding)
    this.linearRect(-this.halfSize, this.halfSize + LogoSketch.padding)
    this.linearRect(this.halfSize + LogoSketch.padding, this.halfSize + LogoSketch.padding)
    this.layer1Particles.display()
  }

  private linearRect(x: number, y: number, start = 0, stop = 1) {
    for (let i = 0; i < this.size; i++) {
      const basis = this.p5.map(i / this.size, start, stop, 0, 1)
      const aplha = (1 - basis) * 255
      this.p5.stroke(255, aplha)
      this.p5.line(x, y + i, x + this.size, y + i)
    }
  }
}

function setup(p5: P5CanvasInstance) {
  const size = Math.min(window.innerWidth, window.innerHeight)
  p5.createCanvas(size, size, p5.WEBGL)
  logoSketch = new LogoSketch(p5, 100)
}

function draw(p5: P5CanvasInstance) {
  p5.background(0, 0)
  logoSketch.display()
  // console.log(p5.frameRate())
}

function Logo() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default Logo
