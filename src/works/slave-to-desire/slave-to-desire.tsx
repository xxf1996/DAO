import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Vector } from 'p5'

// 物理常量
const GRAVITY = 0.2
const AIR_RESISTANCE = 0.98
const BUBBLE_MIN_GROW_SPEED = 0.5
const BUBBLE_MAX_GROW_SPEED = 1.5
const BUBBLE_FLOAT_SPEED = 1
const FLOOR_HEIGHT = 150 // 距离底部的地面高度
const PERSON_HEIGHT = 100 // 将人物高度从60增加到100

// 人物状态枚举
enum PersonState {
  BLOWING, // 吹泡泡中
  FLOATING, // 被泡泡包裹漂浮中
  FALLING, // 泡泡破裂后下落中
}

// 线条人物类
class StickPerson {
  private position: Vector
  private velocity: Vector
  private acceleration: Vector
  private height: number
  private state: PersonState
  private animations = new Group()
  private bubble: Bubble | null = null
  private nextBubbleTime: number = 0
  private blowingPhase: number = 0 // 用于动画吹泡泡动作的阶段
  private blowingTool: Vector // 吹泡泡工具的位置

  constructor(private p5: P5CanvasInstance, x: number, y: number) {
    this.position = p5.createVector(x, y)
    this.velocity = p5.createVector(0, 0)
    this.acceleration = p5.createVector(0, 0)
    this.height = PERSON_HEIGHT
    this.state = PersonState.BLOWING
    this.nextBubbleTime = p5.millis()
    this.blowingTool = p5.createVector(x + 15, y - this.height * 0.5) // 吹泡泡工具初始位置
  }

  applyForce(force: Vector) {
    this.acceleration.add(force)
  }

  update() {
    this.animations.update(performance.now())

    // 根据状态处理不同的行为
    switch (this.state) {
      case PersonState.BLOWING:
        // 更新吹泡泡动作的阶段
        this.blowingPhase = (this.blowingPhase + 0.05) % (2 * Math.PI)

        // 正在吹泡泡，创建泡泡
        if (this.p5.millis() > this.nextBubbleTime && !this.bubble) {
          this.createBubble()
        }

        // 更新泡泡
        if (this.bubble) {
          this.bubble.update()

          // 检查泡泡是否足够大，可以包裹人物
          if (this.bubble.getRadius() > this.height * 1.2) {
            this.state = PersonState.FLOATING
            // 泡泡位置固定为人物头部的位置
            this.bubble.setPosition(this.position.x, this.position.y - this.height * 0.6)
          }
        }
        break

      case PersonState.FLOATING:
        // 漂浮状态，被泡泡包裹起来
        if (this.bubble) {
          // 泡泡向上漂浮
          this.bubble.float()

          // 人物跟随泡泡
          this.position.x = this.bubble.getPosition().x
          this.position.y = this.bubble.getPosition().y + this.height * 0.7

          // 随机决定泡泡是否破裂
          if (this.p5.random(1000) < 5 || this.position.y < -this.p5.height / 2) {
            this.popBubble()
          }
        }
        break

      case PersonState.FALLING:
        // 应用重力
        this.applyForce(this.p5.createVector(0, GRAVITY))

        // 更新速度和位置
        this.velocity.add(this.acceleration)
        this.velocity.mult(AIR_RESISTANCE)
        this.position.add(this.velocity)

        // 检查是否触地
        if (this.position.y > this.p5.height / 2 - FLOOR_HEIGHT) {
          this.position.y = this.p5.height / 2 - FLOOR_HEIGHT
          this.velocity.mult(0)
          this.state = PersonState.BLOWING
          // 设置下一次吹泡泡的时间
          this.nextBubbleTime = this.p5.millis() + this.p5.random(500, 2000)
        }

        // 重置加速度
        this.acceleration.mult(0)
        break
    }
  }

  createBubble() {
    // 创建泡泡在细管末端位置
    const handOffset = Math.sin(this.blowingPhase) * 2
    // 嘴部位置和管子末端位置
    const mouthX = this.position.x + 8
    const mouthY = this.position.y - this.height * 0.65
    // 手的位置
    const handX = mouthX + 15
    const handY = mouthY + 10 + handOffset
    // 管子末端位置（超出手一点）
    const toolEndX = handX + 5
    const toolEndY = handY
    this.bubble = new Bubble(
      this.p5,
      toolEndX,
      toolEndY,
      2, // 初始半径更小
      this.p5.random(BUBBLE_MIN_GROW_SPEED, BUBBLE_MAX_GROW_SPEED) * 0.6 // 降低成长速度，让泡泡增长更明显
    )
  }

