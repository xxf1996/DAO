import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Color, Vector } from 'p5'

let bg: Background
let focusCenter: FocusCenter
let thoughtsPoint: ThoughtsPoint
const circles: ThoughtsCircle[] = []

class FocusCenter {
  private animations = new Group()
  constructor(private x = 0, private y = 0) {}

  private animation() {
    this.animations.update(performance.now())
  }

  private transition(x: number, y: number, duration = 1000) {
    const tween = new Tween({ x, y })
      .to({ x, y }, duration)
      .easing(Easing.Quadratic.InOut)
      .onUpdate(({ x, y }) => {
        this.x = x
        this.y = y
      })
      .onComplete(() => {
        this.animations.remove(tween)
      })
      .start()
    this.animations.add(tween)
  }

  foward(speed = 0.1) {
    this.y -= speed
  }

  focus(x: number, y: number) {
    this.x = x
    this.y = y
  }

  update() {
    this.animation()
  }

  get X() {
    return this.x
  }

  get Y() {
    return this.y
  }

  test() {
    const tween = new Tween({ x: 0, y: 0 })
      .to({ x: 200, y: 200 }, 1000)
      .delay(1000)
      .easing(Easing.Quadratic.InOut)
      .onUpdate(({ x, y }) => {
        this.x = x
        this.y = y
      })
      .yoyo(true)
      .repeat(Infinity)
      .repeatDelay(5000)
      .start()
    this.animations.add(tween)
  }
}

class Background {
  readonly initialWidth = 600
  private windowWidth: number
  private windowHeight: number
  private left: number
  private right: number
  /** tween animation group */
  private animations = new Group()
  constructor(private p5: P5CanvasInstance) {
    this.windowWidth = window.innerWidth
    this.windowHeight = window.innerHeight
    this.left = (this.windowWidth - this.initialWidth) / 2
    this.right = (this.windowWidth + this.initialWidth) / 2
  }

  private get y() {
    return -this.windowHeight / 2
  }

  private get x() {
    return this.left - this.windowWidth / 2
  }

  private get width() {
    if (this.right > this.left) {
      return this.right - this.left
    }

    return 0
  }

  private animation() {
    this.animations.update(performance.now())
  }

  display() {
    this.animation()
    this.p5.noStroke()
    this.p5.fill(10)
    this.p5.rect(this.x, this.y, this.width, this.windowHeight)
  }

  setLeft(left: number) {
    this.left = left
  }

  setRight(right: number) {
    this.right = right
  }

  deltaLeft(delta: number) {
    this.setLeft(this.left + delta)
  }

  deltaRight(delta: number) {
    this.setRight(this.right + delta)
  }

  transition(left: number, right: number) {
    const tween = new Tween({ left: this.left, right: this.right })
      .to({ left, right }, 2000)
      .delay(1000)
      .easing(Easing.Quadratic.Out)
      .onUpdate(({ left, right }) => {
        this.setLeft(left)
        this.setRight(right)
      })
      .onComplete(() => {
        console.log('remove animation')
        this.animations.remove(tween)
      })
      .start()

    this.animations.add(tween)

    return tween
  }

  transitionToWidth(width: number) {
    return this.transition(
      (this.windowWidth - width) / 2,
      (this.windowWidth + width) / 2
    )
  }
}

class ThoughtsPoint {
  static pathNums = 100
  private paths: Vector[] = []
  private nextDistance = 0
  private nextAmplitude = 0
  private nextSign = -1
  private movingAnimation = new Tween({ basis: 0 })
  private animastions = new Group()
  private moving = true
  constructor(private p5: P5CanvasInstance) {
    this.paths.unshift(p5.createVector(0, window.innerHeight / 2 - 50))
    this.generateMovingAnimation()
  }

