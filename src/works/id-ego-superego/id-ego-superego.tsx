import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Vector } from 'p5'

// 物理常量
const GRAVITY = 0.3
const FRICTION = 0.98
const RESTITUTION = 0.6
// 增加天平灵敏度
const BALANCE_SENSITIVITY = 0.02
// 小球之间的弹性系数
const BALL_RESTITUTION = 0.7
/** 侧向力系数 */
const SIDE_FORCE_FACTOR = 5.5
/** 震动系数 */
const SHAKING_FACTOR = 1.8
// 调试模式
let debugMode = false
const leftKeywords = [
  '快',
  '欲望',
  '冲动',
  '本能',
  '💩',
  '乡愿',
  '逃避',
  '懒惰',
  '拖延',
  '纵容',
  '惯性',
  '抱怨',
  '计较',
  '自私',
  '贪婪',
  '嫉妒',
  '傲慢',
  '偏见',
  '恐惧',
  '焦虑',
  '抑郁',
  '绝望',
  '麻木',
]
const rightKeywords = [
  '慢',
  '理性',
  '逻辑',
  '意识',
  '健康',
  '自律',
  '计划',
  '知足',
  '思考',
  '实践',
  '付出',
  '行动',
  '😊'
]

// 增加12个系列配色，适合深色背景，亮度适中，彼此有明显对比
const ballColors = [
  [120, 160, 220], // 淡蓝色
  [220, 120, 170], // 粉红色
  [160, 220, 140], // 淡绿色
  [220, 190, 120], // 淡橙色
  [160, 140, 220], // 淡紫色
  [220, 150, 120], // 珊瑚色
  [120, 170, 160], // 青绿色
  [190, 140, 180], // 淡紫红色
  [180, 200, 130], // 黄绿色
  [150, 130, 190], // 蓝紫色
  [200, 160, 130], // 棕橙色
  [130, 200, 190] // 蓝绿色
]

// 涟漪效果类
class Ripple {
  private radius: number
  private maxRadius: number
  private opacity: number
  private speed: number
  private color: number[]
  private isFinished: boolean = false

  constructor(private p5: P5CanvasInstance, private x: number, private y: number, private initialRadius: number = 10) {
    this.radius = initialRadius
    this.maxRadius = p5.random(100, 200)
    this.opacity = p5.random(30, 60)
    this.speed = p5.random(2, 4)

    // 使用与小球相近的颜色，但更透明
    this.color = [
      p5.random(150, 230),
      p5.random(150, 230),
      p5.random(180, 250),
      this.opacity
    ]
  }

  update() {
    this.radius += this.speed
    this.opacity -= 2

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
    this.p5.pop()
  }

  isDone(): boolean {
    return this.isFinished
  }
}

// 天平类
class Balance {
  private animations = new Group()
  private angle = 0
  private targetAngle = 0
  private readonly pivotX: number
  private readonly pivotY: number
  private readonly beamLength: number
  private readonly beamHeight: number
  private readonly plateWidth: number
  private readonly plateHeight: number
  private leftMass = 0
  private rightMass = 0
  // 添加震动效果变量
  private shakeIntensity = 0
  private shakeDecay = 0.9
  private leftPlateColor
  private rightPlateColor

  constructor(private p5: P5CanvasInstance) {
    this.pivotX = 0
    this.pivotY = 0
    this.beamLength = 500
    this.beamHeight = 5
    this.plateWidth = 200
    this.plateHeight = 100 // 盘子深度
    this.leftPlateColor = p5.color('#ff3366')
    this.rightPlateColor = p5.color('#3366ff')
  }

  private animation() {
    this.animations.update(performance.now())

    // 基于左右质量差计算目标角度，增加敏感度
    const massDiff = this.rightMass - this.leftMass
    this.targetAngle = Math.max(Math.min(massDiff * BALANCE_SENSITIVITY, Math.PI / 5), -Math.PI / 5)

    // 角度渐进变化，模拟物理惯性
    this.angle += (this.targetAngle - this.angle) * 0.05

    // 震动效果衰减
    if (this.shakeIntensity > 0.01) {
      this.shakeIntensity *= this.shakeDecay
    } else {
      this.shakeIntensity = 0
    }
  }

