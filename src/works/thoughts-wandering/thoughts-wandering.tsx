import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Color, Vector } from 'p5'

let bg: Background
let focusCenter: FocusCenter
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
  readonly initialWidth = 400
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
  constructor(private p5: P5CanvasInstance) {}
}

interface ThoughtsCircleProps {
  radius: number
  color: Color
  attractiveness: number
  center: Vector
  delay?: number
}

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
  static padding = 20
  constructor(private p5: P5CanvasInstance, private props: ThoughtsCircleProps) {
    let prevAlpha = 255
    this.breathAnimation = new Tween({ alpha: 255 })
      .to({ alpha: 80 }, 3000)
      .easing(Easing.Quadratic.InOut)
      .yoyo(true)
      .repeat(Infinity)
      .onUpdate(({ alpha }) => {
        // FIXME: 不知道为啥当插值到80附近会突然变成255，应该是类似周期动画末期保持哪一帧的问题
        if (Math.abs(alpha - prevAlpha) > 100) {
          return
        }
        prevAlpha = alpha
        this.props.color.setAlpha(alpha)
      })
      .start()
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
        this.animations.add(this.breathAnimation)
        this.animations.remove(tween)
      })
      .start()

    this.animations.add(tween)
  }

  display() {
    this.animation()
    this.p5.noFill()
    this.p5.strokeWeight(1)
    this.p5.strokeJoin(this.p5.ROUND)
    this.p5.strokeCap(this.p5.ROUND)
    this.p5.stroke(this.props.color)
    this.p5.circle(this.props.center.x - focusCenter.X, this.props.center.y - focusCenter.Y, this.props.radius * 2)
  }

  private animation() {
    this.animations.update(performance.now())
  }

  static random(p5: P5CanvasInstance) {
    const halfWidth = bg.initialWidth / 2 - ThoughtsCircle.padding
    const halfHeight = window.innerHeight / 2 - ThoughtsCircle.padding
    p5.randomSeed(Math.random() * 1000000000)

    return new ThoughtsCircle(p5, {
      radius: p5.random(30, 50),
      color: createRandomColor(p5),
      attractiveness: p5.random(0.2, 1),
      center: p5.createVector(p5.random(0, halfWidth) * randomSign(), p5.random(0, halfHeight) * randomSign()),
      delay: p5.random(500, 2000)
    })
  }
}

function drawCircles() {
  circles.forEach((circle) => {
    circle.display()
  })
}

function setup(p5: P5CanvasInstance) {
  focusCenter = new FocusCenter()
  bg = new Background(p5)
  for (let i = 0; i < 10; i++) {
    circles.push(ThoughtsCircle.random(p5))
  }
  p5.createCanvas(window.innerWidth, window.innerHeight, p5.WEBGL)
  bg.transitionToWidth(600)
  focusCenter.test()
}

function draw(p5: P5CanvasInstance) {
  p5.background(240)
  bg.display()
  // focusCenter.update()
  drawCircles()
}

function ThoughtsWandering() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default ThoughtsWandering