  private generateMovingAnimation() {
    // NOTICE: 基于正弦函数构造一个波形，distance正好是半个周期（y轴距离）
    this.nextDistance = this.p5.random(120, 200)
    this.nextAmplitude = this.p5.random(20, 40)
    this.nextSign *= -1
    const nextDuration = this.p5.random(5000, 8000)
    const startX = this.x
    const startY = this.y
    // const b = Math.PI / this.nextDistance
    this.movingAnimation = new Tween({ basis: 0 })
      .to({ basis: 1 }, nextDuration)
      .easing(Easing.Linear.None)
      .onUpdate(({ basis }) => {
        const xOffset = this.nextAmplitude * Math.sin(basis * Math.PI) * this.nextSign
        const yOffset = basis * this.nextDistance
        this.moveTo(
          startX + xOffset,
          startY - yOffset
        )
      })
      .onComplete(() => {
        this.moveTo(
          startX,
          startY - this.nextDistance
        )
        this.animastions.remove(this.movingAnimation)
        if (this.moving) {
          // setTimeout(() => {
          //   this.generateMovingAnimation()
          // }, 200)
          this.generateMovingAnimation()
        }
      })
      .start()

    this.animastions.add(this.movingAnimation)
  }

  private animation() {
    this.animastions.update(performance.now())
    if (!this.movingAnimation.isPlaying()) {
      this.moveTo(this.x, this.y)
      this.moveTo(this.x, this.y)
      // this.moveTo(this.x, this.y)
      // this.moveTo(this.x, this.y)
      // this.moveTo(this.x, this.y)
    }
  }

  get x() {
    return this.paths[0].x
  }

  get y() {
    return this.paths[0].y
  }

  private moveTo(x: number, y: number) {
    if (this.paths.length === ThoughtsPoint.pathNums) {
      this.paths.pop()
    }
    this.paths.unshift(this.p5.createVector(x, y))
  }

  private forword(speed = 0.1) {
    this.moveTo(this.x, this.y - speed)
  }

  display() {
    this.animation()
    this.p5.strokeWeight(1)
    // NOTICE: replace blend mode可以达到后绘制的完全覆盖之前的颜色
    // https://p5js.org/reference/p5/blendMode/
    this.p5.blendMode(this.p5.REPLACE)
    this.paths.forEach((path, idx) => {
      const scale = 1 - idx / ThoughtsPoint.pathNums
      this.p5.noStroke()
      this.p5.fill(240, scale * scale * scale * 255)
      // this.p5.stroke(120, 255 * scale)
      this.p5.circle(path.x - focusCenter.X, path.y - focusCenter.Y, 20 * scale)
    })
    this.p5.blendMode(this.p5.BLEND)
  }
}

interface ThoughtsCircleProps {
  radius: number
  color: Color
  attractiveness: number
  center: Vector
  delay?: number
}

const colors = [
  '#2D3250',
  '#424769',
  '#7077A1',
  '#F6B17A',
  '#451952',
  '#AE445A'
]

function createRandomColor(p5: P5CanvasInstance) {
  return p5.color(p5.random(255), p5.random(255), p5.random(255))
}

function randomSign() {
  return Math.random() > 0.5 ? 1 : -1
}

// TODO: bloom效果
// TODO: 从特定颜色列表中随机选取
class ThoughtsCircle {
  private animations = new Group()
  private breathAnimation: Tween
  private scale = 1
  static padding = 20
  constructor(private p5: P5CanvasInstance, private props: ThoughtsCircleProps) {
    let prevAlpha = 255
    this.breathAnimation = new Tween({ alpha: 255, scale: 1 })
      .to({ alpha: 80, scale: 0.5 }, Math.round(p5.random(6000, 10000)))
      .easing(Easing.Quadratic.InOut)
      .yoyo(true)
      .repeat(Infinity)
      .repeatDelay(1000)
      .onUpdate(({ alpha, scale }) => {
        // FIXME: 不知道为啥当插值到80附近会突然变成255，应该是类似周期动画末期保持哪一帧的问题
        if (Math.abs(alpha - prevAlpha) > 100) {
          return
        }
        prevAlpha = alpha
        this.scale = scale
        this.props.color.setAlpha(alpha)
      })
    this.initDelay()
  }

