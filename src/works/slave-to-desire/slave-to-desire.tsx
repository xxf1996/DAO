import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Color, Vector } from 'p5'

// 物理常量
const GRAVITY = 0.2
const AIR_RESISTANCE = 0.98
const BUBBLE_MIN_GROW_SPEED = 0.5
const BUBBLE_MAX_GROW_SPEED = 1.5
const BUBBLE_FLOAT_SPEED = 1
const FLOOR_HEIGHT = 150 // 距离底部的地面高度
const PERSON_HEIGHT = 100 // 将人物高度从60增加到100
const COLOR_INVERSION_DURATION = 1.0 // 颜色反转的过渡时间（秒）
const BURST_ANIMATION_DURATION = 1.2 // 爆炸动画持续时间（秒）
const FLOAT_SWING_AMPLITUDE = 0.8 // 漂浮时左右晃动的幅度
const MIN_FLOAT_TIME = 3000 // 最小漂浮时间（毫秒）
const MAX_FLOAT_TIME = 8000 // 最大漂浮时间（毫秒）

// 全局状态
let colorInversionProgress = 0 // 颜色反转的进度 (0-1)
let burstEffect = {
  active: false,
  progress: 0,
  x: 0,
  y: 0,
  radius: 0,
  startTime: 0
} // 爆炸效果状态

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
  private colorInversionTarget: number = 0 // 目标颜色反转值
  private lastStateChange: number = 0 // 上次状态变化的时间
  private floatDuration: number = 0 // 漂浮持续时间
  private floatStartTime: number = 0 // 开始漂浮的时间

  constructor(private p5: P5CanvasInstance, x: number, y: number) {
    this.position = p5.createVector(x, y)
    this.velocity = p5.createVector(0, 0)
    this.acceleration = p5.createVector(0, 0)
    this.height = PERSON_HEIGHT
    this.state = PersonState.BLOWING
    this.nextBubbleTime = p5.millis()
    this.blowingTool = p5.createVector(x + 15, y - this.height * 0.5) // 吹泡泡工具初始位置
    this.lastStateChange = p5.millis()
  }

  applyForce(force: Vector) {
    this.acceleration.add(force)
  }

  update() {
    this.animations.update(performance.now())

    // 更新颜色反转进度
    this.updateColorInversion()

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
          if (this.bubble.getRadius() > this.height * 1.2 && !this.bubble.isGrowing) {
            this.state = PersonState.FLOATING
            // 泡泡位置固定为人物头部的位置
            this.bubble.setPosition(this.position.x, this.position.y - this.height * 0.6)
            // 状态变化，开始颜色反转
            this.colorInversionTarget = 1
            this.lastStateChange = this.p5.millis()
            // 初始化漂浮时间
            this.floatDuration = this.p5.random(MIN_FLOAT_TIME, MAX_FLOAT_TIME)
            this.floatStartTime = this.p5.millis()
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

          // 检查泡泡是否触顶
          const bubbleTopEdge = this.bubble.getPosition().y - this.bubble.getRadius()
          const screenTopEdge = -this.p5.height / 2
          const marginFromTop = 20 // 屏幕顶部边缘的额外余量

          // 判断是否到达破裂时间
          const currentTime = this.p5.millis()
          const floatTimeElapsed = currentTime - this.floatStartTime

          if (bubbleTopEdge <= screenTopEdge + marginFromTop) {
            // 泡泡触顶，破裂
            this.popBubble()
          } else if (floatTimeElapsed >= this.floatDuration) {
            // 到达预定的漂浮时间，泡泡破裂
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
          this.lastStateChange = this.p5.millis()
        }

        // 重置加速度
        this.acceleration.mult(0)
        break
    }
  }

  updateColorInversion() {
    const elapsedTime = (this.p5.millis() - this.lastStateChange) / 1000 // 转换为秒
    if (this.state === PersonState.FLOATING) {
      // 当漂浮时，逐渐反转颜色
      colorInversionProgress = Math.min(elapsedTime / COLOR_INVERSION_DURATION, 1)
    } else if (this.state === PersonState.FALLING) {
      // 当下落时，逐渐恢复颜色
      colorInversionProgress = Math.max(1 - elapsedTime / COLOR_INVERSION_DURATION, 0)
    } else if (this.state === PersonState.BLOWING) {
      // 确保在吹泡泡状态颜色完全恢复
      colorInversionProgress = 0
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
      const bubbleRadius = this.bubble.getRadius()

      // 创建爆炸效果
      burstEffect = {
        active: true,
        progress: 0,
        x: bubblePos.x,
        y: bubblePos.y,
        radius: bubbleRadius,
        startTime: this.p5.millis()
      }

      // 创建涟漪效果
      rippleManager.createRipple(bubblePos.x, bubblePos.y, bubbleRadius)

      // 删除泡泡
      this.bubble = null

      // 改变状态为下落
      this.state = PersonState.FALLING
      this.lastStateChange = this.p5.millis()

      // 给予向下的初始速度
      this.velocity = this.p5.createVector(this.p5.random(-1, 1), 1)
    }
  }

  display() {
    this.p5.push()

    // 根据颜色反转进度计算当前颜色
    const strokeColor = this.p5.lerpColor(
      this.p5.color(255), // 原始颜色：白色
      this.p5.color(20), // 反转后颜色：接近黑色
      colorInversionProgress
    )

    this.p5.stroke(strokeColor)
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
      this.p5.stroke(strokeColor)
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
      const toolColor = this.p5.lerpColor(
        this.p5.color(180, 180, 220),
        this.p5.color(50, 50, 20),
        colorInversionProgress
      )
      this.p5.stroke(toolColor)
      this.p5.strokeWeight(1.5)

      // 管子超出手一点的末端
      const toolEndX = handX + 5
      const toolEndY = handY + 5

      // 只保留一段管子，从嘴边到手边，并超出手一点
      this.p5.line(
        mouthX, mouthY,
        toolEndX, toolEndY
      )
      this.bubble?.setPosition(toolEndX, toolEndY)

      // 绘制嘴巴（随着吹泡泡动作变化）
      this.p5.stroke(strokeColor)
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
  private initialRadius: number // 存储初始半径
  private targetRadius: number // 目标半径
  private growProgress: number = 0 // 生长进度

  constructor(private p5: P5CanvasInstance, x: number, y: number, radius: number, growSpeed: number) {
    this.position = p5.createVector(x, y)
    this.radius = radius
    this.initialRadius = radius // 保存初始半径
    this.targetRadius = p5.random(120, 160) // 设置目标半径
    this.growSpeed = growSpeed
    // 使用半透明的蓝色调
    this.color = [200, 220, 255, 100]
    this.growthPhase = 0
  }

  update() {
    // 使用ease-in曲线更新泡泡大小
    this.growthPhase += 0.1
    // 增加生长进度，但保持在0-1范围内
    this.growProgress = Math.min(this.growProgress + (this.growSpeed * 0.005), 1)
    // 使用Easing.Cubic.In函数创建ease-in效果
    const easedProgress = Easing.Cubic.InOut(this.growProgress)
    // 计算当前半径 = 初始半径 + (目标增长 * 缓动进度)
    this.radius = this.initialRadius + (this.targetRadius - this.initialRadius) * easedProgress
    // 添加轻微的波动效果
    this.radius *= (1 + Math.sin(this.growthPhase) * 0.05)
  }

  float() {
    // 泡泡上升
    this.position.y -= BUBBLE_FLOAT_SPEED
    // 增大左右摆动幅度，使用FLOAT_SWING_AMPLITUDE常量
    this.position.x += this.p5.sin(this.p5.frameCount * 0.05) * FLOAT_SWING_AMPLITUDE
  }

  display() {
    this.p5.push()
    // 绘制泡泡
    this.p5.noFill()

    // 根据颜色反转进度计算泡泡颜色
    const bubbleColor = this.p5.lerpColor(
      this.p5.color(this.color[0], this.color[1], this.color[2], this.color[3]),
      this.p5.color(50, 30, 20, this.color[3]),
      colorInversionProgress
    )

    this.p5.stroke(bubbleColor)
    this.p5.strokeWeight(1.5)
    this.p5.circle(this.position.x, this.position.y, this.radius * 2)

    // 绘制泡泡上的高光
    const highlightColor = this.p5.lerpColor(
      this.p5.color(255, 255, 255, 150),
      this.p5.color(50, 50, 50, 150),
      colorInversionProgress
    )

    this.p5.stroke(highlightColor)
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

  get isGrowing() {
    return this.growProgress < 1
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

    // 根据颜色反转进度计算当前涟漪颜色
    const rippleColor = this.p5.lerpColor(
      this.p5.color(this.color[0], this.color[1], this.color[2], this.opacity),
      this.p5.color(50, 30, 20, this.opacity),
      colorInversionProgress
    )

    this.p5.stroke(rippleColor)
    this.p5.strokeWeight(2)
    this.p5.circle(this.x, this.y, this.radius * 2)

    // 添加一些随机小点表示破裂的泡沫
    for (let i = 0; i < 8; i++) {
      const angle = this.p5.random(this.p5.TWO_PI)
      const distance = this.p5.random(this.radius * 0.8, this.radius * 1.2)
      const x = this.x + Math.cos(angle) * distance
      const y = this.y + Math.sin(angle) * distance

      // 小点也应用颜色反转
      const dotColor = this.p5.lerpColor(
        this.p5.color(this.color[0], this.color[1], this.color[2], this.opacity * 1.5),
        this.p5.color(50, 30, 20, this.opacity * 1.5),
        colorInversionProgress
      )

      this.p5.stroke(dotColor)
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
  p5.push() // 保存当前变换状态

  // 根据颜色反转进度计算背景颜色
  const bgColor = p5.lerpColor(
    p5.color(20), // 原始背景颜色：深色
    p5.color(235), // 反转后背景颜色：浅色
    colorInversionProgress
  )

  // 根据颜色反转进度计算地面颜色
  const floorColor = p5.lerpColor(
    p5.color(60), // 原始地面颜色
    p5.color(110), // 反转后地面颜色
    colorInversionProgress
  )

  // 设置背景颜色
  p5.background(bgColor)

  // 移动原点到屏幕中心
  p5.translate(p5.width / 2, p5.height / 2)

  // 判断是否需要绘制分裂效果
  if (burstEffect.active) {
    // 先绘制初始状态的画面（在最底层）
    if (burstEffect.progress > 0.5) {
      // 当分裂开始倒下时，显示初始状态内容
      p5.push()
      // 返回初始状态的背景
      p5.background(20)

      // 绘制初始状态的地面
      p5.stroke(60)
      p5.strokeWeight(2)
      p5.line(-p5.width / 2, p5.height / 2 - FLOOR_HEIGHT, p5.width / 2, p5.height / 2 - FLOOR_HEIGHT)

      // 由于是初始状态，所以我们只绘制基础内容
      // 这里可以考虑添加一些元素表示初始状态

      p5.pop()
    }

    // 当有分裂效果时，先更新爆炸效果
    updateBurstEffect(p5)

    // 在分裂的前半部分，仍然绘制正常内容
    if (burstEffect.progress < 0.5) {
      drawNormalContent(p5, floorColor)
    }

    // 绘制分裂的屏幕
    drawBurstEffect(p5)
  } else {
    // 正常绘制
    drawNormalContent(p5, floorColor)
  }

  p5.pop() // 恢复变换状态
}

// 绘制正常内容的函数
function drawNormalContent(p5: P5CanvasInstance, floorColor: Color) {
  // 绘制地面
  p5.stroke(floorColor)
  p5.strokeWeight(2)
  p5.line(-p5.width / 2, p5.height / 2 - FLOOR_HEIGHT, p5.width / 2, p5.height / 2 - FLOOR_HEIGHT)

  // 更新和显示涟漪
  rippleManager.update()
  rippleManager.display()

  // 更新和显示人物
  person.update()
  person.display()
}

// 更新爆炸效果
function updateBurstEffect(p5: P5CanvasInstance) {
  if (burstEffect.active) {
    const elapsedTime = (p5.millis() - burstEffect.startTime) / 1000
    burstEffect.progress = Math.min(elapsedTime / BURST_ANIMATION_DURATION, 1)

    if (burstEffect.progress >= 1) {
      burstEffect.active = false
    }
  }
}

// 绘制整屏裂开效果
function drawBurstEffect(p5: P5CanvasInstance) {
  if (burstEffect.active) {
    p5.push()

    // 计算屏幕分裂与倒塌的动画进度
    const splitProgress = Math.min(burstEffect.progress * 2, 1) // 前半段动画：屏幕分裂
    const fallProgress = burstEffect.progress > 0.5 ? (burstEffect.progress - 0.5) * 2 : 0 // 后半段动画：两侧倒下

    // 分裂的宽度
    const maxSeparation = p5.width * 0.1 // 控制分裂的最大宽度
    const separationDistance = Easing.Cubic.Out(splitProgress) * maxSeparation

    // 倒塌的角度 (0->90度)
    const maxFallAngle = p5.PI / 2 // 90度
    const leftFallAngle = Easing.Cubic.In(fallProgress) * maxFallAngle
    const rightFallAngle = -Easing.Cubic.In(fallProgress) * maxFallAngle

    // 绘制分裂线
    drawCrackLine(p5)

    // 绘制两侧屏幕内容
    drawHalfScreen(p5, -1, separationDistance, leftFallAngle, fallProgress) // 左半部分
    drawHalfScreen(p5, 1, separationDistance, rightFallAngle, fallProgress) // 右半部分

    p5.pop()
  }
}

// 绘制中间的裂缝线
function drawCrackLine(p5: P5CanvasInstance) {
  p5.push()
  p5.noFill()

  // 裂缝颜色
  const crackColor = p5.lerpColor(
    p5.color(255, 255, 255, 180),
    p5.color(20, 20, 20, 180),
    colorInversionProgress
  )

  p5.stroke(crackColor)
  p5.strokeWeight(2)

  // 使用噪声制造不规则的中央裂缝
  p5.beginShape()
  const screenHeight = p5.height
  const jaggedness = 5 // 锯齿度

  for (let y = -screenHeight / 2; y < screenHeight / 2; y += 20) {
    const xNoise = p5.noise(y * 0.02, p5.frameCount * 0.01) * jaggedness - jaggedness / 2
    p5.vertex(xNoise, y)
  }
  p5.endShape()

  p5.pop()
}

// 绘制屏幕的一半（带倒塌效果）
function drawHalfScreen(p5: P5CanvasInstance, side: number, separation: number, fallAngle: number, fallProgress: number) {
  p5.push()

  // 应用分裂位移
  p5.translate(side * separation / 2, 0)

  // 保存当前状态中心点作为倒塌的旋转原点
  if (side < 0) {
    // 左侧以右边缘为支点倒下
    p5.translate(p5.width / 2, 0)
    p5.rotate(fallAngle)
    p5.translate(-p5.width / 2, 0)
  } else {
    // 右侧以左边缘为支点倒下
    p5.translate(-p5.width / 2, 0)
    p5.rotate(fallAngle)
    p5.translate(p5.width / 2, 0)
  }

  // 随着倒塌进度增加透明度
  const opacity = 1 - fallProgress * 0.8

  // 绘制这一半的内容
  // 背景
  p5.noStroke()
  const bgColor = p5.lerpColor(
    p5.color(20), // 原始背景颜色：深色
    p5.color(235), // 反转后背景颜色：浅色
    colorInversionProgress
  )
  // 使用rgba格式设置填充色
  p5.fill(
    p5.red(bgColor),
    p5.green(bgColor),
    p5.blue(bgColor),
    255 * opacity
  )

  // 绘制矩形覆盖这一半屏幕
  if (side < 0) {
    // 左半屏
    p5.rect(-p5.width, -p5.height / 2, p5.width, p5.height)
  } else {
    // 右半屏
    p5.rect(0, -p5.height / 2, p5.width, p5.height)
  }

  // 绘制地面和其他内容
  const floorColor = p5.lerpColor(
    p5.color(60), // 原始地面颜色
    p5.color(110), // 反转后地面颜色
    colorInversionProgress
  )

  // 使用rgba格式设置线条颜色
  p5.stroke(
    p5.red(floorColor),
    p5.green(floorColor),
    p5.blue(floorColor),
    255 * opacity
  )
  p5.strokeWeight(2)

  // 地面线
  const floorY = p5.height / 2 - FLOOR_HEIGHT
  if (side < 0) {
    p5.line(-p5.width, floorY, 0, floorY)
  } else {
    p5.line(0, floorY, p5.width, floorY)
  }

  // 添加边缘的阴影效果，增强立体感
  p5.noStroke()
  if (side < 0) {
    // 左侧屏幕右边缘阴影
    const shadowGradient = p5.drawingContext.createLinearGradient(-5, 0, 5, 0)
    shadowGradient.addColorStop(0, `rgba(0,0,0,${0.5 * opacity})`)
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0)')
    p5.drawingContext.fillStyle = shadowGradient
    p5.rect(-5, -p5.height / 2, 10, p5.height)
  } else {
    // 右侧屏幕左边缘阴影
    const shadowGradient = p5.drawingContext.createLinearGradient(-5, 0, 5, 0)
    shadowGradient.addColorStop(0, 'rgba(0,0,0,0)')
    shadowGradient.addColorStop(1, `rgba(0,0,0,${0.5 * opacity})`)
    p5.drawingContext.fillStyle = shadowGradient
    p5.rect(-5, -p5.height / 2, 10, p5.height)
  }

  p5.pop()
}

function SlaveToDesire() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default SlaveToDesire
