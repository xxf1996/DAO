import { useP5 } from '@/hooks/p5'
import type { P5CanvasInstance } from '@p5-wrapper/react'
import { ReactP5Wrapper } from '@p5-wrapper/react'
import { Easing, Group, Tween } from '@tweenjs/tween.js'
import type { Color, Vector } from 'p5'

const spectacles: Spectacles[] = []

class Spectacles {
  /** 镜框尺寸 */
  static spectaclesSize = 20
  /** 当前被关注的目标实例 */
  static focusedTarget?: Spectacles
  private depth = 0
  private color: Color
  /** 是否处于关注状态 */
  private focused = false
  /** 关注状态开始时间戳 */
  private focusStartTime = 0
  /** 关注状态持续时间 */
  private focusTime = 0
  private animations = new Group()
  /** 普通活动状态动画 */
  private activeAnimation: Tween
  private activeAxis: Vector
  private activeAngle = 0
  private scale = 1
  /** 法向量，也是朝向 */
  private normal: Vector
  constructor(private p5: P5CanvasInstance, private position: Vector) {
    this.normal = p5.createVector(0, 0, 1)
    this.color = p5.color(240)
    this.activeAxis = p5.random() > 0.5 ? p5.createVector(0, 1, 0) : p5.createVector(1, 0, 0)
    const angleRange = p5.random(p5.PI / 12, p5.PI / 8)
    // let prevAngle = 0
    this.activeAnimation = new Tween({ angle: 0 })
      .to({ angle: p5.PI * 3 })
      .duration(p5.random(1000, 2000))
      .easing(Easing.Linear.None)
      .repeat(Infinity)
      .repeatDelay(p5.random(1000, 3000))
      // .yoyo(true)
      .onUpdate(({ angle }) => {
        // if (Math.abs(prevAngle - angle) > 1) {
        //   return
        // }
        this.activeAngle = Math.sin(angle) * angleRange
        // prevAngle = angle
      })
      .start()

    this.animations.add(this.activeAnimation)
  }

  setZ(z: number) {
    this.depth = z
  }

  setColor(color: Color) {
    this.color = color
  }

  get coord() {
    return this.p5.createVector(this.position.x, this.position.y, this.depth)
  }

  private addFocusAnimation() {
    this.activeAnimation.stop()
    this.activeAngle = 0
    this.normal = this.p5.createVector(0, 0, 1)
    const focusAnimation = new Tween({ scale: 1 })
      .to({ scale: 2.4 })
      .duration(3000)
      .easing((t) => {
        // 两次反弹
        if (t < 0.25) {
          return Easing.Bounce.Out(t * 4) * 0.5
        } else if (t < 0.75) {
          return 0.5
        } else {
          return Easing.Bounce.Out((t - 0.75) * 4) * 0.5 + 0.5
        }
      })
      .onUpdate(({ scale }) => {
        this.scale = scale
      })
      .onComplete(() => {
        this.animations.remove(focusAnimation)
        // TODO: 聚焦完成后的动画
      })
      .start()
    this.animations.add(focusAnimation)
  }

  private addBlurAnimation() {
    const blurAnimation = new Tween({ scale: this.scale })
      .to({ scale: 1 })
      .duration(600)
      .easing(Easing.Bounce.Out)
      .onUpdate(({ scale }) => {
        this.scale = scale
      })
      .onComplete(() => {
        this.animations.remove(blurAnimation)
        this.activeAnimation.start()
      })
      .start()

    this.animations.add(blurAnimation)
  }

  /**
   * 添加移动视角动画，将朝向（normal）指向当前聚焦的物体
   */
  addMovingViewAnimation() {
    if (this.focused) {
      return
    }
    if (!Spectacles.focusedTarget) {
      return
    }
    this.activeAnimation.pause()
    const direction = Spectacles.focusedTarget.coord.sub(this.coord).normalize()
    const distance = Spectacles.focusedTarget.coord.dist(this.coord)
    const movingViewAnimation = new Tween({ x: this.normal.x, y: this.normal.y, z: this.normal.z })
      .to({ x: direction.x, y: direction.y, z: direction.z })
      .delay(distance)
      .duration(1000)
      .easing(Easing.Linear.None)
      .onUpdate(({ x, y, z }) => {
        this.normal = this.p5.createVector(x, y, z)
      })
      .onComplete(() => {
        this.animations.remove(movingViewAnimation)
        this.activeAnimation.resume()
      })
      .start()

    this.animations.add(movingViewAnimation)
  }

  focus() {
    this.focused = true
    Spectacles.focusedTarget = this
    this.focusStartTime = Date.now()
    this.focusTime = this.p5.random(10000, 30000)
    this.setColor(this.p5.color(255, 0, 0))
    this.addFocusAnimation()
  }

  blur() {
    this.focused = false
    Spectacles.focusedTarget = undefined
    this.setColor(this.p5.color(240))
    this.addBlurAnimation()
  }