  popBubble() {
    if (this.bubble) {
      // 创建泡泡破裂效果
      const bubblePos = this.bubble.getPosition()
      rippleManager.createRipple(bubblePos.x, bubblePos.y, this.bubble.getRadius())

      // 删除泡泡
      this.bubble = null

      // 改变状态为下落
      this.state = PersonState.FALLING

      // 给予向下的初始速度
      this.velocity = this.p5.createVector(this.p5.random(-1, 1), 1)
    }
  }

  display() {
    this.p5.push()
    this.p5.stroke(255)
    this.p5.strokeWeight(2)
    this.p5.noFill()

    // 绘制人物（坐姿）
    // 头部
    this.p5.circle(this.position.x, this.position.y - this.height * 0.7, 30) // 头部尺寸更大

    // 身体
    this.p5.line(
      this.position.x, this.position.y - this.height * 0.6,
      this.position.x, this.position.y - this.height * 0.3
    )

    // 手臂
    if (this.state === PersonState.BLOWING) {
      // 吹泡泡状态，一只手臂拿着吹泡泡工具放在嘴边
      // 手臂位置随着吹泡泡动作轻微摆动
      const handOffset = Math.sin(this.blowingPhase) * 2

      // 嘴部位置
      const mouthX = this.position.x + 8
      const mouthY = this.position.y - this.height * 0.65

      // 手的位置（拿着管子靠近嘴边，但更向外一些）
      const handX = mouthX + 15 // 向外移动手的位置
      const handY = mouthY + 10 + handOffset

      // 右手举着吹泡泡工具靠近嘴边
      this.p5.line(
        this.position.x, this.position.y - this.height * 0.5,
        handX, handY
      )

      // 左手放在腿上
      this.p5.line(
        this.position.x, this.position.y - this.height * 0.5,
        this.position.x - 20, this.position.y - this.height * 0.3
      )

      // 移除原来的圆形手表示，用线条表示手指
      this.p5.stroke(255)
      // 绘制简单的手指（几条小线）
      const fingerLength = 3
      // 拇指
      this.p5.line(
        handX, handY,
        handX - 2, handY - fingerLength
      )
      // 其他手指
      this.p5.line(
        handX, handY,
        handX + fingerLength, handY - 2
      )

      // 绘制吹泡泡工具（长细管子）- 从嘴到手，并超出手一点
      this.p5.stroke(180, 180, 220)
      this.p5.strokeWeight(1.5)

      // 管子超出手一点的末端
      const toolEndX = handX + 10
      const toolEndY = handY + 10

      // 只保留一段管子，从嘴边到手边，并超出手一点
      this.p5.line(
        mouthX, mouthY,
        toolEndX, toolEndY
      )
      this.bubble?.setPosition(toolEndX, toolEndY)

      // 绘制嘴巴（随着吹泡泡动作变化）
      this.p5.stroke(255)
      this.p5.strokeWeight(2)
      if (this.bubble) {
        // 吹气状态的嘴巴 - 圆形
        this.p5.ellipse(
          mouthX - 4,
          mouthY,
          5, 4
        )
      } else {
        // 普通状态的嘴巴
        this.p5.line(
          this.position.x, mouthY,
          mouthX - 3, mouthY
        )
      }
    } else {
      // 漂浮或下落状态，两只手臂向两侧
      this.p5.line(
        this.position.x, this.position.y - this.height * 0.5,
        this.position.x + 25, this.position.y - this.height * 0.4
      )
      this.p5.line(
        this.position.x, this.position.y - this.height * 0.5,
        this.position.x - 25, this.position.y - this.height * 0.4
      )

      // 闭合的嘴巴
      this.p5.line(
        this.position.x, this.position.y - this.height * 0.65,
        this.position.x + 5, this.position.y - this.height * 0.65
      )
    }

    // 腿部（坐姿）
    // 大腿
    this.p5.line(
      this.position.x, this.position.y - this.height * 0.3,
      this.position.x + 30, this.position.y
    )
    this.p5.line(
      this.position.x, this.position.y - this.height * 0.3,
      this.position.x - 30, this.position.y
    )

    // 小腿
    this.p5.line(
      this.position.x + 30, this.position.y,
      this.position.x + 25, this.position.y + this.height * 0.3
    )
    this.p5.line(
      this.position.x - 30, this.position.y,
      this.position.x - 25, this.position.y + this.height * 0.3
    )

    // 显示泡泡
    if (this.bubble) {
      this.bubble.display()
    }

    this.p5.pop()
  }
}

// 泡泡类
class Bubble {
  private position: Vector
  private radius: number
  private growSpeed: number
  private color: number[]
  private growthPhase: number = 0 // 用于控制生长动画

