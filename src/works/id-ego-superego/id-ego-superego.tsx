import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { Vector } from 'p5'

// 物理常量
const GRAVITY = 0.3
const FRICTION = 0.98
const RESTITUTION = 0.6
// 增加天平灵敏度
const BALANCE_SENSITIVITY = 0.005
// 小球之间的弹性系数
const BALL_RESTITUTION = 0.7

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
  
  constructor(private p5: P5CanvasInstance) {
    this.pivotX = 0
    this.pivotY = 0
    this.beamLength = 500
    this.beamHeight = 8
    this.plateWidth = 120
    this.plateHeight = 40 // 盘子深度
  }

  private animation() {
    this.animations.update(performance.now())
    
    // 基于左右质量差计算目标角度，增加敏感度
    const massDiff = this.leftMass - this.rightMass
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

  // 获取左盘位置
  getLeftPlatePos(): Vector {
    const x = this.pivotX - this.beamLength / 2 * Math.cos(this.angle)
    const y = this.pivotY + this.beamLength / 2 * Math.sin(this.angle)
    return this.p5.createVector(x, y)
  }

  // 获取右盘位置
  getRightPlatePos(): Vector {
    const x = this.pivotX + this.beamLength / 2 * Math.cos(this.angle)
    const y = this.pivotY - this.beamLength / 2 * Math.sin(this.angle)
    return this.p5.createVector(x, y)
  }
  
  // 获取左盘角度
  getLeftPlateAngle(): number {
    return this.angle
  }
  
  // 获取右盘角度
  getRightPlateAngle(): number {
    return this.angle
  }
  
  // 获取左盘容器的三个顶点坐标（开口顶部）
  getLeftPlateCorners(): Vector[] {
    const platePos = this.getLeftPlatePos()
    const halfWidth = this.plateWidth / 2
    const plateAngle = this.angle
    
    // 计算旋转后的三个顶点（左下、右下、右上、左上）
    const bottomLeft = this.p5.createVector(
      platePos.x - halfWidth * Math.cos(plateAngle),
      platePos.y - halfWidth * Math.sin(plateAngle)
    )
    const bottomRight = this.p5.createVector(
      platePos.x + halfWidth * Math.cos(plateAngle),
      platePos.y + halfWidth * Math.sin(plateAngle)
    )
    const topRight = this.p5.createVector(
      platePos.x + halfWidth * Math.cos(plateAngle) - this.plateHeight * Math.sin(plateAngle),
      platePos.y + halfWidth * Math.sin(plateAngle) + this.plateHeight * Math.cos(plateAngle)
    )
    const topLeft = this.p5.createVector(
      platePos.x - halfWidth * Math.cos(plateAngle) - this.plateHeight * Math.sin(plateAngle),
      platePos.y - halfWidth * Math.sin(plateAngle) + this.plateHeight * Math.cos(plateAngle)
    )
    
    return [bottomLeft, bottomRight, topRight, topLeft]
  }
  
  // 获取右盘容器的三个顶点坐标（开口顶部）
  getRightPlateCorners(): Vector[] {
    const platePos = this.getRightPlatePos()
    const halfWidth = this.plateWidth / 2
    const plateAngle = -this.angle // 注意右侧盘子的角度是相反的
    
    // 计算旋转后的三个顶点
    const bottomLeft = this.p5.createVector(
      platePos.x - halfWidth * Math.cos(plateAngle),
      platePos.y - halfWidth * Math.sin(plateAngle)
    )
    const bottomRight = this.p5.createVector(
      platePos.x + halfWidth * Math.cos(plateAngle),
      platePos.y + halfWidth * Math.sin(plateAngle)
    )
    const topRight = this.p5.createVector(
      platePos.x + halfWidth * Math.cos(plateAngle) - this.plateHeight * Math.sin(plateAngle),
      platePos.y + halfWidth * Math.sin(plateAngle) + this.plateHeight * Math.cos(plateAngle)
    )
    const topLeft = this.p5.createVector(
      platePos.x - halfWidth * Math.cos(plateAngle) - this.plateHeight * Math.sin(plateAngle),
      platePos.y - halfWidth * Math.sin(plateAngle) + this.plateHeight * Math.cos(plateAngle)
    )
    
    return [bottomLeft, bottomRight, topRight, topLeft]
  }

  // 添加质量到左盘，并触发震动
  addLeftMass(mass: number, impact: number) {
    this.leftMass += mass
    this.shake(impact)
  }
  
  // 添加质量到右盘，并触发震动
  addRightMass(mass: number, impact: number) {
    this.rightMass += mass
    this.shake(impact)
  }
  
  // 添加震动效果
  shake(intensity: number) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 0.2)
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
    
    // 绘制天平横梁 - 极简线条
    this.p5.push()
    this.p5.translate(this.pivotX + shakeX, this.pivotY + shakeY)
    this.p5.rotate(this.angle)
    this.p5.stroke(240)
    this.p5.strokeWeight(this.beamHeight)
    this.p5.line(-this.beamLength/2, 0, this.beamLength/2, 0)
    this.p5.pop()
    
    // 绘制左盘容器（开口顶部）
    const leftCorners = this.getLeftPlateCorners()
    this.p5.stroke(240)
    this.p5.strokeWeight(2)
    this.p5.noFill()
    
    // 只绘制三条边（不画顶部）
    this.p5.line(leftCorners[0].x, leftCorners[0].y, leftCorners[1].x, leftCorners[1].y) // 底边
    this.p5.line(leftCorners[1].x, leftCorners[1].y, leftCorners[2].x, leftCorners[2].y) // 右边
    this.p5.line(leftCorners[3].x, leftCorners[3].y, leftCorners[0].x, leftCorners[0].y) // 左边
    
    // 绘制右盘容器（开口顶部）
    const rightCorners = this.getRightPlateCorners()
    this.p5.line(rightCorners[0].x, rightCorners[0].y, rightCorners[1].x, rightCorners[1].y) // 底边
    this.p5.line(rightCorners[1].x, rightCorners[1].y, rightCorners[2].x, rightCorners[2].y) // 右边
    this.p5.line(rightCorners[3].x, rightCorners[3].y, rightCorners[0].x, rightCorners[0].y) // 左边
    
    // 绘制支架 - 极简风格
    this.p5.stroke(220)
    this.p5.strokeWeight(2)
    this.p5.line(this.pivotX, this.pivotY, this.pivotX, this.pivotY + 180)
    this.p5.line(this.pivotX - 120, this.pivotY + 180, this.pivotX + 120, this.pivotY + 180)
    
    // 绘制支点
    this.p5.fill(240)
    this.p5.noStroke()
    this.p5.ellipse(this.pivotX + shakeX, this.pivotY + shakeY, 12, 12)
    
    this.p5.pop()
  }
  
  // 判断点是否在多边形内
  isPointInPolygon(point: Vector, corners: Vector[]): boolean {
    let inside = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const xi = corners[i].x, yi = corners[i].y;
      const xj = corners[j].x, yj = corners[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  
  // 检查球与天平线段的碰撞
  checkBallBeamCollision(ball: Ball): boolean {
    // 计算横梁的两个端点（考虑震动和旋转）
    const shakeX = this.p5.random(-this.shakeIntensity, this.shakeIntensity) * 10;
    const shakeY = this.p5.random(-this.shakeIntensity, this.shakeIntensity) * 5;
    
    const startX = this.pivotX + shakeX - this.beamLength/2 * Math.cos(this.angle);
    const startY = this.pivotY + shakeY + this.beamLength/2 * Math.sin(this.angle);
    
    const endX = this.pivotX + shakeX + this.beamLength/2 * Math.cos(this.angle);
    const endY = this.pivotY + shakeY - this.beamLength/2 * Math.sin(this.angle);
    
    const ballPos = ball.getPosition();
    
    // 计算球到线段的最短距离
    const dist = this.distToSegment(
      ballPos.x, ballPos.y, 
      startX, startY, 
      endX, endY
    );
    
    // 如果距离小于球半径+横梁半高，则发生碰撞
    if (dist < ball.getRadius() + this.beamHeight/2) {
      return true;
    }
    
    return false;
  }
  
  // 计算点到线段的最短距离
  private distToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) {
      param = dot / len_sq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 检查球与容器碰撞的方法
  checkBallPlateCollision(ball: Ball): boolean {
    // 检查左盘
    const leftCorners = this.getLeftPlateCorners();
    if (this.isPointInPolygon(ball.getPosition(), leftCorners)) {
      if (!ball.isOnPlate()) {
        ball.setOnLeftPlate(true);
        return true;
      }
      return true;
    }
    
    // 检查右盘
    const rightCorners = this.getRightPlateCorners();
    if (this.isPointInPolygon(ball.getPosition(), rightCorners)) {
      if (!ball.isOnPlate()) {
        ball.setOnRightPlate(true);
        return true;
      }
      return true;
    }
    
    return false;
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
  
  constructor(private p5: P5CanvasInstance, x: number, y: number, radius: number) {
    this.position = p5.createVector(x, y)
    this.velocity = p5.createVector(0, 0)
    this.acceleration = p5.createVector(0, 0)
    this.radius = radius
    this.mass = radius * radius * 0.01 // 质量与半径平方成正比
    this.color = [
      p5.random(180, 250),
      p5.random(180, 250),
      p5.random(180, 250)
    ]
  }
  
  applyForce(force: Vector) {
    // F = ma, a = F/m
    const f = force.copy()
    f.div(this.mass)
    this.acceleration.add(f)
  }
  
  update(balance: Balance, balls: Ball[]) {
    if (this.isContained) {
      // 如果已经在容器中，根据天平的摆动更新位置
      
      if (this.isOnLeftPlate) {
        const platePos = balance.getLeftPlatePos()
        const plateAngle = balance.getLeftPlateAngle()
        
        // 模拟球在容器中的滚动
        if (this.plateReference) {
          // 根据天平的倾斜角度施加侧向力
          const sideForce = Math.sin(plateAngle) * GRAVITY * 2
          this.plateReference.x += sideForce
          
          // 防止球滚出容器边界
          const plateSize = balance.getPlateSize()
          const halfWidth = plateSize.width / 2 - this.radius
          this.plateReference.x = Math.max(Math.min(this.plateReference.x, halfWidth), -halfWidth)
          
          // 更新球的实际位置（根据容器的位置和旋转）
          this.position.x = platePos.x + this.plateReference.x * Math.cos(plateAngle)
          this.position.y = platePos.y + this.plateReference.x * Math.sin(plateAngle) - this.radius
        }
      } else if (this.isOnRightPlate) {
        const platePos = balance.getRightPlatePos()
        const plateAngle = balance.getRightPlateAngle()
        
        // 模拟球在容器中的滚动
        if (this.plateReference) {
          // 根据天平的倾斜角度施加侧向力（右盘方向相反）
          const sideForce = Math.sin(-plateAngle) * GRAVITY * 2
          this.plateReference.x += sideForce
          
          // 防止球滚出容器边界
          const plateSize = balance.getPlateSize()
          const halfWidth = plateSize.width / 2 - this.radius
          this.plateReference.x = Math.max(Math.min(this.plateReference.x, halfWidth), -halfWidth)
          
          // 更新球的实际位置（根据容器的位置和旋转）
          this.position.x = platePos.x + this.plateReference.x * Math.cos(-plateAngle)
          this.position.y = platePos.y + this.plateReference.x * Math.sin(-plateAngle) - this.radius
        }
      }
      
      // 处理容器内球之间的碰撞
      this.handleBallCollisions(balls.filter(b => b !== this && b.isContained && 
        ((this.isOnLeftPlate && b.isOnLeftPlate) || (this.isOnRightPlate && b.isOnRightPlate))));
      
      return;
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
      this.velocity.y *= -RESTITUTION;
    }
    
    // 检测盘内小球碰撞
    this.handleBallCollisions(balls.filter(b => b !== this));
    
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
      );
      
      const minDistance = this.radius + other.radius;
      
      // 如果两球重叠
      if (distance < minDistance) {
        // 计算碰撞后的速度
        const angle = Math.atan2(
          other.position.y - this.position.y,
          other.position.x - this.position.x
        );
        
        // 分离球体，防止继续重叠
        const overlap = minDistance - distance;
        const moveX = overlap * Math.cos(angle) * 0.5; // 每个球移动一半距离
        const moveY = overlap * Math.sin(angle) * 0.5;
        
        // 如果球体不在容器中，应用分离
        if (!this.isContained) {
          this.position.x -= moveX;
          this.position.y -= moveY;
        }
        if (!other.isContained) {
          other.position.x += moveX;
          other.position.y += moveY;
        }
        
        // 如果两个球都在同一个容器中，则只调整X坐标，不调整Y坐标
        if (this.isContained && other.isContained) {
          // 在容器中的球只能在水平方向移动
          if (this.plateReference && other.plateReference) {
            this.plateReference.x -= moveX * 0.5;
            other.plateReference.x += moveX * 0.5;
          }
        }
        
        // 计算新的速度（只在非容器球或同一容器内的球之间应用）
        if (!this.isContained || (this.isContained && other.isContained && 
            ((this.isOnLeftPlate && other.isOnLeftPlate) || 
             (this.isOnRightPlate && other.isOnRightPlate)))) {
             
          // 计算相对速度
          const vx = this.velocity.x - other.velocity.x;
          const vy = this.velocity.y - other.velocity.y;
          
          // 计算相对速度在碰撞方向上的分量
          const dotProduct = vx * Math.cos(angle) + vy * Math.sin(angle);
          
          // 如果球体正在靠近
          if (dotProduct > 0) {
            // 计算冲量
            const m1 = this.mass;
            const m2 = other.mass;
            
            // 计算冲量大小
            const impulse = 2 * dotProduct / (m1 + m2);
            
            // 应用冲量到速度
            if (!this.isContained) {
              this.velocity.x -= impulse * m2 * Math.cos(angle) * BALL_RESTITUTION;
              this.velocity.y -= impulse * m2 * Math.sin(angle) * BALL_RESTITUTION;
            } else if (this.plateReference) {
              // 在容器中只应用水平方向的冲量
              this.plateReference.x -= impulse * m2 * Math.cos(angle) * BALL_RESTITUTION * 0.5;
            }
            
            if (!other.isContained) {
              other.velocity.x += impulse * m1 * Math.cos(angle) * BALL_RESTITUTION;
              other.velocity.y += impulse * m1 * Math.sin(angle) * BALL_RESTITUTION;
            } else if (other.plateReference) {
              // 在容器中只应用水平方向的冲量
              other.plateReference.x += impulse * m1 * Math.cos(angle) * BALL_RESTITUTION * 0.5;
            }
          }
        }
      }
    }
  }
  
  // 检查球与天平盘的碰撞
  checkPlateCollision(balance: Balance) {
    if (this.isContained) return;
    
    // 使用改进的多边形碰撞检测
    if (balance.checkBallPlateCollision(this) && this.velocity.y > 0) {
      // 计算冲击力 - 基于下落速度和质量
      const impact = Math.abs(this.impactVelocity) * this.mass * 0.01
      
      this.velocity.y *= -RESTITUTION * 0.3; // 降低弹跳以模拟在容器中的效果
      this.velocity.x *= 0.8; // 降低水平速度
      
      this.isContained = true;
      
      // 计算相对于盘中心的初始位置
      if (this.isOnLeftPlate) {
        const platePos = balance.getLeftPlatePos();
        const plateAngle = balance.getLeftPlateAngle();
        
        // 计算在容器本地坐标系中的位置（考虑旋转）
        const localX = (this.position.x - platePos.x) * Math.cos(-plateAngle) - 
                      (this.position.y - platePos.y) * Math.sin(-plateAngle);
        
        this.plateReference = this.p5.createVector(localX, 0);
        balance.addLeftMass(this.mass, impact);
      } else if (this.isOnRightPlate) {
        const platePos = balance.getRightPlatePos();
        const plateAngle = balance.getRightPlateAngle();
        
        // 计算在容器本地坐标系中的位置（考虑旋转）
        const localX = (this.position.x - platePos.x) * Math.cos(plateAngle) - 
                      (this.position.y - platePos.y) * Math.sin(plateAngle);
        
        this.plateReference = this.p5.createVector(localX, 0);
        balance.addRightMass(this.mass, impact);
      }
    }
  }
  
  setOnLeftPlate(value: boolean) {
    this.isOnLeftPlate = value;
  }
  
  setOnRightPlate(value: boolean) {
    this.isOnRightPlate = value;
  }
  
  isOnPlate(): boolean {
    return this.isOnLeftPlate || this.isOnRightPlate;
  }
  
  getPosition(): Vector {
    return this.position.copy();
  }
  
  getRadius(): number {
    return this.radius;
  }
  
  display() {
    this.p5.push()
    this.p5.fill(this.color)
    this.p5.noStroke()
    this.p5.circle(this.position.x, this.position.y, this.radius * 2)
    this.p5.pop()
  }
  
  isOffScreen() {
    return this.position.y > this.p5.height + 100 && !this.isContained;
  }
  
  getMass() {
    return this.mass
  }
}