  private initDelay() {
    if (!this.props.delay) {
      this.animations.add(this.breathAnimation)
      return
    }
    this.props.color.setAlpha(0)
    const tween = new Tween({ alpha: 0 })
      .delay(this.props.delay)
      .easing(Easing.Quartic.In)
      .to({ alpha: 1 }, 500)
      .onUpdate(({ alpha }) => {
        this.props.color.setAlpha(alpha * 255)
      })
      .onComplete(() => {
        this.props.color.setAlpha(255)
        this.animations.remove(tween)
        this.animations.add(this.breathAnimation)
        this.breathAnimation.start()
      })
      .start()

    this.animations.add(tween)
  }

  display() {
    this.animation()
    this.p5.noFill()
    this.p5.strokeWeight(2)
    // this.p5.strokeJoin(this.p5.ROUND)
    // this.p5.strokeCap(this.p5.ROUND)
    this.p5.stroke(this.props.color)
    this.p5.circle(this.props.center.x - focusCenter.X, this.props.center.y - focusCenter.Y, this.props.radius * this.scale * 2)
  }

  private animation() {
    this.animations.update(performance.now())
  }

  static random(p5: P5CanvasInstance) {
    const halfWidth = bg.initialWidth / 2 - ThoughtsCircle.padding
    const halfHeight = window.innerHeight / 2 - ThoughtsCircle.padding
    p5.randomSeed(Math.random() * 1000000000)

    return new ThoughtsCircle(p5, {
      radius: Math.round(p5.random(30, 50)),
      color: p5.color(Math.round(p5.random(20, 120))),
      attractiveness: p5.random(0.2, 1),
      center: p5.createVector(p5.random(this.padding, halfWidth) * randomSign(), p5.random(this.padding, halfHeight) * randomSign()),
      delay: p5.random(500, 4000)
    })
  }
}

function generateRandomCircels(p5: P5CanvasInstance) {
  const nums = 24
  const padding = 50
  const halfWidth = bg.initialWidth / 2 - padding
  const halfHeight = window.innerHeight / 2
  const verticalAxis = Math.ceil(nums / 2)
  const verticalHeight = window.innerHeight / verticalAxis
  const halfVerticalHeight = verticalHeight / 2
  p5.randomSeed(Math.random() * 1000000000)

  for (let i = 0; i < nums; i++) {
    const sign = i % 2 === 0 ? 1 : -1
    const yAxis = Math.floor(i / 2)
    const baseY = -halfHeight + yAxis * verticalHeight + halfVerticalHeight
    const x = p5.random(padding, halfWidth) * sign
    const y = p5.random(-halfVerticalHeight, halfVerticalHeight) + baseY
    const circle = new ThoughtsCircle(p5, {
      radius: Math.round(p5.random(30, 50)),
      color: p5.color(Math.round(p5.random(20, 120))),
      center: p5.createVector(x, y),
      delay: p5.random(500, 4000),
      attractiveness: p5.random(0.2, 1)
    })
    circles.push(circle)
  }
}

function drawCircles() {
  circles.forEach((circle) => {
    circle.display()
  })
}

function setup(p5: P5CanvasInstance) {
  focusCenter = new FocusCenter()
  thoughtsPoint = new ThoughtsPoint(p5)
  bg = new Background(p5)
  generateRandomCircels(p5)
  p5.createCanvas(window.innerWidth, window.innerHeight, p5.WEBGL)
}

function draw(p5: P5CanvasInstance) {
  p5.background(20)
  bg.display()
  focusCenter.focus(thoughtsPoint.x, thoughtsPoint.y)
  focusCenter.update()
  drawCircles()
  thoughtsPoint.display()
}

function ThoughtsWandering() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default ThoughtsWandering
