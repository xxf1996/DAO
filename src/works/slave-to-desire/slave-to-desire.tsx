import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Color, Vector } from 'p5'

// 物理常量
const GRAVITY = 0.1 // 降低重力，让下落更慢
const AIR_RESISTANCE = 0.98
const BUBBLE_MIN_GROW_SPEED = 0.5
const BUBBLE_MAX_GROW_SPEED = 1.5
const BUBBLE_FLOAT_SPEED = 0.6
const FLOOR_HEIGHT = 100 // 距离底部的地面高度
const PERSON_HEIGHT = 80 // 将人物高度从60增加到100
const COLOR_INVERSION_DURATION = 1.0 // 颜色反转的过渡时间（秒）
const CRACK_APPEAR_DURATION = 10.0 // 裂痕出现持续时间（秒）
const BUBBLE_SPLIT_DURATION = 3.0 // 泡泡分裂持续时间（秒）
const BUBBLE_FADE_DURATION = 0.6 // 泡泡消散持续时间（秒）
const FLOAT_SWING_AMPLITUDE = 1.2 // 漂浮时左右晃动的幅度
const MIN_FLOAT_TIME = 15000 // 最小漂浮时间（毫秒）
const MAX_FLOAT_TIME = 30000 // 最大漂浮时间（毫秒）
const BUBBLE_REFRACTION = 0.2 // 泡泡折射率
const BUBBLE_GRADIENT_STOPS = 8 // 泡泡彩色膜的渐变停止点数量