  // 获取左盘位置（相对于世界坐标）
  getLeftPlatePos(): Vector {
    const pivotX = this.pivotX
    const pivotY = this.pivotY
    const leftX = -this.beamLength / 2
    const leftY = 0
    // 计算旋转后的位置
    const worldX = pivotX + leftX * Math.cos(this.angle) - leftY * Math.sin(this.angle)
    const worldY = pivotY + leftX * Math.sin(this.angle) + leftY * Math.cos(this.angle)
    return this.p5.createVector(worldX, worldY)
  }

  // 获取右盘位置（相对于世界坐标）
  getRightPlatePos(): Vector {
    const pivotX = this.pivotX
    const pivotY = this.pivotY
    const rightX = this.beamLength / 2
    const rightY = 0
    // 计算旋转后的位置
    const worldX = pivotX + rightX * Math.cos(this.angle) - rightY * Math.sin(this.angle)
    const worldY = pivotY + rightX * Math.sin(this.angle) + rightY * Math.cos(this.angle)
    return this.p5.createVector(worldX, worldY)
  }

  // 获取左盘角度
  getLeftPlateAngle(): number {
    return this.angle
  }

  // 获取右盘角度
  getRightPlateAngle(): number {
    return -this.angle
  }

  // 获取左盘容器的四个顶点坐标（开口朝上）
  getLeftPlateCorners(): Vector[] {
    // 从天平支点计算左盘的位置
    const pivotX = this.pivotX
    const pivotY = this.pivotY
    const leftLocalX = -this.beamLength / 2
    const leftLocalY = 0

    // 计算旋转后的世界坐标
    const cosAngle = Math.cos(this.angle)
    const sinAngle = Math.sin(this.angle)
    const plateX = pivotX + leftLocalX * cosAngle - leftLocalY * sinAngle
    const plateY = pivotY + leftLocalX * sinAngle + leftLocalY * cosAngle

    // 容器的四个顶点（在本地坐标系中）
    const halfWidth = this.plateWidth / 2
    const points = [
      [-halfWidth, 0], // 左下
      [halfWidth, 0], // 右下
      [halfWidth, -this.plateHeight], // 右上
      [-halfWidth, -this.plateHeight] // 左上
    ]

    // 将顶点从本地坐标系转换到世界坐标系
    return points.map(([x, y]) => {
      // 先旋转，再平移
      const worldX = plateX + x * cosAngle - y * sinAngle
      const worldY = plateY + x * sinAngle + y * cosAngle
      return this.p5.createVector(worldX, worldY)
    })
  }

  // 获取右盘容器的四个顶点坐标（开口朝上）
  getRightPlateCorners(): Vector[] {
    // 从天平支点计算右盘的位置
    const pivotX = this.pivotX
    const pivotY = this.pivotY
    const rightLocalX = this.beamLength / 2
    const rightLocalY = 0

    // 计算旋转后的世界坐标
    const cosAngle = Math.cos(this.angle)
    const sinAngle = Math.sin(this.angle)
    const plateX = pivotX + rightLocalX * cosAngle - rightLocalY * sinAngle
    const plateY = pivotY + rightLocalX * sinAngle + rightLocalY * cosAngle

    // 容器的四个顶点（在本地坐标系中）
    const halfWidth = this.plateWidth / 2
    const points = [
      [-halfWidth, 0], // 左下
      [halfWidth, 0], // 右下
      [halfWidth, -this.plateHeight], // 右上
      [-halfWidth, -this.plateHeight] // 左上
    ]

    // 将顶点从本地坐标系转换到世界坐标系
    return points.map(([x, y]) => {
      // 先旋转，再平移
      const worldX = plateX + x * cosAngle - y * sinAngle
      const worldY = plateY + x * sinAngle + y * cosAngle
      return this.p5.createVector(worldX, worldY)
    })
  }

  // 添加质量到左盘，并触发震动
  addLeftMass(mass: number, impact: number) {
    this.leftMass += mass
    this.shake(impact * SHAKING_FACTOR)
  }

  // 添加质量到右盘，并触发震动
  addRightMass(mass: number, impact: number) {
    this.rightMass += mass
    this.shake(impact * SHAKING_FACTOR)
  }

