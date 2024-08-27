import { useP5 } from '@/hooks/p5'
// import '@/utils/p5-sound'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Color, Vector } from 'p5'

let bg: Background
/** 焦点，用于模拟相机移动 */
let focusCenter: FocusCenter
let thoughtsPoint: ThoughtsPoint
let circlesGenerator: CirclesGenerator

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
  /** 背景区域颜色是否反转，用于配合砸瓦鲁多效果 */
  private inverted = false
  /** 反转区域比例，用于过渡动画 */
  private invertedBais = 0
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
    if (this.animations.getAll().length > 0) {
      return
    }
    let minX = Infinity
    let maxX = -Infinity
    circlesGenerator.Circles.forEach((circle) => {
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

    if (Math.abs(targetLeft - this.left) > 0.001 || Math.abs(targetRight - this.right) > 0.001) {
      this.transition(targetLeft, targetRight)
    }
  }

  display() {
    this.animation()
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

  private transition(left: number, right: number, duration = 200) {
    const tween = new Tween({ left: this.left, right: this.right })
      .to({ left, right }, duration)
      .easing(Easing.Linear.None)
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

  /** 判断圆圈是否在背景区域内 */
  isCircleInside(circle: ThoughtsCircle) {
    const center = circle.realCenter
    const radius = circle.realRadius
    const top = center.y - radius

    return top < this.windowHeight / 2
  }

  /** 启动反转 */
  invert() {
    this.inverted = true
    const invertAnimation = new Tween({ invertedBais: 0 })
      .to({ invertedBais: 1 }, 300)
      .easing(Easing.Cubic.In)
      .onUpdate(({ invertedBais }) => {
        this.invertedBais = invertedBais
      })
      .onComplete(() => {
        this.animations.remove(invertAnimation)
      })
      .start()

    this.animations.add(invertAnimation)
  }

  /** 停止反转 */
  normal() {
    const invertAnimation = new Tween({ invertedBais: 1 })
      .to({ invertedBais: 0 }, 300)
      .easing(Easing.Cubic.In)
      .onUpdate(({ invertedBais }) => {
        this.invertedBais = invertedBais
      })
      .onComplete(() => {
        this.animations.remove(invertAnimation)
        this.inverted = false
      })
      .start()

    this.animations.add(invertAnimation)
  }

  /** 由于通过blendmode来控制反转的区域，因此需要最后绘制，以便进行覆盖 */
  finalDraw() {
    if (!this.inverted) {
      return
    }
    // FIXME: 本来打算用difference模式，但是不知道为啥不起作用？
    this.p5.blendMode(this.p5.EXCLUSION)
    this.p5.noStroke()
    this.p5.fill(255)
    this.p5.rect(this.x, this.y, this.width, this.windowHeight * this.invertedBais)
    this.p5.blendMode(this.p5.BLEND)
  }
}

class ThoughtsPoint {
  /** 历史路径总数，用于控制拖尾的长度 */
  static pathNums = 100
  private paths: Vector[] = []
  /** 下一次移动的y轴距离 */
  private nextDistance = 0
  /** 下一次移动的振幅 */
  private nextAmplitude = 0
  /** 下一次移动的方向（x轴） */
  private nextSign = -1
  /** 常规移动动画 */
  private movingAnimation = new Tween({ basis: 0 })
  private animations = new Group()
  private moving = true
  /** 随机游走总步数，用于噪声生成 */
  private wanderingFrameCount = 0
  /** 是否正在进行随机游走 */
  private wandering = false
  /** 被捕获的圆 */
  private container: null | ThoughtsCircle = null
  /** 是否处于免疫期（用于免疫捕获） */
  private freeze = false
  /** 是否显示“尾巴” */
  private showTail = true
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
        this.animations.remove(this.movingAnimation)
        if (this.moving) {
          this.generateMovingAnimation()
        }
      })
      .start()

    this.animations.add(this.movingAnimation)
  }

  private animation() {
    this.animations.update(performance.now())
    // 非移动状态下，路径归一
    if (!this.moving) {
      this.moveTo(this.x, this.y)
      this.moveTo(this.x, this.y)
    }

    if (this.wandering) {
      this.randomWalk()
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

  /** 清空运动轨迹，只保留当前位置 */
  private resetPaths() {
    this.paths.splice(1)
  }

  display() {
    this.animation()
    this.p5.strokeWeight(1)
    // NOTICE: replace blend mode可以达到后绘制的完全覆盖之前的颜色
    // https://p5js.org/reference/p5/blendMode/
    this.p5.blendMode(this.p5.REPLACE);
    (this.showTail ? this.paths : this.paths.slice(0, 1)).forEach((path, idx) => {
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
    this.animations.remove(this.movingAnimation)
    this.showTail = false
    console.log('captured by: ', this.container)
    ThoughtsCircle.theWorld = true
    console.log('砸瓦鲁多')
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
        this.animations.remove(captureAnimation)
        bg.invert()
        circle.enlarge()
        this.wandering = true
        this.showTail = true
        this.resetPaths() // 清空轨迹避免显示很割裂
        // focusCenter.focus(0, circle.center.y)
      })
      .start()

    // TODO: 砸瓦鲁多的动画
    this.animations.add(captureAnimation)
  }

  /** 是否可以被捕获 */
  get capturable() {
    return this.container === null && !this.freeze
  }

  // private randomFrom2D(x: number, y: number) {
  //   const value = Math.sin(Vector.dot(this.p5.createVector(x, y), this.p5.createVector(12.3912, 18.83653))) * 73134.41
  //   return this.p5.fract(value)
  // }

  /** 基于perlin噪声的随机游走 */
  private randomWalk() {
    if (!this.container) {
      return
    }
    this.wanderingFrameCount++
    // FIXME: 感觉这里的noise噪声概率不均匀？
    const theta = this.p5.noise(this.p5.frameCount * 0.001, this.wanderingFrameCount * 0.005) * this.p5.TWO_PI * 2 // 角度构成一个前进方向
    const r = 0.3 // 半径就是速度
    const nextX = this.x + r * Math.cos(theta)
    const nextY = this.y + r * Math.sin(theta)
    // 直线指示当前方向，貌似加上就有类似生物的感觉了？
    this.p5.stroke(200)
    this.p5.line(
      this.x - focusCenter.X,
      this.y - focusCenter.Y,
      this.x + 20 * Math.cos(theta) - focusCenter.X,
      this.y + 20 * Math.sin(theta) - focusCenter.Y
    )
    this.moveTo(nextX, nextY)
    if (this.paths[0].dist(this.container.center) > this.container.realRadius - 1) {
      this.wandering = false
      this.moving = false
      this.escape()
    }
  }

  private afterEscape() {
    this.container = null
    this.freeze = true
    setTimeout(() => {
      this.freeze = false
    }, 5000)
  }

  private escape() {
    if (!this.container) {
      return
    }
    const escapeAnimation = new Tween({ x: this.x, y: this.y })
      .to({ x: 0, y: this.container.center.y }, 500)
      .delay(2000)
      .easing(Easing.Bounce.Out)
      .onStart(() => {
        this.showTail = false
        this.container?.shrink()
        this.moving = true
      })
      .onUpdate(({ x }) => {
        this.moveTo(x, this.y)
      })
      .onComplete(() => {
        this.animations.remove(escapeAnimation)
        this.showTail = true
        this.resetPaths()
        this.generateMovingAnimation()
        this.afterEscape()
      })
      .start()

    bg.normal()
    this.animations.add(escapeAnimation)
  }
}

// TODO: 圆心可以加上类似行星的椭圆运动轨迹
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
  /** 呼吸动画 */
  private breathAnimation: Tween
  /** 缩放系数，控制半径 */
  private scale = 1
  static padding = 20
  private prevCheckTime = 0
  /** 是否成为捕获point的容器 */
  private isContainer = false
  /** 砸瓦鲁多（时停，隐藏容器和point以外的要素） */
  static theWorld = false
  constructor(private p5: P5CanvasInstance, private props: ThoughtsCircleProps) {
    let prevAlpha = 255
    this.breathAnimation = new Tween({ alpha: 255, scale: 1 })
      .to({ alpha: 80, scale: 0.5 }, Math.round(p5.random(6000, 10000)))
      .delay(p5.random(1000, 10000))
      .easing(Easing.Quadratic.InOut)
      .yoyo(true) // 往返动画
      .repeat(Infinity)
      .repeatDelay(p5.random(500, 1500))
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

  /** 初始化延迟动画 */
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
    if (ThoughtsCircle.theWorld && !this.isContainer) {
      return
    }
    this.p5.noFill()
    this.p5.strokeWeight(2)
    this.p5.stroke(this.props.color)
    circle(
      this.p5,
      this.props.center.x - focusCenter.X,
      this.props.center.y - focusCenter.Y,
      this.props.radius * this.scale,
      this.scale > 2 ? 120 : 32 // 半径越大，需要的分段数越多，不然就不够光滑
    )
  }

  /** 放大 */
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

  /** 缩小 */
  shrink() {
    ThoughtsCircle.theWorld = false
    const shrinkAnimation = new Tween({ scale: this.scale })
      .to({ scale: 1 }, 300)
      .easing(Easing.Quartic.In)
      .onUpdate(({ scale }) => {
        this.scale = scale
      })
      .onComplete(() => {
        this.isContainer = false
        this.animations.remove(shrinkAnimation)
        this.animations.add(this.breathAnimation)
        this.breathAnimation.start()
      })
      .start()

    this.animations.add(shrinkAnimation)
  }

  private animation() {
    this.animations.update(performance.now())
  }

  /** 捕获过程 */
  capture(thought: ThoughtsPoint) {
    if (!thought.capturable) {
      return
    }
    const curRadius = this.props.radius * this.scale
    const thoughtPoint = this.p5.createVector(thought.x, thought.y)
    const distance = thoughtPoint.dist(this.props.center)
    // 进入圆圈必被捕获
    if (distance < curRadius) {
      console.log('distance: ', distance, 'curRadius: ', curRadius, 'scale: ', this.scale)
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
      console.log(distance, r)
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

  get realCenter() {
    return this.p5.createVector(this.props.center.x - focusCenter.X, this.props.center.y - focusCenter.Y)
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

class CirclesGenerator {
  static readonly padding = 50
  private circles: ThoughtsCircle[] = []
  private no = 0
  private halfWidth: number
  private halfHeight: number
  private verticalAxis: number
  private verticalHeight: number
  private halfVerticalHeight: number
  constructor(private readonly p5: P5CanvasInstance, private readonly totalNums = 30) {
    this.halfWidth = bg.initialWidth / 2 - CirclesGenerator.padding
    this.halfHeight = window.innerHeight / 2
    this.verticalAxis = Math.ceil(totalNums / 2)
    this.verticalHeight = window.innerHeight / this.verticalAxis
    this.halfVerticalHeight = this.verticalHeight / 2
    for (let i = 0; i < totalNums; i++) {
      this.generate()
    }
  }

  /**
   * 根据总的圆圈数量，将竖直空间划分成等距的若干份
   *
   * 依次按照左右顺序生成圆圈，且沿空间向上移动
   */
  private generate() {
    if (this.circles.length >= this.totalNums) {
      return
    }
    this.p5.randomSeed(Math.random() * 1000000000)
    const sign = this.no % 2 === 0 ? 1 : -1
    const yAxis = Math.floor(this.no / 2)
    const baseY = this.halfHeight - (yAxis * this.verticalHeight + this.halfVerticalHeight)
    const x = this.p5.random(CirclesGenerator.padding, this.halfWidth) * sign
    const y = this.p5.random(-this.halfVerticalHeight, this.halfVerticalHeight) + baseY
    const circle = new ThoughtsCircle(this.p5, {
      radius: Math.round(this.p5.random(30, 50)),
      color: this.p5.color(Math.round(this.p5.random(20, 120))),
      center: this.p5.createVector(x, y),
      delay: this.p5.random(200, 1000),
      attractiveness: this.p5.random(1.5, 2.5)
    })
    this.circles.push(circle)
    this.no++
  }

  /** 检测是否有圆圈超出屏幕，超出则自动销毁然后补充新的 */
  private checkOutside() {
    if (ThoughtsCircle.theWorld) {
      return
    }
    const outsideIdx: number[] = []
    this.circles.forEach((circle, idx) => {
      if (bg.isCircleInside(circle)) {
        return
      }
      outsideIdx.push(idx)
    })

    outsideIdx.forEach((idx) => {
      this.circles.splice(idx, 1)
      console.log('remove: ', idx)
    })
    outsideIdx.forEach(() => {
      this.generate()
    })
  }

  drawCircles() {
    this.checkOutside()
    this.circles.forEach((circle) => {
      circle.capture(thoughtsPoint)
      circle.display()
    })
  }

  get Circles() {
    return this.circles
  }
}

async function setup(p5: P5CanvasInstance) {
  console.log(p5)
  focusCenter = new FocusCenter()
  thoughtsPoint = new ThoughtsPoint(p5)
  bg = new Background(p5)
  circlesGenerator = new CirclesGenerator(p5)
  // NOTICE: 这里采用的是WebGL context，因此坐标系跟canvas不一致？
  p5.createCanvas(window.innerWidth, window.innerHeight, p5.WEBGL)
  // p5.debugMode(p5.GRID)
}

function draw(p5: P5CanvasInstance) {
  p5.background(20)
  bg.display()
  focusCenter.focus(0, thoughtsPoint.y)
  focusCenter.update()
  circlesGenerator.drawCircles()
  thoughtsPoint.display()
  bg.finalDraw()
}

function ThoughtsWandering() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default ThoughtsWandering