// 全局状态
let colorInversionProgress = 0 // 颜色反转的进度 (0-1)
let bubbleCrackEffect = {
  active: false,
  phase: 'crack', // 'crack' | 'split' | 'fade' | 'fall'
  progress: 0,
  x: 0,
  y: 0,
  radius: 0,
  startTime: 0,
  crackPoints: [] as Array<{ x: number, y: number }>, // 裂痕路径点
  leftHalf: { x: 0, y: 0, velocityX: 0, velocityY: 0 }, // 左半泡泡位置和速度
  rightHalf: { x: 0, y: 0, velocityX: 0, velocityY: 0 }, // 右半泡泡位置和速度
  timeFreeze: false, // 时间是否冻结
  originalBubble: null as Bubble | null // 保存原始泡泡用于渲染
} // 泡泡破裂效果状态

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
    // 如果时间冻结，不更新人物状态
    if (bubbleCrackEffect.timeFreeze) {
      return
    }

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
      // 当下落时，逐渐恢复颜色 - 使用更长的时间让背景慢慢变暗
      const fallDuration = 3.0 // 下落时颜色恢复的持续时间（秒）
      colorInversionProgress = Math.max(1 - elapsedTime / fallDuration, 0)
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

      // 创建泡泡破裂效果
      bubbleCrackEffect = {
        active: true,
        phase: 'crack',
        progress: 0,
        x: bubblePos.x,
        y: bubblePos.y,
        radius: bubbleRadius,
        startTime: this.p5.millis(),
        crackPoints: [],
        leftHalf: { x: bubblePos.x, y: bubblePos.y, velocityX: -1, velocityY: 1 },
        rightHalf: { x: bubblePos.x, y: bubblePos.y, velocityX: 1, velocityY: 1 },
        timeFreeze: true,
        originalBubble: this.bubble
      }

      // 生成裂痕路径点
      this.generateCrackPath(bubblePos.x, bubblePos.y, bubbleRadius)

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

  // 生成裂痕路径点
  generateCrackPath(centerX: number, centerY: number, radius: number) {
    const points = []
    const startY = centerY - radius
    const endY = centerY + radius
    const steps = 20 // 裂痕路径点数量

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const y = startY + (endY - startY) * progress
      // 添加一些随机偏移让裂痕看起来更自然
      const xOffset = this.p5.random(-radius * 0.1, radius * 0.1) * Math.sin(progress * Math.PI)
      const x = centerX + xOffset
      points.push({ x, y })
    }

    bubbleCrackEffect.crackPoints = points
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
  private hueOffset: number // 泡泡的颜色偏移
  private membraneThickness: number // 泡泡膜的厚度
  private rotationAngle: number = 0 // 泡泡膜的旋转角度
  private rotationSpeed: number // 旋转速度
  private noiseOffset: number // 噪声偏移值，用于一维噪声
  private noiseScale: number // 噪声缩放比例

  constructor(private p5: P5CanvasInstance, x: number, y: number, radius: number, growSpeed: number) {
    this.position = p5.createVector(x, y)
    this.radius = radius
    this.initialRadius = radius // 保存初始半径
    this.targetRadius = p5.random(120, 160) // 设置目标半径
    this.growSpeed = growSpeed
    // 使用半透明的蓝色调
    this.color = [200, 220, 255, 100]
    this.growthPhase = 0
    // 初始化新增属性
    this.hueOffset = p5.random(360) // 随机颜色偏移
    this.membraneThickness = p5.random(1, 2) // 泡泡膜厚度
    this.rotationSpeed = p5.random(0.002, 0.005) * (p5.random() > 0.5 ? 1 : -1) // 随机旋转速度和方向
    // 噪声相关属性
    this.noiseOffset = p5.random(1000) // 为每个泡泡创建独特的噪声偏移
    this.noiseScale = p5.random(0.003, 0.008) // 噪声时间缩放，控制摆动频率
  }

  update() {
    // 使用ease-in曲线更新泡泡大小
    this.growthPhase += 0.1
    // 增加生长进度，但保持在0-1范围内
    this.growProgress = Math.min(this.growProgress + (this.growSpeed * 0.002), 1)
    // 使用Easing.Cubic.In函数创建ease-in效果
    const easedProgress = Easing.Cubic.InOut(this.growProgress)
    // 计算当前半径 = 初始半径 + (目标增长 * 缓动进度)
    this.radius = this.initialRadius + (this.targetRadius - this.initialRadius) * easedProgress
    // 添加轻微的波动效果
    this.radius *= (1 + Math.sin(this.growthPhase) * 0.05)

    // 更新旋转角度
    this.rotationAngle += this.rotationSpeed
  }

  float() {
    // 泡泡上升
    this.position.y -= BUBBLE_FLOAT_SPEED
    // 使用一维噪声实现更自然的左右摆动
    const noiseValue = this.p5.noise(this.p5.frameCount * this.noiseScale + this.noiseOffset)
    // 将噪声值从[0,1]映射到[-1,1]范围
    const swingOffset = (noiseValue - 0.5) * 2 * FLOAT_SWING_AMPLITUDE
    this.position.x += swingOffset
  }

  display() {
    const p5 = this.p5
    p5.push()

    // 泡泡位置与大小
    const x = this.position.x
    const y = this.position.y
    const r = this.radius

    // 根据颜色反转进度决定是否反转颜色
    const isInverted = colorInversionProgress > 0.5

    // 绘制彩色膜效果 - 使用多个同心圆和渐变效果
    // 首先绘制一个微弱的外发光
    p5.noStroke()
    const outerGlowColor = isInverted
      ? p5.color(50, 30, 20, 20) // 降低不透明度从30到20
      : p5.color(255, 255, 255, 20) // 降低不透明度从30到20

    // 绘制外发光
    p5.fill(outerGlowColor)
    p5.circle(x, y, r * 2 + 8)

    // 主体泡泡 - 使用填充渐变
    this.renderBubbleGradient(x, y, r)

    // 边缘光晕效果 - 使用细线
    p5.noFill()
    p5.strokeWeight(1)
    // 增加边缘透明度，从180降到120
    const edgeColor = p5.color(255, 255, 255, 120)

    p5.stroke(edgeColor)
    p5.circle(x, y, r * 2)

    // 绘制泡泡上的高光反射
    this.renderBubbleHighlights(x, y, r)

    p5.pop()
  }

  // 渲染泡泡的彩色膜渐变效果
  private renderBubbleGradient(x: number, y: number, radius: number) {
    const p5 = this.p5
    const ctx = p5.drawingContext as CanvasRenderingContext2D

    // 创建径向渐变
    const gradient = ctx.createRadialGradient(
      x + radius * 0.3, y - radius * 0.3, 0, // 内圆心和半径
      x, y, radius // 外圆心和半径
    )

    // 添加多个渐变色停止点，创建彩虹膜效果
    const baseHue = (this.hueOffset + p5.frameCount * 0.5) % 360

    // 使用HSL色彩空间创建彩虹色彩效果 - 不考虑颜色反转
    for (let i = 0; i < BUBBLE_GRADIENT_STOPS; i++) {
      const stop = i / (BUBBLE_GRADIENT_STOPS - 1)
      const hue = (baseHue + i * 30) % 360

      // 统一使用明亮的彩色方案，不考虑颜色反转
      const brightness = 80 - i * 5
      // 增加透明度，从原来的0.7降到0.4，使泡泡膜更通透
      gradient.addColorStop(stop, `hsla(${hue}, 80%, ${brightness}%, ${0.4 - stop * 0.2})`)
    }

    // 应用渐变
    ctx.fillStyle = gradient

    // 绘制填充圆形
    p5.noStroke()
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // 渲染泡泡上的高光反射
  private renderBubbleHighlights(x: number, y: number, radius: number) {
    const p5 = this.p5

    // 使用固定的高光颜色，不考虑颜色反转
    // 增加高光透明度，使其更明显且通透
    const highlightColor = p5.color(255, 255, 255, 220)

    p5.push()
    p5.noFill()
    p5.stroke(highlightColor)
    p5.strokeWeight(this.membraneThickness)

    // 添加旋转效果使高光动起来
    p5.translate(x, y)
    p5.rotate(this.rotationAngle)
    p5.translate(-x, -y)

    // 主高光 - 左上角弧形
    p5.arc(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.8,
      radius * 0.8,
      p5.PI * 0.8,
      p5.PI * 1.6,
      p5.OPEN
    )

    // 次高光 - 右下角小弧形
    p5.strokeWeight(this.membraneThickness * 0.7)
    p5.arc(
      x + radius * 0.4,
      y + radius * 0.4,
      radius * 0.4,
      radius * 0.4,
      p5.PI * 0.1,
      p5.PI * 0.6,
      p5.OPEN
    )

    p5.pop()
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
  person = new StickPerson(p5, 0, p5.height / 2 - FLOOR_HEIGHT) // 调整位置使腿部与地面对齐

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

  // 判断是否有泡泡破裂效果
  if (bubbleCrackEffect.active) {
    // 更新泡泡破裂效果
    updateBubbleCrackEffect(p5)

    // 在时间冻结期间，绘制静止画面
    if (bubbleCrackEffect.timeFreeze) {
      drawNormalContent(p5, floorColor)
      // 绘制泡泡破裂效果
      drawBubbleCrackEffect(p5)
    } else {
      // 时间恢复流动，正常绘制
      drawNormalContent(p5, floorColor)
    }
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

// 更新泡泡破裂效果
function updateBubbleCrackEffect(p5: P5CanvasInstance) {
  if (bubbleCrackEffect.active) {
    const elapsedTime = (p5.millis() - bubbleCrackEffect.startTime) / 1000

    switch (bubbleCrackEffect.phase) {
      case 'crack':
        // 裂痕出现阶段
        bubbleCrackEffect.progress = Math.min(elapsedTime / CRACK_APPEAR_DURATION, 1)
        if (bubbleCrackEffect.progress >= 1) {
          bubbleCrackEffect.phase = 'split'
          bubbleCrackEffect.startTime = p5.millis()
          bubbleCrackEffect.progress = 0
        }
        break

      case 'split':
        // 泡泡分裂阶段
        bubbleCrackEffect.progress = Math.min(elapsedTime / BUBBLE_SPLIT_DURATION, 1)

        // 更新两半泡泡的位置
        const gravity = 0.05
        bubbleCrackEffect.leftHalf.velocityY += gravity
        bubbleCrackEffect.rightHalf.velocityY += gravity

        bubbleCrackEffect.leftHalf.x += bubbleCrackEffect.leftHalf.velocityX
        bubbleCrackEffect.leftHalf.y += bubbleCrackEffect.leftHalf.velocityY
        bubbleCrackEffect.rightHalf.x += bubbleCrackEffect.rightHalf.velocityX
        bubbleCrackEffect.rightHalf.y += bubbleCrackEffect.rightHalf.velocityY

        if (bubbleCrackEffect.progress >= 1) {
          bubbleCrackEffect.phase = 'fade'
          bubbleCrackEffect.startTime = p5.millis()
          bubbleCrackEffect.progress = 0
        }
        break

      case 'fade':
        // 泡泡消散阶段
        bubbleCrackEffect.progress = Math.min(elapsedTime / BUBBLE_FADE_DURATION, 1)
        if (bubbleCrackEffect.progress >= 1) {
          bubbleCrackEffect.phase = 'fall'
          bubbleCrackEffect.timeFreeze = false // 解除时间冻结
          bubbleCrackEffect.active = false
        }
        break
    }
  }
}

// 绘制泡泡破裂效果
function drawBubbleCrackEffect(p5: P5CanvasInstance) {
  if (!bubbleCrackEffect.active) return

  p5.push()

  const { x, y, radius, phase, progress } = bubbleCrackEffect

  switch (phase) {
    case 'crack':
      // 绘制完整的泡泡和逐渐出现的裂痕
      if (bubbleCrackEffect.originalBubble) {
        bubbleCrackEffect.originalBubble.display()
      }
      drawBubbleCrack(p5, x, y, radius, progress)
      break

    case 'split':
      // 绘制分裂的两半泡泡
      drawSplittingBubbleHalves(p5, radius, progress)
      break

    case 'fade':
      // 绘制消散的泡泡碎片
      drawFadingBubbleFragments(p5, x, y, radius, progress)
      break
  }

  p5.pop()
}

// 绘制泡泡裂痕
function drawBubbleCrack(p5: P5CanvasInstance, centerX: number, centerY: number, radius: number, progress: number) {
  if (bubbleCrackEffect.crackPoints.length === 0) return

  p5.push()
  p5.noFill()

  // 裂痕颜色 - 深色，确保与背景有对比
  const crackColor = p5.color(180, 180, 180, 120)
  p5.stroke(crackColor)
  p5.strokeWeight(1)

  // 绘制裂痕路径，根据进度逐渐显示
  const visiblePoints = Math.floor(bubbleCrackEffect.crackPoints.length * progress)

  p5.beginShape()
  p5.noFill()
  for (let i = 0; i < visiblePoints; i++) {
    const point = bubbleCrackEffect.crackPoints[i]
    if (i === 0) {
      p5.vertex(point.x, point.y)
    } else {
      p5.vertex(point.x, point.y)
    }
  }
  p5.endShape()

  p5.pop()
}

// 绘制分裂中的泡泡两半
function drawSplittingBubbleHalves(p5: P5CanvasInstance, radius: number, progress: number) {
  const opacity = 1 - progress * 0.3

  p5.push()

  // 左半泡泡
  p5.push()
  drawHalfBubbleWithCrack(p5, bubbleCrackEffect.leftHalf.x, bubbleCrackEffect.leftHalf.y, radius, 'left', opacity)
  p5.pop()

  // 右半泡泡
  p5.push()
  drawHalfBubbleWithCrack(p5, bubbleCrackEffect.rightHalf.x, bubbleCrackEffect.rightHalf.y, radius, 'right', opacity)
  p5.pop()

  p5.pop()
}

// 绘制消散的泡泡碎片
function drawFadingBubbleFragments(p5: P5CanvasInstance, centerX: number, centerY: number, radius: number, progress: number) {
  const opacity = 1 - progress
  const fragmentCount = 8

  p5.push()

  for (let i = 0; i < fragmentCount; i++) {
    const angle = (i / fragmentCount) * p5.TWO_PI
    const distance = progress * radius * 0.8
    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance
    const size = radius * 0.2 * (1 - progress)

    // 碎片颜色 - 带点深色
    const fragmentColor = p5.color(80, 80, 120, opacity * 150)
    p5.fill(fragmentColor)
    p5.noStroke()
    p5.circle(x, y, size)
  }

  p5.pop()
}

// 绘制半个泡泡
function drawHalfBubble(p5: P5CanvasInstance, centerX: number, centerY: number, radius: number, side: 'left' | 'right', opacity: number) {
  p5.push()

  // 创建遮罩效果来显示半个泡泡
  const ctx = p5.drawingContext as CanvasRenderingContext2D
  ctx.save()

  // 设置裁剪区域
  ctx.beginPath()
  if (side === 'left') {
    ctx.rect(centerX - radius, centerY - radius, radius, radius * 2)
  } else {
    ctx.rect(centerX, centerY - radius, radius, radius * 2)
  }
  ctx.clip()

  // 绘制泡泡（使用简化版本）
  const bubbleColor = p5.color(200, 220, 255, opacity * 100)
  p5.fill(bubbleColor)
  p5.stroke(255, 255, 255, opacity * 150)
  p5.strokeWeight(1)
  p5.circle(centerX, centerY, radius * 2)

  ctx.restore()
  p5.pop()
}

// 绘制带有裂痕边界的半个泡泡
function drawHalfBubbleWithCrack(p5: P5CanvasInstance, centerX: number, centerY: number, radius: number, side: 'left' | 'right', opacity: number) {
  p5.push()

  // 创建裁剪路径，使用裂痕形状作为边界
  const ctx = p5.drawingContext as CanvasRenderingContext2D
  ctx.save()

  if (bubbleCrackEffect.crackPoints.length > 0) {
    // 使用裂痕路径创建裁剪区域
    const crackPoints = bubbleCrackEffect.crackPoints
    const originalCenterX = bubbleCrackEffect.x
    const originalCenterY = bubbleCrackEffect.y
    const originalRadius = bubbleCrackEffect.radius

    // 计算当前半泡泡相对于原始泡泡的偏移
    const offsetX = centerX - originalCenterX
    const offsetY = centerY - originalCenterY

    ctx.beginPath()

    if (side === 'left') {
      // 左半部分：从泡泡顶部开始，沿左半圆弧到底部
      const startAngle = -Math.PI / 2
      const endAngle = Math.PI / 2

      // 应用偏移后绘制左半圆弧
      ctx.arc(originalCenterX + offsetX, originalCenterY + offsetY, originalRadius, startAngle, endAngle, false)

      // 沿着裂痕路径返回（从下到上），应用偏移
      for (let i = crackPoints.length - 1; i >= 0; i--) {
        ctx.lineTo(crackPoints[i].x + offsetX, crackPoints[i].y + offsetY)
      }
    } else {
      // 右半部分：从裂痕路径开始，到右半圆弧

      // 从裂痕路径开始（从上到下），应用偏移
      ctx.moveTo(crackPoints[0].x + offsetX, crackPoints[0].y + offsetY)
      for (let i = 1; i < crackPoints.length; i++) {
        ctx.lineTo(crackPoints[i].x + offsetX, crackPoints[i].y + offsetY)
      }

      // 沿着右半圆弧返回到起点，应用偏移
      const startAngle = Math.PI / 2
      const endAngle = -Math.PI / 2
      ctx.arc(originalCenterX + offsetX, originalCenterY + offsetY, originalRadius, startAngle, endAngle, false)
    }

    ctx.closePath()
  } else {
    // 如果没有裂痕点，使用简单的半圆
    ctx.beginPath()
    if (side === 'left') {
      ctx.rect(centerX - radius, centerY - radius, radius, radius * 2)
    } else {
      ctx.rect(centerX, centerY - radius, radius, radius * 2)
    }
    ctx.closePath()
  }

  ctx.clip()

  // 绘制完整的泡泡效果
  if (bubbleCrackEffect.originalBubble) {
    // 保存原始位置
    const originalX = bubbleCrackEffect.originalBubble.getPosition().x
    const originalY = bubbleCrackEffect.originalBubble.getPosition().y

    // 移动泡泡到当前半泡泡位置
    bubbleCrackEffect.originalBubble.setPosition(centerX, centerY)

    // 绘制泡泡
    bubbleCrackEffect.originalBubble.display()

    // 恢复原始位置
    bubbleCrackEffect.originalBubble.setPosition(originalX, originalY)
  }

  ctx.restore()
  p5.pop()
}

function SlaveToDesire() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default SlaveToDesire