  // 从左盘移除质量
  removeLeftMass(mass: number) {
    this.leftMass = Math.max(0, this.leftMass - mass)
    // 轻微震动表示质量移除
    this.shake(0.05 * SHAKING_FACTOR)
  }

  // 从右盘移除质量
  removeRightMass(mass: number) {
    this.rightMass = Math.max(0, this.rightMass - mass)
    // 轻微震动表示质量移除
    this.shake(0.05 * SHAKING_FACTOR)
  }

  // 添加震动效果
  shake(intensity: number) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 0.35)
  }

  // 获取盘子的宽度和高度
  getPlateSize() {
    return {
      width: this.plateWidth,
      height: this.plateHeight
    }
  }

  display() {
    this.animation()

    this.p5.push()

    // 添加震动效果
    const shakeX = this.p5.random(-this.shakeIntensity, this.shakeIntensity) * 10
    const shakeY = this.p5.random(-this.shakeIntensity, this.shakeIntensity) * 5

    // 绘制支架 - 极简风格
    this.p5.stroke(220)
    this.p5.strokeWeight(3)
    this.p5.line(this.pivotX, this.pivotY, this.pivotX, this.pivotY + 180)

    // 根据天平角度计算底座曲线的控制点高度
    // 角度为正时（右侧下沉），底座呈现苦脸（向下弧）
    // 角度为负时（左侧下沉），底座呈现笑脸（向上弧）
    const maxCurvature = 120 // 最大曲率
    const curvature = this.angle * (maxCurvature / (Math.PI / 5)) // 根据最大倾斜角度缩放

    // 绘制底座曲线 - 分为两段确保中点连接在支架底部
    this.p5.push()
    this.p5.noFill()
    this.p5.stroke(220)
    this.p5.strokeWeight(3)

    // 左半部分曲线
    this.p5.beginShape()
    this.p5.vertex(this.pivotX - 120, this.pivotY + 180)
    this.p5.quadraticVertex(
      this.pivotX - 60, this.pivotY + 180 + curvature,
      this.pivotX, this.pivotY + 180
    )
    this.p5.endShape()

    // 右半部分曲线
    this.p5.beginShape()
    this.p5.vertex(this.pivotX, this.pivotY + 180)
    this.p5.quadraticVertex(
      this.pivotX + 60, this.pivotY + 180 + curvature,
      this.pivotX + 120, this.pivotY + 180
    )
    this.p5.endShape()

    // 调试模式下，显示支架底部连接点
    if (debugMode) {
      this.p5.fill(255, 0, 0)
      this.p5.noStroke()
      this.p5.ellipse(this.pivotX, this.pivotY + 180, 5, 5)
    }

    this.p5.pop()

    // 旧的直线底座代码，已被上面的曲线替代
    // this.p5.line(this.pivotX - 120, this.pivotY + 180, this.pivotX + 120, this.pivotY + 180)

    // 绘制天平整体（横梁和容器）
    this.p5.push()
    this.p5.translate(this.pivotX + shakeX, this.pivotY + shakeY)
    this.p5.rotate(this.angle)

    // 绘制横梁
    this.p5.stroke(240)
    this.p5.strokeWeight(this.beamHeight)
    this.p5.line(-this.beamLength / 2, 0, this.beamLength / 2, 0)

    // 绘制左盘容器
    this.p5.stroke(this.leftPlateColor)
    // this.p5.strokeWeight(2)
    // this.p5.noFill()

    // 左容器
    const leftX = -this.beamLength / 2
    const leftY = 0
    // 绘制左容器三条边，不绘制底边
    this.p5.line(leftX - this.plateWidth / 2, leftY, leftX + this.plateWidth / 2, leftY) // 顶边
    this.p5.line(leftX - this.plateWidth / 2, leftY, leftX - this.plateWidth / 2, leftY - this.plateHeight) // 左边
    this.p5.line(leftX + this.plateWidth / 2, leftY, leftX + this.plateWidth / 2, leftY - this.plateHeight) // 右边

    this.p5.stroke(this.rightPlateColor)
    // 右容器
    const rightX = this.beamLength / 2
    const rightY = 0
    // 绘制右容器三条边，不绘制底边
    this.p5.line(rightX - this.plateWidth / 2, rightY, rightX + this.plateWidth / 2, rightY) // 顶边
    this.p5.line(rightX - this.plateWidth / 2, rightY, rightX - this.plateWidth / 2, rightY - this.plateHeight) // 左边
    this.p5.line(rightX + this.plateWidth / 2, rightY, rightX + this.plateWidth / 2, rightY - this.plateHeight) // 右边

    // 调试模式：显示容器的轮廓
    if (debugMode) {
      // 绘制左容器完整轮廓
      this.p5.push()
      this.p5.stroke(255, 0, 0, 120) // 半透明红色
      this.p5.strokeWeight(1)
      this.p5.noFill()
      this.p5.beginShape()
      this.p5.vertex(leftX - this.plateWidth / 2, leftY)
      this.p5.vertex(leftX + this.plateWidth / 2, leftY)
      this.p5.vertex(leftX + this.plateWidth / 2, leftY - this.plateHeight)
      this.p5.vertex(leftX - this.plateWidth / 2, leftY - this.plateHeight)
      this.p5.endShape(this.p5.CLOSE)

      // 显示左容器的碰撞点
      const leftCorners = this.getLeftPlateCorners()
      this.p5.fill(255, 0, 0)
      for (const corner of leftCorners) {
        const localX = corner.x - (this.pivotX + shakeX)
        const localY = corner.y - (this.pivotY + shakeY)
        const rotatedX = localX * Math.cos(-this.angle) - localY * Math.sin(-this.angle)
        const rotatedY = localX * Math.sin(-this.angle) + localY * Math.cos(-this.angle)
        this.p5.ellipse(rotatedX, rotatedY, 10, 10)
      }
      this.p5.pop()

      // 绘制右容器完整轮廓
      this.p5.push()
      this.p5.stroke(0, 0, 255, 120) // 半透明蓝色
      this.p5.strokeWeight(1)
      this.p5.noFill()
      this.p5.beginShape()
      this.p5.vertex(rightX - this.plateWidth / 2, rightY)
      this.p5.vertex(rightX + this.plateWidth / 2, rightY)
      this.p5.vertex(rightX + this.plateWidth / 2, rightY - this.plateHeight)
      this.p5.vertex(rightX - this.plateWidth / 2, rightY - this.plateHeight)
      this.p5.endShape(this.p5.CLOSE)

      // 显示右容器的碰撞点
      const rightCorners = this.getRightPlateCorners()
      this.p5.fill(0, 0, 255)
      for (const corner of rightCorners) {
        const localX = corner.x - (this.pivotX + shakeX)
        const localY = corner.y - (this.pivotY + shakeY)
        const rotatedX = localX * Math.cos(-this.angle) - localY * Math.sin(-this.angle)
        const rotatedY = localX * Math.sin(-this.angle) + localY * Math.cos(-this.angle)
        this.p5.ellipse(rotatedX, rotatedY, 10, 10)
      }
      this.p5.pop()

      // 显示质量信息
      this.p5.push()
      this.p5.fill(255)
      this.p5.noStroke()
      this.p5.textSize(12)
      this.p5.textAlign(this.p5.CENTER)
      this.p5.text(`左质量: ${this.leftMass.toFixed(2)}`, leftX, leftY - this.plateHeight - 10)
      this.p5.text(`右质量: ${this.rightMass.toFixed(2)}`, rightX, rightY - this.plateHeight - 10)
      this.p5.pop()
    }

    this.p5.pop()

    // 绘制支点
    this.p5.fill(240)
    this.p5.noStroke()
    this.p5.ellipse(this.pivotX + shakeX, this.pivotY + shakeY, 12, 12)

    this.p5.pop()
  }

  // 判断点是否在多边形内
  isPointInPolygon(point: Vector, corners: Vector[]): boolean {
    let inside = false
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const xi = corners[i].x, yi = corners[i].y
      const xj = corners[j].x, yj = corners[j].y

      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  // 检查球与天平线段的碰撞
  checkBallBeamCollision(ball: Ball): boolean {
    // 计算横梁的两个端点（考虑震动和旋转）
    const shakeX = this.p5.random(-this.shakeIntensity, this.shakeIntensity) * 10
    const shakeY = this.p5.random(-this.shakeIntensity, this.shakeIntensity) * 5

    const startX = this.pivotX + shakeX - this.beamLength / 2 * Math.cos(this.angle)
    const startY = this.pivotY + shakeY + this.beamLength / 2 * Math.sin(this.angle)

    const endX = this.pivotX + shakeX + this.beamLength / 2 * Math.cos(this.angle)
    const endY = this.pivotY + shakeY - this.beamLength / 2 * Math.sin(this.angle)

    const ballPos = ball.getPosition()

    // 计算球到线段的最短距离
    const dist = this.distToSegment(
      ballPos.x, ballPos.y,
      startX, startY,
      endX, endY
    )

    // 如果距离小于球半径+横梁半高，则发生碰撞
    if (dist < ball.getRadius() + this.beamHeight / 2) {
      return true
    }

    return false
  }

  // 计算点到线段的最短距离
  private distToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    const a = x - x1
    const b = y - y1
    const c = x2 - x1
    const d = y2 - y1

    const dot = a * c + b * d
    const lenSq = c * c + d * d
    let param = -1

    if (lenSq !== 0) {
      param = dot / lenSq
    }

    let xx, yy

    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * c
      yy = y1 + param * d
    }

    const dx = x - xx
    const dy = y - yy

    return Math.sqrt(dx * dx + dy * dy)
  }

  // 检查球与容器碰撞的方法
  checkBallPlateCollision(ball: Ball): boolean {
    // 检查左盘
    const leftCorners = this.getLeftPlateCorners()
    if (this.isPointInPolygon(ball.getPosition(), leftCorners)) {
      if (!ball.isOnPlate()) {
        ball.setOnLeftPlate(true)
        return true
      }
      return true
    }

    // 检查右盘
    const rightCorners = this.getRightPlateCorners()
    if (this.isPointInPolygon(ball.getPosition(), rightCorners)) {
      if (!ball.isOnPlate()) {
        ball.setOnRightPlate(true)
        return true
      }
      return true
    }

    return false
  }
}

