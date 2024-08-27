import { useP5 } from '@/hooks/p5'
import type { P5CanvasInstance } from '@p5-wrapper/react'
import { ReactP5Wrapper } from '@p5-wrapper/react'
import { Easing, Group, Tween } from '@tweenjs/tween.js'
import { random } from 'lodash-es'
import type { Vector } from 'p5'
let logoSketch: LogoSketch

class AniamtionRect {
  private isParticle = false
  private isValid = true
  private velocity: Vector
  private rotationVelocity = 0
  /** 粒子效果结束的位置（y轴） */
  private endY = 0
  private animations = new Group()
  private rotation = 0
  private alpha = 255
  private halfSize = 0
  private position: Vector
  /** 相对起始位置的偏移（X轴） */
  private offsetX = 0
  /** 相对起始位置的偏移（Y轴） */
  private offsetY = 0
  constructor(private p5: P5CanvasInstance, private origin: Vector, private size: number) {
    this.velocity = p5.createVector(0, 0)
    this.halfSize = size / 2
    this.position = origin.copy()
  }

  initAnimation() {
    if (this.animations.getAll().length > 0) {
      return
    }
    let prevRotation = 0
    const animtion = new Tween({ rotation: random(-Math.PI / 4, Math.PI / 4), offsetX: random(-this.halfSize, this.halfSize), offsetY: random(-this.halfSize, this.halfSize) })
      .to({ rotation: random(Math.PI / 2, Math.PI), offsetX: random(-this.size, this.size), offsetY: random(-this.size, this.size) }, random(150, 200))
      .easing(Easing.Linear.None)
      .onStart(({ rotation }) => {
        prevRotation = rotation
      })
      .onUpdate(({ rotation, offsetX, offsetY }) => {
        // 同理，yoyo插值周期交替时数值有bug
        if (Math.abs(rotation - prevRotation) > 0.5) {
          return
        }
        prevRotation = rotation
        this.rotation = rotation
        this.offsetX = offsetX
        this.offsetY = offsetY
      })
      .yoyo(true)
      .repeat(Infinity)
      .start()

    this.animations.add(animtion)
  }

  initParticle(end: number) {
    this.position = this.origin.copy()
    this.isValid = true
    this.endY = end
    this.isParticle = true
    this.animations.removeAll()
    this.velocity = this.p5.createVector(
      random(-0.8, 0.8),
      random(0.5, 1.5)
    )
    this.rotationVelocity = random(-0.2, 0.2)
  }

  private updateParticle() {
    if (!this.isParticle) {
      return
    }
    this.rotation += this.rotationVelocity
    // FIXME: p5.createVector与Vector类居然不兼容？？？
    this.position.add(this.velocity.x, this.velocity.y)
    // console.log(this.position.y, this.endY)
    if (this.position.y > this.endY) {
      this.isValid = false
    }
  }

  update() {
    this.animations.update(performance.now())
    this.updateParticle()
  }

  setAlpha(alpha: number) {
    this.alpha = alpha
  }

  display(p5: P5CanvasInstance) {
    if (!this.isValid) {
      this.initParticle(this.endY)
      return
    }
    p5.push()
    p5.noStroke()
    // 需要先平移，再旋转，这样的效果就是按照矩形中心旋转
    p5.translate(
      this.position.x + this.offsetX + this.halfSize,
      this.position.y + this.offsetY + this.halfSize
    )
    p5.rotate(this.rotation)
    p5.fill(255, this.alpha)
    p5.rect(-this.halfSize, -this.halfSize, this.size, this.size)
    p5.pop()
  }
}

class LogoRect {
  static readonly miniRectSize = 10
  private rects: AniamtionRect[] = []
  constructor(private p5: P5CanvasInstance, private origin: Vector, private size: number) {}

  /**
   * 初始化粒子效果
   * @param endDistance 粒子效果结束距离，即相对底部y的距离
   * @param particleBasis 基于y轴方向（从上往下对应0到1），粒子效果的开始比例
   */
  initParticles(endDistance?: number, particleBasis = 0.7) {
    const endY = this.origin.y + this.size + (endDistance || LogoSketch.padding)
    const axisNum = this.size / LogoRect.miniRectSize

    for (let x = 0; x < axisNum; x++) {
      for (let y = 0; y < axisNum; y++) {
        const basis = y / axisNum
        const aplha = (1 - basis) * 255
        const rect = new AniamtionRect(
          this.p5,
          this.p5.createVector(this.origin.x + x * LogoRect.miniRectSize, this.origin.y + y * LogoRect.miniRectSize),
          LogoRect.miniRectSize
        )
        rect.setAlpha(aplha)
        if (basis > particleBasis) {
          rect.initParticle(endY)
        } else {
          rect.initAnimation()
        }
        this.rects.push(rect)
      }
    }
  }

  private update() {
    this.rects.forEach((rect) => {
      rect.update()
    })
  }

  display() {
    this.update()
    this.rects.forEach((rect) => {
      rect.display(this.p5)
    })
  }
}

class LogoSketch {
  private halfSize: number
  static padding = 30
  private layer1: LogoRect
  private layer2Left: LogoRect
  private layer2Right: LogoRect
  private layer3Left: LogoRect
  private layer3Center: LogoRect
  private layer3Right: LogoRect
  constructor(private p5: P5CanvasInstance, private size: number) {
    this.halfSize = size / 2
    this.layer1 = new LogoRect(p5, p5.createVector(-this.halfSize, -this.size * 1.5 - LogoSketch.padding), this.size)
    this.layer1.initParticles(LogoSketch.padding, 0.5)
    this.layer2Left = new LogoRect(p5, p5.createVector(-this.size - LogoSketch.padding / 2, -this.halfSize), this.size)
    this.layer2Left.initParticles(LogoSketch.padding, 0.6)
    this.layer2Right = new LogoRect(p5, p5.createVector(LogoSketch.padding / 2, -this.halfSize), this.size)
    this.layer2Right.initParticles(LogoSketch.padding, 0.6)
    const layer3Distance = LogoSketch.padding + 100
    this.layer3Left = new LogoRect(p5, p5.createVector(-this.size * 1.5 - LogoSketch.padding, this.halfSize + LogoSketch.padding), this.size)
    this.layer3Left.initParticles(layer3Distance)
    this.layer3Center = new LogoRect(p5, p5.createVector(-this.halfSize, this.halfSize + LogoSketch.padding), this.size)
    this.layer3Center.initParticles(layer3Distance)
    this.layer3Right = new LogoRect(p5, p5.createVector(this.halfSize + LogoSketch.padding, this.halfSize + LogoSketch.padding), this.size)
    this.layer3Right.initParticles(layer3Distance)
  }

  display() {
    // layer1
    this.layer1.display()
    // layer2
    this.layer2Left.display()
    this.layer2Right.display()
    // layer3
    this.layer3Left.display()
    this.layer3Center.display()
    this.layer3Right.display()
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
  logoSketch = new LogoSketch(p5, 150)
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