  constructor(private p5: P5CanvasInstance, x: number, y: number, radius: number, growSpeed: number) {
    this.position = p5.createVector(x, y)
    this.radius = radius
    this.growSpeed = growSpeed
    // 使用半透明的蓝色调
    this.color = [200, 220, 255, 100]
    this.growthPhase = 0
  }

  update() {
    // 泡泡增长，添加轻微的波动效果
    this.growthPhase += 0.1
    this.radius += this.growSpeed * (1 + Math.sin(this.growthPhase) * 0.1)
  }

  float() {
    // 泡泡上升
    this.position.y -= BUBBLE_FLOAT_SPEED
    // 轻微左右摆动
    this.position.x += this.p5.sin(this.p5.frameCount * 0.05) * 0.3
  }

  display() {
    this.p5.push()
    // 绘制泡泡
    this.p5.noFill()
    this.p5.stroke(this.color)
    this.p5.strokeWeight(1.5)
    this.p5.circle(this.position.x, this.position.y, this.radius * 2)

    // 绘制泡泡上的高光
    this.p5.stroke(255, 255, 255, 150)
    this.p5.arc(
      this.position.x - this.radius * 0.3,
      this.position.y - this.radius * 0.3,
      this.radius * 0.8,
      this.radius * 0.8,
      this.p5.PI * 0.8,
      this.p5.PI * 1.6,
      this.p5.OPEN
    )
    this.p5.pop()
  }

  getRadius() {
    return this.radius
  }

  getPosition() {
    return this.position.copy()
  }

  setPosition(x: number, y: number) {
    this.position.x = x
    this.position.y = y
  }
}

// 涟漪效果类
class Ripple {
  private radius: number
  private maxRadius: number
  private opacity: number
  private speed: number
  private color: number[]
  private isFinished: boolean = false

  constructor(private p5: P5CanvasInstance, private x: number, private y: number, initialRadius: number = 20) {
    this.radius = initialRadius
    this.maxRadius = initialRadius * 1.5
    this.opacity = 150
    this.speed = p5.random(3, 5)
    this.color = [200, 220, 255, this.opacity]
  }

  update() {
    this.radius += this.speed
    this.opacity -= 8

    if (this.radius > this.maxRadius || this.opacity <= 0) {
      this.isFinished = true
    }
  }

  display() {
    this.p5.push()
    this.p5.noFill()
    this.p5.stroke(this.color[0], this.color[1], this.color[2], this.opacity)
    this.p5.strokeWeight(2)
    this.p5.circle(this.x, this.y, this.radius * 2)

    // 添加一些随机小点表示破裂的泡沫
    for (let i = 0; i < 8; i++) {
      const angle = this.p5.random(this.p5.TWO_PI)
      const distance = this.p5.random(this.radius * 0.8, this.radius * 1.2)
      const x = this.x + Math.cos(angle) * distance
      const y = this.y + Math.sin(angle) * distance
      this.p5.stroke(this.color[0], this.color[1], this.color[2], this.opacity * 1.5)
      this.p5.point(x, y)
    }

    this.p5.pop()
  }

  isDone(): boolean {
    return this.isFinished
  }
}

// 涟漪管理器
class RippleManager {
  private ripples: Ripple[] = []
  private maxRipples = 10

  constructor(private p5: P5CanvasInstance) {}

  createRipple(x: number, y: number, initialRadius: number = 20) {
    if (this.ripples.length < this.maxRipples) {
      this.ripples.push(new Ripple(this.p5, x, y, initialRadius))
    }
  }

  update() {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].update()
      if (this.ripples[i].isDone()) {
        this.ripples.splice(i, 1)
      }
    }
  }

  display() {
    for (const ripple of this.ripples) {
      ripple.display()
    }
  }
}

let person: StickPerson
let rippleManager: RippleManager

function setup(p5: P5CanvasInstance) {
  p5.createCanvas(window.innerWidth, window.innerHeight)
  p5.colorMode(p5.RGB)
  p5.ellipseMode(p5.CENTER)

  // 创建人物坐在地面上
  person = new StickPerson(p5, 0, p5.height / 2 - FLOOR_HEIGHT + 40) // 调整位置以适应坐姿

  // 创建涟漪管理器
  rippleManager = new RippleManager(p5)
}

function draw(p5: P5CanvasInstance) {
  // 深色背景
  p5.background(20)

  // 移动原点到屏幕中心
  p5.translate(p5.width / 2, p5.height / 2)

  // 绘制地面
  p5.stroke(60)
  p5.strokeWeight(2)
  p5.line(-p5.width / 2, p5.height / 2 - FLOOR_HEIGHT, p5.width / 2, p5.height / 2 - FLOOR_HEIGHT)

  // 更新和显示涟漪
  rippleManager.update()
  rippleManager.display()

  // 更新和显示人物
  person.update()
  person.display()
}

function SlaveToDesire() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default SlaveToDesire