// 小球类
class Ball {
  private readonly radius: number
  private readonly mass: number
  private readonly color: number[]
  private position: Vector
  private velocity: Vector
  private acceleration: Vector
  private isOnLeftPlate = false
  private isOnRightPlate = false
  private impactVelocity = 0
  private plateReference: Vector | null = null // 相对于盘中心的位置参考
  private isContained = false // 是否已经被容器装住
  private disappearTime: number // 小球消失时间
  private creationTime: number // 小球创建时间
  private keyword: string // 显示在小球内的关键词

  constructor(private p5: P5CanvasInstance, x: number, y: number, radius: number, keyword: string = '') {
    this.position = p5.createVector(x, y)
    this.velocity = p5.createVector(0, 0)
    this.acceleration = p5.createVector(0, 0)
    this.radius = radius
    this.mass = radius * radius * 0.01 // 质量与半径平方成正比
    // 从预定义的系列色中随机选择一个颜色
    this.color = [...ballColors[Math.floor(p5.random(ballColors.length))]]
    // 设置创建时间和随机的消失时间（3-10秒）
    this.creationTime = p5.millis()
    this.disappearTime = this.creationTime + p5.random(5000, 15000)
    // 设置关键词
    this.keyword = keyword
  }

  applyForce(force: Vector) {
    // F = ma, a = F/m
    const f = force.copy()
    f.div(this.mass)
    this.acceleration.add(f)
  }