// 球生成器
class BallGenerator {
  private balls: Ball[] = []
  private nextDropTime = 0
  
  constructor(private p5: P5CanvasInstance) {}
  
  update(balance: Balance) {
    // 定时生成新球
    if (this.p5.millis() > this.nextDropTime) {
      this.generateBall()
      this.nextDropTime = this.p5.millis() + this.p5.random(500, 2000)
    }
    
    // 更新所有球的位置
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i]
      ball.update(balance, this.balls)
      ball.checkPlateCollision(balance)
      
      // 移除屏幕外的球
      if (ball.isOffScreen()) {
        this.balls.splice(i, 1)
      }
    }
  }
  
  generateBall() {
    // 随机决定球的属性和位置
    const side = this.p5.random() > 0.5 ? -1 : 1
    const x = side * this.p5.random(150, 230)
    const y = -150
    // 增加小球尺寸差异
    const radius = this.p5.random(15, 40)
    
    this.balls.push(new Ball(this.p5, x, y, radius))
  }
  
  display() {
    for (const ball of this.balls) {
      ball.display()
    }
  }
  
  getBalls(): Ball[] {
    return this.balls;
  }
}

let balance: Balance
let ballGenerator: BallGenerator

function setup(p5: P5CanvasInstance) {
  p5.createCanvas(window.innerWidth, window.innerHeight)
  p5.colorMode(p5.RGB)
  p5.ellipseMode(p5.CENTER)
  
  balance = new Balance(p5)
  ballGenerator = new BallGenerator(p5)
}

function draw(p5: P5CanvasInstance) {
  p5.background(30)
  
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