  private update() {
    this.animations.update(performance.now())
    if (!this.focused) {
      return
    }
    if (Date.now() - this.focusStartTime > this.focusTime) {
      this.blur()
    }
  }

  private get size() {
    return Spectacles.spectaclesSize
  }

  /** 将z轴对齐到normal方向 */
  private alignNormal() {
    const zAxis = this.p5.createVector(0, 0, 1)
    if (this.normal.dot(zAxis) === 1) {
      return
    }
    // 计算z轴和normal的夹角和垂直于平面的轴
    const axis = zAxis.cross(this.normal)
    const angle = zAxis.angleBetween(this.normal)
    this.p5.rotate(angle, axis)
  }

  display() {
    this.update()
    this.p5.push()
    this.p5.fill(20)
    this.p5.stroke(this.color)
    this.p5.strokeWeight(3)
    this.p5.strokeCap(this.p5.SQUARE)
    // 将坐标原点移动到当前物体中心
    this.p5.translate(this.position.x, this.position.y, this.depth)
    this.alignNormal()
    this.p5.rotate(this.activeAngle, this.activeAxis)
    this.p5.scale(this.scale)
    // this.p5.rotateY(this.p5.frameCount * 0.01)
    const left = -Spectacles.spectaclesSize * 1.5
    const right = Spectacles.spectaclesSize * 1.5
    const top = -Spectacles.spectaclesSize * 0.5
    // 眼眶绘制
    this.p5.rect(left, top, Spectacles.spectaclesSize, Spectacles.spectaclesSize)
    this.p5.rect(Spectacles.spectaclesSize * 0.5, top, Spectacles.spectaclesSize, Spectacles.spectaclesSize)
    // 横梁
    this.p5.line(-Spectacles.spectaclesSize * 0.5, 0, Spectacles.spectaclesSize * 0.5, 0)
    this.p5.strokeWeight(1)
    this.p5.noFill()
    // 左边挂钩
    this.p5.beginShape()
    this.p5.vertex(left, 0, 0)
    this.p5.vertex(left, 0, -Spectacles.spectaclesSize * 2)
    this.p5.vertex(left, Spectacles.spectaclesSize * 0.25, -Spectacles.spectaclesSize * 2)
    this.p5.endShape()
    // 右边挂钩
    this.p5.beginShape()
    this.p5.vertex(right, 0, 0)
    this.p5.vertex(right, 0, -Spectacles.spectaclesSize * 2)
    this.p5.vertex(right, Spectacles.spectaclesSize * 0.25, -Spectacles.spectaclesSize * 2)
    this.p5.endShape()
    this.p5.pop()
  }

  /**
   * 从眼镜列表中随机选中一个进行focus
   * @param list
   * @returns 选中的眼镜实例
   */
  static choice(list: Spectacles[]) {
    if (Spectacles.focusedTarget) {
      return
    }
    const target = list[Math.floor(Math.random() * list.length)]
    target.focus()

    return target
  }

  static run(list: Spectacles[]) {
    const target = Spectacles.choice(list)
    list.forEach((el) => {
      if (target && el !== target) {
        el.addMovingViewAnimation()
      }
      el.display()
    })
  }
}

/** 按照封面图的原始视角进行相应的还原 */
function originalViewSetup(p5: P5CanvasInstance) {
  p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL)
  for (let x = -20; x <= 20; x++) {
    for (let y = -10; y <= 10; y++) {
      const el = new Spectacles(p5, p5.createVector(x * 100, y * 100))
      el.setZ(y * 100)
      if (x === 0 && y === 0) {
        el.setColor(p5.color(255, 0, 0))
      }
      spectacles.push(el)
    }
  }
  const camera = p5.createCamera()
  const basis = 1
  camera.setPosition(2000 * basis, 500 * basis, 1500 * basis)
  camera.lookAt(-2000 * basis, 0 * basis, -2500 * basis)
  p5.setCamera(camera)
  p5.debugMode(p5.AXES)
  // 由于相机无法设置旋转？根据原图，顶部应该是水平的，所以对整体结果进行旋转以便对齐
  p5.rotateZ(0.33)
}

function originalViewDraw(p5: P5CanvasInstance) {
  p5.background(20)
  p5.orbitControl()
  spectacles.forEach(s => s.display())
}

function draw(p5: P5CanvasInstance) {
  p5.background(20)
  p5.orbitControl()
  Spectacles.run(spectacles)
}

function setup(p5: P5CanvasInstance) {
  p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL)
  for (let x = -10; x <= 10; x++) {
    for (let y = -6; y <= 6; y++) {
      const el = new Spectacles(p5, p5.createVector(x * 100, y * 100))
      el.setZ(y * 100)
      spectacles.push(el)
    }
  }
  // p5.debugMode(p5.AXES)
}

function SpectacleSociety() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default SpectacleSociety