  update(balance: Balance, balls: Ball[]) {
    // 检查是否到达消失时间
    if (this.p5.millis() > this.disappearTime) {
      // 记录小球的质量和位置，用于从天平上移除
      const ballMass = this.mass
      const wasOnLeftPlate = this.isOnLeftPlate
      const wasOnRightPlate = this.isOnRightPlate

      // 小球消失，将其移出容器
      this.isContained = false
      this.isOnLeftPlate = false
      this.isOnRightPlate = false

      // 更新天平质量
      if (wasOnLeftPlate) {
        balance.removeLeftMass(ballMass)
      } else if (wasOnRightPlate) {
        balance.removeRightMass(ballMass)
      }

      // 将小球移到画面外，等待被清除
      this.position.y = this.p5.height + this.radius * 2
      return
    }

    if (this.isContained) {
      // 如果已经在容器中，根据天平的摆动更新位置

      if (this.isOnLeftPlate) {
        const platePos = balance.getLeftPlatePos()
        const plateAngle = balance.getLeftPlateAngle()

        // 模拟球在容器中的滚动
        if (this.plateReference) {
          // 根据天平的倾斜角度施加侧向力
          const sideForce = Math.sin(plateAngle) * GRAVITY * SIDE_FORCE_FACTOR
          this.plateReference.x += sideForce

          // 防止球滚出容器边界
          const plateSize = balance.getPlateSize()
          const halfWidth = plateSize.width / 2 - this.radius
          this.plateReference.x = Math.max(Math.min(this.plateReference.x, halfWidth), -halfWidth)

          // 更新球的实际位置（根据容器的位置和旋转）
          this.position.x = platePos.x + this.plateReference.x * Math.cos(plateAngle)
          this.position.y = platePos.y + this.plateReference.x * Math.sin(plateAngle) - this.radius - this.plateReference.y
        }
      } else if (this.isOnRightPlate) {
        const platePos = balance.getRightPlatePos()
        const plateAngle = balance.getRightPlateAngle()

        // 模拟球在容器中的滚动
        if (this.plateReference) {
          // 根据天平的倾斜角度施加侧向力（右盘方向相反）
          const sideForce = Math.sin(-plateAngle) * GRAVITY * SIDE_FORCE_FACTOR
          this.plateReference.x += sideForce

          // 防止球滚出容器边界
          const plateSize = balance.getPlateSize()
          const halfWidth = plateSize.width / 2 - this.radius
          this.plateReference.x = Math.max(Math.min(this.plateReference.x, halfWidth), -halfWidth)

          // 更新球的实际位置（根据容器的位置和旋转）
          this.position.x = platePos.x + this.plateReference.x * Math.cos(-plateAngle)
          this.position.y = platePos.y + this.plateReference.x * Math.sin(-plateAngle) - this.radius - this.plateReference.y
        }
      }

      // 处理容器内球之间的碰撞
      this.handleBallCollisions(balls.filter(b => b !== this && b.isContained
      && ((this.isOnLeftPlate && b.isOnLeftPlate) || (this.isOnRightPlate && b.isOnRightPlate))))

      return
    }

    // 应用重力
    this.applyForce(this.p5.createVector(0, GRAVITY * this.mass))

    // 记录下落速度用于计算冲击力
    this.impactVelocity = this.velocity.y

    // 更新速度和位置
    this.velocity.add(this.acceleration)
    this.velocity.mult(FRICTION)

    // 检测与天平横梁的碰撞
    if (balance.checkBallBeamCollision(this) && this.velocity.y > 0) {
      // 如果碰到横梁且向下运动，则弹开
      this.velocity.y *= -RESTITUTION
    }

    // 检测盘内小球碰撞
    this.handleBallCollisions(balls.filter(b => b !== this))

    this.position.add(this.velocity)

    // 重置加速度
    this.acceleration.mult(0)
  }

