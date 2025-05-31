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
const CRACK_APPEAR_DURATION = 5.0 // 裂痕出现持续时间（秒）
const BUBBLE_SPLIT_DURATION = 0.3 // 泡泡分裂持续时间（秒）
const BUBBLE_FADE_DURATION = 1.0 // 泡泡消散持续时间（秒）
const FLOAT_SWING_AMPLITUDE = 1.5 // 漂浮时左右晃动的幅度
const MIN_FLOAT_TIME = 12000 // 最小漂浮时间（毫秒）
const MAX_FLOAT_TIME = 20000 // 最大漂浮时间（毫秒）
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
  private fallStartY: number = 0 // 开始坠落时的Y位置

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

    // 更新颜色反转进度（即使在时间冻结期间也要更新）
    this.updateColorInversion()

    // 如果时间冻结，不更新人物物理状态
    if (bubbleCrackEffect.timeFreeze) {
      return
    }

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
      // 当下落时，逐渐恢复颜色 - 使用渐变而不是突变
      // 计算坠落进度：从开始坠落到着地的进度
      const groundY = this.p5.height / 2 - FLOOR_HEIGHT // 地面位置
      const totalFallDistance = Math.abs(groundY - this.fallStartY) // 总坠落距离（从开始坠落点到地面）
      const currentFallDistance = Math.abs(this.position.y - this.fallStartY) // 当前已坠落距离

      // 调试输出
      if (this.p5.frameCount % 30 === 0) { // 每30帧输出一次
        console.log(`坠落调试 - 当前Y: ${this.position.y.toFixed(1)}, 开始Y: ${this.fallStartY.toFixed(1)}, 地面Y: ${groundY.toFixed(1)}`)
        console.log(`总距离: ${totalFallDistance.toFixed(1)}, 已坠落: ${currentFallDistance.toFixed(1)}, 进度: ${(currentFallDistance / totalFallDistance).toFixed(2)}`)
        console.log(`颜色进度: ${colorInversionProgress.toFixed(2)}`)
      }

      // 如果总坠落距离很小，直接使用时间进度
      if (totalFallDistance < 50) {
        const fallDuration = 2.5 // 坠落时颜色恢复的持续时间（秒）
        colorInversionProgress = Math.max(1 - elapsedTime / fallDuration, 0)
      } else {
        // 基于位置的渐变：坠落进度越大，背景越暗
        const fallProgress = Math.min(currentFallDistance / totalFallDistance, 1)
        // 使用缓动函数让颜色变化更平滑 - 从亮色(1)渐变到暗色(0)
        const easedProgress = 1 - Math.pow(1 - fallProgress, 2) // ease-out
        colorInversionProgress = Math.max(1 - easedProgress, 0)
      }
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

      // 注意：不在这里切换状态，而是在泡泡效果完全结束后再切换
      // 状态切换逻辑移到updateBubbleCrackEffect的'fall'阶段
    }
  }

  // 开始坠落状态
  startFalling() {
    this.state = PersonState.FALLING
    this.lastStateChange = this.p5.millis()
    this.fallStartY = this.position.y // 记录坠落开始时的Y位置
    // 给予向下的初始速度
    this.velocity = this.p5.createVector(this.p5.random(-1, 1), 1)
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

    if (this.state === PersonState.FALLING) {
      // 坠落状态 - 完全重新绘制为平躺V型姿势

      // 1. 先绘制水平的身体（躯干）
      this.p5.line(
        this.position.x - 15, this.position.y - this.height * 0.3,
        this.position.x + 15, this.position.y - this.height * 0.3
      )

      // 2. 绘制向上抬起的头部
      // 头部圆形（向上偏移）
      this.p5.circle(
        this.position.x - 20, this.position.y - this.height * 0.55, // 头部向上抬起
        25
      )

      // 连接头部和身体的脖子
      this.p5.line(
        this.position.x - 15, this.position.y - this.height * 0.3,
        this.position.x - 20, this.position.y - this.height * 0.43
      )

      // 3. 绘制向上抬起的手臂
      // 左臂向上伸展
      this.p5.line(
        this.position.x - 10, this.position.y - this.height * 0.3,
        this.position.x - 30, this.position.y - this.height * 0.6
      )
      // 右臂向上伸展
      this.p5.line(
        this.position.x + 10, this.position.y - this.height * 0.3,
        this.position.x + 30, this.position.y - this.height * 0.6
      )

      // 4. 绘制向上抬起的腿部
      // 左大腿（从身体向上抬起）
      this.p5.line(
        this.position.x + 15, this.position.y - this.height * 0.3,
        this.position.x + 25, this.position.y - this.height * 0.6
      )
      // 右大腿（从身体向上抬起）
      this.p5.line(
        this.position.x + 15, this.position.y - this.height * 0.3,
        this.position.x + 35, this.position.y - this.height * 0.6
      )

      // 左小腿（继续向上）
      this.p5.line(
        this.position.x + 25, this.position.y - this.height * 0.6,
        this.position.x + 20, this.position.y - this.height * 0.8
      )
      // 右小腿（继续向上）
      this.p5.line(
        this.position.x + 35, this.position.y - this.height * 0.6,
        this.position.x + 30, this.position.y - this.height * 0.8
      )

      // 5. 张开的嘴巴（坠落时的惊恐表情）
      this.p5.ellipse(
        this.position.x - 20, this.position.y - this.height * 0.55,
        6, 8
      )
    } else {
      // 非坠落状态的正常绘制逻辑

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
        // 漂浮状态，两只手臂向两侧
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
    }

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
    this.rotationSpeed = p5.random(0.001, 0.003) * (p5.random() > 0.5 ? 1 : -1) // 随机旋转速度和方向
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

    // 限制泡泡的水平位置不超出屏幕边界
    const screenHalfWidth = this.p5.width / 2
    const bubbleRadius = this.radius
    // 考虑泡泡半径，确保整个泡泡都在屏幕内
    const leftBoundary = -screenHalfWidth + bubbleRadius
    const rightBoundary = screenHalfWidth - bubbleRadius

    // 将泡泡位置限制在边界内
    this.position.x = Math.max(leftBoundary, Math.min(rightBoundary, this.position.x))
    // 更新旋转角度
    this.rotationAngle += this.rotationSpeed
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

    // 创建径向渐变 - 水彩风格
    const gradient = ctx.createRadialGradient(
      x - radius * 0.2, y - radius * 0.3, 0, // 内圆心稍微偏移，半径为0
      x, y, radius // 外圆心和半径
    )

    // 根据泡泡的色相偏移选择基础颜色
    const baseHue = (this.hueOffset + p5.frameCount * 0.02) % 360

    // 定义关键颜色点（每60度一个关键点）
    const keyColors = [
      { h: 0, s: 60, l: 80 }, // 红色
      { h: 60, s: 55, l: 82 }, // 黄色
      { h: 120, s: 50, l: 78 }, // 绿色
      { h: 180, s: 45, l: 80 }, // 青色
      { h: 240, s: 55, l: 75 }, // 蓝色
      { h: 300, s: 60, l: 77 }, // 紫色
      { h: 360, s: 60, l: 80 } // 红色（循环）
    ]

    // 找到当前baseHue所在的区间并进行插值
    const colorIndex = Math.floor(baseHue / 60)
    const nextColorIndex = (colorIndex + 1) % 6
    const t = (baseHue % 60) / 60 // 插值因子 0-1

    // 在两个关键颜色之间插值
    const currentColor = keyColors[colorIndex]
    const nextColor = keyColors[nextColorIndex]

    // 线性插值函数
    const lerp = (start: number, end: number, t: number) => start + (end - start) * t

    // 插值得到基础颜色
    const interpolatedColor = {
      h: lerp(currentColor.h, nextColor.h, t),
      s: lerp(currentColor.s, nextColor.s, t),
      l: lerp(currentColor.l, nextColor.l, t)
    }

    // 基于插值后的颜色生成4个渐变层次
    const watercolorColors = [
      {
        h: interpolatedColor.h,
        s: Math.max(interpolatedColor.s - 15, 20),
        l: Math.min(interpolatedColor.l + 10, 90)
      }, // 最浅
      {
        h: interpolatedColor.h,
        s: interpolatedColor.s,
        l: interpolatedColor.l
      }, // 基础色
      {
        h: interpolatedColor.h,
        s: Math.min(interpolatedColor.s + 10, 80),
        l: Math.max(interpolatedColor.l - 10, 50)
      }, // 较深
      {
        h: interpolatedColor.h,
        s: Math.min(interpolatedColor.s + 20, 85),
        l: Math.max(interpolatedColor.l - 20, 40)
      } // 最深
    ]

    // 创建水彩风格的渐变停止点
    // 中心 - 最亮最透明
    gradient.addColorStop(0, `hsla(${watercolorColors[0].h}, ${watercolorColors[0].s}%, ${watercolorColors[0].l}%, 0.15)`)

    // 内圈 - 主色调
    gradient.addColorStop(0.3, `hsla(${watercolorColors[1].h}, ${watercolorColors[1].s}%, ${watercolorColors[1].l}%, 0.25)`)

    // 中圈 - 加深
    gradient.addColorStop(0.6, `hsla(${watercolorColors[2].h}, ${watercolorColors[2].s}%, ${watercolorColors[2].l}%, 0.35)`)

    // 外圈 - 最深
    gradient.addColorStop(0.85, `hsla(${watercolorColors[3].h}, ${watercolorColors[3].s}%, ${watercolorColors[3].l}%, 0.45)`)

    // 边缘 - 柔和边界
    gradient.addColorStop(1, `hsla(${watercolorColors[3].h}, ${watercolorColors[3].s + 10}%, ${watercolorColors[3].l - 10}%, 0.25)`)

    // 应用渐变
    ctx.fillStyle = gradient

    // 绘制填充圆形
    p5.noStroke()
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()

    // 添加内层柔光效果
    const innerGradient = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.4, 0,
      x - radius * 0.1, y - radius * 0.2, radius * 0.6
    )

    innerGradient.addColorStop(0, `hsla(${watercolorColors[0].h + 10}, ${watercolorColors[0].s - 10}%, ${Math.min(watercolorColors[0].l + 5, 95)}%, 0.2)`)
    innerGradient.addColorStop(0.7, `hsla(${watercolorColors[0].h + 10}, ${watercolorColors[0].s - 10}%, ${watercolorColors[0].l}%, 0.05)`)
    innerGradient.addColorStop(1, 'hsla(0, 0%, 100%, 0)')

    ctx.fillStyle = innerGradient
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

          // 在泡泡完全消散后，才切换人物状态为坠落
          person.startFalling()
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
  const crackColor = p5.color(255, 255, 255, 240)
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
  const dustParticlesPerHalf = 20 // 增加每半个泡泡生成的尘埃粒子数量

  p5.push()

  // 从左半泡泡位置生成尘埃
  for (let i = 0; i < dustParticlesPerHalf; i++) {
    const angle = p5.random(p5.TWO_PI)
    const distance = progress * radius * p5.random(0.8, 2.0) // 扩大扩散距离范围
    const x = bubbleCrackEffect.leftHalf.x + Math.cos(angle) * distance
    const y = bubbleCrackEffect.leftHalf.y + Math.sin(angle) * distance + progress * 40 // 增加下落距离
    const size = p5.random(1, 4) * (1 - progress) // 增加粒子大小范围

    // 尘埃颜色 - 更加细微和半透明
    const dustColor = p5.lerpColor(
      p5.color(180, 200, 220, opacity * 160),
      p5.color(60, 40, 30, opacity * 160),
      colorInversionProgress
    )
    p5.fill(dustColor)
    p5.noStroke()
    p5.circle(x, y, size)
  }

  // 从右半泡泡位置生成尘埃
  for (let i = 0; i < dustParticlesPerHalf; i++) {
    const angle = p5.random(p5.TWO_PI)
    const distance = progress * radius * p5.random(0.8, 2.0) // 扩大扩散距离范围
    const x = bubbleCrackEffect.rightHalf.x + Math.cos(angle) * distance
    const y = bubbleCrackEffect.rightHalf.y + Math.sin(angle) * distance + progress * 40 // 增加下落距离
    const size = p5.random(1, 4) * (1 - progress) // 增加粒子大小范围

    // 尘埃颜色 - 更加细微和半透明
    const dustColor = p5.lerpColor(
      p5.color(180, 200, 220, opacity * 160),
      p5.color(60, 40, 30, opacity * 160),
      colorInversionProgress
    )
    p5.fill(dustColor)
    p5.noStroke()
    p5.circle(x, y, size)
  }

  // 添加中等距离的尘埃粒子
  const mediumDustCount = 16
  for (let i = 0; i < mediumDustCount; i++) {
    // 在两半泡泡之间的区域生成一些额外尘埃
    const mixX = p5.lerp(bubbleCrackEffect.leftHalf.x, bubbleCrackEffect.rightHalf.x, p5.random())
    const mixY = p5.lerp(bubbleCrackEffect.leftHalf.y, bubbleCrackEffect.rightHalf.y, p5.random())

    const angle = p5.random(p5.TWO_PI)
    const distance = progress * radius * p5.random(0.5, 1.5) // 中等扩散距离
    const x = mixX + Math.cos(angle) * distance
    const y = mixY + Math.sin(angle) * distance + progress * 30
    const size = p5.random(0.8, 2.5) * (1 - progress)

    const dustColor = p5.lerpColor(
      p5.color(160, 180, 200, opacity * 120),
      p5.color(40, 30, 20, opacity * 120),
      colorInversionProgress
    )
    p5.fill(dustColor)
    p5.noStroke()
    p5.circle(x, y, size)
  }

  // 添加远距离的稀疏尘埃粒子
  const farDustCount = 12
  for (let i = 0; i < farDustCount; i++) {
    // 从原始破裂位置生成远距离尘埃
    const angle = p5.random(p5.TWO_PI)
    const distance = progress * radius * p5.random(1.5, 3.5) // 更远的扩散距离
    const x = bubbleCrackEffect.x + Math.cos(angle) * distance
    const y = bubbleCrackEffect.y + Math.sin(angle) * distance + progress * 50 // 更大的下落距离
    const size = p5.random(0.5, 1.8) * (1 - progress) // 更小的粒子

    // 远距离尘埃更加透明
    const dustColor = p5.lerpColor(
      p5.color(140, 160, 180, opacity * 80),
      p5.color(30, 25, 15, opacity * 80),
      colorInversionProgress
    )
    p5.fill(dustColor)
    p5.noStroke()
    p5.circle(x, y, size)
  }

  // 添加极远距离的微粒
  const veryFarDustCount = 8
  for (let i = 0; i < veryFarDustCount; i++) {
    const angle = p5.random(p5.TWO_PI)
    const distance = progress * radius * p5.random(2.0, 4.0) // 极远距离
    const x = bubbleCrackEffect.x + Math.cos(angle) * distance
    const y = bubbleCrackEffect.y + Math.sin(angle) * distance + progress * 60
    const size = p5.random(0.3, 1.0) * (1 - progress) // 极小粒子

    // 极远距离尘埃几乎透明
    const dustColor = p5.lerpColor(
      p5.color(120, 140, 160, opacity * 50),
      p5.color(20, 18, 12, opacity * 50),
      colorInversionProgress
    )
    p5.fill(dustColor)
    p5.noStroke()
    p5.circle(x, y, size)
  }

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
