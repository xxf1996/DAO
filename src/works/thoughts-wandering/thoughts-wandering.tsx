import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Color, Vector } from 'p5'

let bg: Background
let focusCenter: FocusCenter
let thoughtsPoint: ThoughtsPoint
const circles: ThoughtsCircle[] = []

/** p5的circle都是默认的分段数，因此圆圈很大的时候多边形就特别明显，不够平滑 */
function circle(p5: P5CanvasInstance, centerX: number, centerY: number, radius: number, segments = 32) {
  const angle = p5.TWO_PI / segments // 计算每个分段的角度

  p5.beginShape()
  for (let i = 0; i < segments; i++) {
    const x = Math.cos(angle * i) * radius
    const y = Math.sin(angle * i) * radius
    p5.vertex(centerX + x, centerY + y)
  }
  p5.endShape(p5.CLOSE)
}

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
  static readonly padding = 20
  private windowWidth: number
  private windowHeight: number
  private left: number
  private right: number
  private initialLeft: number
  private initialRight: number
  /** tween animation group */
  private animations = new Group()
  constructor(private p5: P5CanvasInstance) {
    this.windowWidth = window.innerWidth
    this.windowHeight = window.innerHeight
    this.left = -this.initialWidth / 2
    this.right = this.initialWidth / 2
    this.initialLeft = this.left
    this.initialRight = this.right
  }

  private get y() {
    return -this.windowHeight / 2
  }

  private get x() {
    return this.left
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

  /**
   * 根据圆圈显示区域自适应背景的宽度，确保圆圈不会超出背景
   */
  private adaptiveWidth() {
    let minX = Infinity
    let maxX = -Infinity
    circles.forEach((circle) => {
      minX = Math.min(minX, circle.center.x - circle.realRadius)
      maxX = Math.max(maxX, circle.center.x + circle.realRadius)
    })
    let targetLeft = minX - Background.padding
    let targetRight = maxX + Background.padding
    if (targetLeft > this.initialLeft) {
      targetLeft = this.initialLeft
    }

    if (targetRight < this.initialRight) {
      targetRight = this.initialRight
    }
    this.left = targetLeft
    this.right = targetRight
  }

  display() {
    // this.animation()
    this.adaptiveWidth()
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
      -width / 2,
      width / 2
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
  private container: null | ThoughtsCircle = null
  constructor(private p5: P5CanvasInstance) {
    this.paths.unshift(p5.createVector(0, window.innerHeight / 2 + 200))
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

  capturedBy(circle: ThoughtsCircle) {
    // 沿抛物线轨迹移动到圆心
    this.container = circle
    this.movingAnimation.stop()
    this.animastions.remove(this.movingAnimation)
    console.log('captured by: ', this.container)
    const distance = this.paths[0].dist(circle.center)
    const localX = this.x - circle.center.x
    const localY = -(this.y - circle.center.y) // NOTICE: 要考虑到p5的y轴方向是竖直向下的
    /**
     * 相位差
     *
     * 因为这里的阿基米德螺线起始点在本地坐标系中的起点为(distance, 0)
     *
     * 因此需要计算当前位置在本地坐标系中相对起点的角度差，即相位差，这样就可以通过旋转相应角度来确保**无论在任何位置都是同一段螺线**！
     */
    const delta = Math.atan2(localY, localX)
    /** 臂距 = 2π * b */
    const b = distance / (Math.PI * 2)
    const captureAnimation = new Tween({ angle: Math.PI * 2 })
      .to({ angle: 0 }, 500)
      .easing(Easing.Linear.None)
      .onUpdate(({ angle }) => {
        // 阿基米德螺线公式，a=0
        const r = b * angle
        // 加上相位差等同于旋转
        const x = r * Math.cos(angle + delta)
        const y = r * Math.sin(angle + delta)
        this.moveTo(circle.center.x + x, circle.center.y - y)
      })
      .onComplete(() => {
        this.animastions.remove(captureAnimation)
        circle.enlarge()
      })
      .start()

    // TODO: 砸瓦鲁多的动画
    this.animastions.add(captureAnimation)
  }

  /** 是否可以被捕获 */
  get capturable() {
    return this.container === null
  }

  private wandering() {
    // TODO: 随机游荡
  }
}

interface ThoughtsCircleProps {
  radius: number
  color: Color
  /** 引力系数，即引力范围相当于半径的多少倍 */
  attractiveness: number
  center: Vector
  /** 延迟出现的时间，单位毫秒 */
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
  private prevCheckTime = 0
  private isContainer = false
  /** 砸瓦鲁多 */
  private theWorld = false
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
        if (!this.theWorld) {
          this.animations.add(this.breathAnimation)
          this.breathAnimation.start()
        }
      })
      .start()

    this.animations.add(tween)
  }

  display() {
    if (this.theWorld && !this.isContainer) {
      return
    }
    this.animation()
    this.p5.noFill()
    this.p5.strokeWeight(2)
    this.p5.stroke(this.props.color)
    // this.p5.circle(this.props.center.x - focusCenter.X, this.props.center.y - focusCenter.Y, this.props.radius * this.scale * 2)
    circle(
      this.p5,
      this.props.center.x - focusCenter.X,
      this.props.center.y - focusCenter.Y,
      this.props.radius * this.scale,
      this.scale > 2 ? 120 : 32
    )
  }

  enlarge() {
    if (!this.isContainer) {
      return
    }
    const targetScale = this.p5.random(5, 10)
    this.breathAnimation.stop()
    this.props.color.setAlpha(255)
    this.animations.remove(this.breathAnimation)
    const enlargeAnimation = new Tween({ scale: this.scale })
      .to({ scale: targetScale }, 300)
      .easing(Easing.Quartic.In)
      .onUpdate(({ scale }) => {
        this.scale = scale
      })
      .onComplete(() => {
        this.animations.remove(enlargeAnimation)
      })
      .start()

    this.animations.add(enlargeAnimation)
  }

  private animation() {
    this.animations.update(performance.now())
  }

  capture(thought: ThoughtsPoint) {
    if (!thought.capturable) {
      this.theWorld = true
      return
    }

    this.theWorld = false
    const curRadius = this.props.radius * this.scale
    const thoughtPoint = this.p5.createVector(thought.x, thought.y)
    const distance = thoughtPoint.dist(this.props.center)
    // 进入圆圈必被捕获
    if (distance < curRadius) {
      thought.capturedBy(this)
      this.isContainer = true
      return
    }

    // console.log('distance: ', distance)

    const curTime = Date.now()
    if (curTime - this.prevCheckTime < 200) {
      return
    }
    this.prevCheckTime = curTime
    const r = curRadius * this.props.attractiveness
    if (distance > r) {
      return
    }
    // 距离越近被捕获的概率越大，同样引力范围越大被捕获的概率也越大
    const captured = Math.random() > distance / r
    if (captured) {
      thought.capturedBy(this)
      this.isContainer = true
    }
  }

  get center() {
    return this.props.center
  }

  get realRadius() {
    return this.props.radius * this.scale
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
      attractiveness: p5.random(1.5, 2.5)
    })
    circles.push(circle)
  }
}

function drawCircles() {
  circles.forEach((circle) => {
    circle.capture(thoughtsPoint)
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
  focusCenter.focus(0, thoughtsPoint.y)
  focusCenter.update()
  drawCircles()
  thoughtsPoint.display()
}

function ThoughtsWandering() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default ThoughtsWandering