  // 处理球之间的碰撞
  handleBallCollisions(otherBalls: Ball[]) {
    for (const other of otherBalls) {
      const distance = this.p5.dist(
        this.position.x, this.position.y,
        other.position.x, other.position.y
      )

      const minDistance = this.radius + other.radius

      // 如果两球重叠
      if (distance < minDistance) {
        // 计算碰撞后的速度
        const angle = Math.atan2(
          other.position.y - this.position.y,
          other.position.x - this.position.x
        )

        // 分离球体，防止继续重叠
        const overlap = minDistance - distance
        const moveX = overlap * Math.cos(angle) * 0.5 // 每个球移动一半距离
        const moveY = overlap * Math.sin(angle) * 0.5

        // 如果球体不在容器中，应用分离
        if (!this.isContained) {
          this.position.x -= moveX
          this.position.y -= moveY
        }
        if (!other.isContained) {
          other.position.x += moveX
          other.position.y += moveY
        }

        // 如果两个球都在同一个容器中，则只调整X坐标，不调整Y坐标
        if (this.isContained && other.isContained) {
          // 在容器中的球只能在水平方向移动
          if (this.plateReference && other.plateReference) {
            this.plateReference.x -= moveX * 0.5
            other.plateReference.x += moveX * 0.5
          }
        }

        // 计算新的速度（只在非容器球或同一容器内的球之间应用）
        if (!this.isContained || (this.isContained && other.isContained
          && ((this.isOnLeftPlate && other.isOnLeftPlate)
          || (this.isOnRightPlate && other.isOnRightPlate)))) {
          // 计算相对速度
          const vx = this.velocity.x - other.velocity.x
          const vy = this.velocity.y - other.velocity.y

          // 计算相对速度在碰撞方向上的分量
          const dotProduct = vx * Math.cos(angle) + vy * Math.sin(angle)

          // 如果球体正在靠近
          if (dotProduct > 0) {
            // 计算冲量
            const m1 = this.mass
            const m2 = other.mass

            // 计算冲量大小
            const impulse = 2 * dotProduct / (m1 + m2)

            // 应用冲量到速度
            if (!this.isContained) {
              this.velocity.x -= impulse * m2 * Math.cos(angle) * BALL_RESTITUTION
              this.velocity.y -= impulse * m2 * Math.sin(angle) * BALL_RESTITUTION
            } else if (this.plateReference) {
              // 在容器中只应用水平方向的冲量
              this.plateReference.x -= impulse * m2 * Math.cos(angle) * BALL_RESTITUTION * 0.5
            }

            if (!other.isContained) {
              other.velocity.x += impulse * m1 * Math.cos(angle) * BALL_RESTITUTION
              other.velocity.y += impulse * m1 * Math.sin(angle) * BALL_RESTITUTION
            } else if (other.plateReference) {
              // 在容器中只应用水平方向的冲量
              other.plateReference.x += impulse * m1 * Math.cos(angle) * BALL_RESTITUTION * 0.5
            }
          }
        }
      }
    }
  }

  // 检查球与天平盘的碰撞
  checkPlateCollision(balance: Balance) {
    if (this.isContained) return

    // 使用改进的多边形碰撞检测
    if (balance.checkBallPlateCollision(this) && this.velocity.y > 0) {
      // 计算冲击力 - 基于下落速度和质量
      const impact = Math.abs(this.impactVelocity) * this.mass * 0.01

      this.velocity.y *= -RESTITUTION * 0.3 // 降低弹跳以模拟在容器中的效果
      this.velocity.x *= 0.8 // 降低水平速度

      this.isContained = true

      // 计算相对于盘中心的初始位置
      if (this.isOnLeftPlate) {
        const platePos = balance.getLeftPlatePos()
        const plateAngle = balance.getLeftPlateAngle()

        // 计算在容器本地坐标系中的位置（考虑旋转）
        const localX = (this.position.x - platePos.x) * Math.cos(-plateAngle)
          - (this.position.y - platePos.y) * Math.sin(-plateAngle)

        this.plateReference = this.p5.createVector(localX, 0)
        balance.addLeftMass(this.mass, impact)
      } else if (this.isOnRightPlate) {
        const platePos = balance.getRightPlatePos()
        const plateAngle = balance.getRightPlateAngle()

        // 计算在容器本地坐标系中的位置（考虑旋转）
        const localX = (this.position.x - platePos.x) * Math.cos(plateAngle)
          - (this.position.y - platePos.y) * Math.sin(plateAngle)

        this.plateReference = this.p5.createVector(localX, 0)
        balance.addRightMass(this.mass, impact)
      }
    }
  }

  setOnLeftPlate(value: boolean) {
    this.isOnLeftPlate = value
  }

  setOnRightPlate(value: boolean) {
    this.isOnRightPlate = value
  }

  isOnPlate(): boolean {
    return this.isOnLeftPlate || this.isOnRightPlate
  }

  getPosition(): Vector {
    return this.position.copy()
  }

  getRadius(): number {
    return this.radius
  }

  display() {
    this.p5.push()

    // 如果小球快要消失，显示闪烁效果
    const timeLeft = this.disappearTime - this.p5.millis()
    if (this.isContained && timeLeft < 1000) {
      // 根据剩余时间调整透明度
      const alpha = Math.max(50, Math.min(255, timeLeft / 1000 * 255))
      this.p5.fill(this.color[0], this.color[1], this.color[2], alpha)

      // 如果非常接近消失时间，添加闪烁效果
      if (timeLeft < 500 && Math.random() > 0.5) {
        this.p5.fill(this.color[0], this.color[1], this.color[2], 50)
      }
    } else {
      this.p5.fill(this.color)
    }

    this.p5.noStroke()
    this.p5.circle(this.position.x, this.position.y, this.radius * 2)

    // 绘制关键词
    if (this.keyword && this.keyword.length > 0) {
      // 设置文本样式
      this.p5.fill(0) // 黑色文字
      this.p5.textAlign(this.p5.CENTER, this.p5.CENTER)

      // 根据球体大小调整字体大小
      const fontSize = Math.max(8, Math.min(14, this.radius * 0.9))
      this.p5.textSize(fontSize)

      // 在小球中心绘制文字
      this.p5.text(this.keyword, this.position.x, this.position.y)
    }

    this.p5.pop()
  }

  isOffScreen() {
    return this.position.y > this.p5.height + 100 && !this.isContained
  }

  getMass() {
    return this.mass
  }

  // 修正方法名，避免与实例变量同名
  isInContainer(): boolean {
    return this.isContained
  }
}

// 球生成器
class BallGenerator {
  private balls: Ball[] = []
  private nextDropTime = 0
  private ripples: Ripple[] = [] // 添加涟漪数组

  constructor(private p5: P5CanvasInstance) {}

  update(balance: Balance) {
    // 定时生成新球
    if (this.p5.millis() > this.nextDropTime) {
      this.generateBall()
      this.nextDropTime = this.p5.millis() + this.p5.random(500, 1500)
    }

    // 更新所有球的位置
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i]
      ball.update(balance, this.balls)
      // 记录小球之前是否已经在盘子中
      const wasContained = ball.isInContainer()
      ball.checkPlateCollision(balance)
      // 如果小球刚刚落入容器，创建涟漪效果
      if (!wasContained && ball.isInContainer()) {
        const pos = ball.getPosition()
        this.createRipple(
          this.p5.random(-50, 50),
          this.p5.random(-50, 50)
        )
      }

      // 移除屏幕外的球
      if (ball.isOffScreen()) {
        this.balls.splice(i, 1)
      }
    }

    // 更新所有涟漪并移除已完成的
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].update()
      if (this.ripples[i].isDone()) {
        this.ripples.splice(i, 1)
      }
    }
  }

  // 创建涟漪效果
  createRipple(x: number, y: number) {
    this.ripples.push(new Ripple(this.p5, x, y))
  }

  generateBall() {
    // 随机决定球的属性和位置
    const side = this.p5.random() > 0.5 ? -1 : 1
    const x = 200 * side + this.p5.random(-0.5, 0.5) * 80
    const y = -this.p5.height / 2 + 50
    // 增加小球尺寸差异
    const radius = this.p5.random(8, 20)
    const keyword = side === -1
      ? leftKeywords[this.p5.floor(this.p5.random(leftKeywords.length))]
      : rightKeywords[this.p5.floor(this.p5.random(rightKeywords.length))]

    // 将关键词传递给Ball构造函数
    this.balls.push(new Ball(this.p5, x, y, radius, keyword))
  }

  display() {
    // 先绘制涟漪，确保它们在球的下方
    for (const ripple of this.ripples) {
      ripple.display()
    }

    // 再绘制所有球
    for (const ball of this.balls) {
      ball.display()
    }
  }

  getBalls(): Ball[] {
    return this.balls
  }
}

let balance: Balance
let ballGenerator: BallGenerator

function setup(p5: P5CanvasInstance) {
  p5.createCanvas(window.innerWidth, window.innerHeight)
  p5.colorMode(p5.RGB)
  p5.ellipseMode(p5.CENTER)

  // 检查URL是否包含debug参数
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    debugMode = urlParams.has('debug')
  }

  balance = new Balance(p5)
  ballGenerator = new BallGenerator(p5)
}

function draw(p5: P5CanvasInstance) {
  p5.background(15)

  // 移动原点到屏幕中心
  p5.translate(p5.width / 2, p5.height / 2 - 100)

  // 更新和显示
  ballGenerator.update(balance)
  balance.display()
  ballGenerator.display()
}

function IdEgoSuperego() {
  const { sketch } = useP5(setup, draw)
  return <ReactP5Wrapper sketch={sketch} />
}

export default IdEgoSuperego
