/* eslint-disable @typescript-eslint/naming-convention */
import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { useEffect } from 'react'
import Matter from 'matter-js'
import './pathseg.js'
// @ts-expect-error - poly-decomp 没有类型定义
import decomp from 'poly-decomp'

// Matter.js 模块
const Engine = Matter.Engine
const Runner = Matter.Runner
const Bodies = Matter.Bodies
const Composite = Matter.Composite
const Svg = Matter.Svg

Matter.Common.setDecomp(decomp)

// 物理引擎实例
let engine: Matter.Engine
let world: Matter.World
let runner: Matter.Runner

// 球体数组
let balls: Matter.Body[] = []

// 地形刚体
let funnelBodies: Matter.Body[] = []
let groundBodies: Matter.Body[] = []
let trapDoors: Array<{ body: Matter.Body, isOpen: boolean, initialX: number, currentOffset: number, width: number }> = []
let sideWalls: Matter.Body[] = []
// 保存漏斗的原始顶点用于渲染外轮廓（每个路径一个数组）
let funnelOutlineVertices: Array<Array<{ x: number, y: number }>> = []

// 生成球体的计时器
let nextBallTime = 0

// 漏斗配置
const FUNNEL_PATHS = ['M1 1Q48 33 8 40L1 1', 'M61 1Q14 33 54 40L61 1']
const FUNNEL_WIDTH = 400 // 漏斗顶部宽度
const FUNNEL_HEIGHT = 300 // 漏斗高度
const FUNNEL_TOP_Y = 50 // 漏斗顶部Y坐标

// 地面配置
const GROUND_Y = FUNNEL_TOP_Y + FUNNEL_HEIGHT + 100 // 地面Y坐标
const GROUND_WIDTH_RATIO = 0.9 // 地面宽度占屏幕宽度的比例
const GROUND_THICKNESS = 10 // 地面厚度
const TRAP_DOOR_COUNT = 8 // 活动板数量
const TRAP_DOOR_WIDTH_RATIO = 0.4 // 活动板宽度比例（相对于之前的分配宽度）
const TRAP_DOOR_OPEN_INTERVAL = 15000 // 活动板打开间隔（毫秒）
const TRAP_DOOR_OPEN_DURATION = 5000 // 活动板打开持续时间（毫秒）
const TRAP_DOOR_SLIDE_DISTANCE = 50 // 活动板向左滑动距离（像素）
const SIDE_WALL_HEIGHT = 200 // 两侧挡板高度

// 球体配置
const BALL_MIN_RADIUS = 6
const BALL_MAX_RADIUS = 15
const BALL_SPAWN_INTERVAL = 100 // 生成间隔（毫秒）

// Debug 模式
let debugMode = false

// 创建漏斗形状的静态刚体
function createFunnel(p5: P5CanvasInstance): Matter.Body[] {
  const centerX = p5.width / 2
  const topY = FUNNEL_TOP_Y

  // 创建临时 SVG 元素来解析路径
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  const path = document.createElementNS(svgNS, 'path')
  const vertices: Matter.Vector[][] = []
  svg.appendChild(path)

  // 临时添加到 DOM 中（pathToVertices 需要）
  document.body.appendChild(svg)

  for (const funnelPath of FUNNEL_PATHS) {
    // 设置 SVG 路径
    path.setAttribute('d', funnelPath)

    // 将 SVG 路径转换为顶点数组
    // 第二个参数是采样长度！数值越小曲线越平滑
    vertices.push(Svg.pathToVertices(path, 1))
  }

  // 从 DOM 中移除临时 SVG
  document.body.removeChild(svg)

  const scaleFactor = 10 // 放大路径

  // 计算所有顶点的全局质心
  const allVertices = vertices.flat()
  const globalCentroid = {
    x: allVertices.reduce((sum, v) => sum + v.x, 0) / allVertices.length,
    y: allVertices.reduce((sum, v) => sum + v.y, 0) / allVertices.length
  }

  // 为每个路径创建独立的刚体
  const funnels: Matter.Body[] = []
  funnelOutlineVertices = []

  vertices.forEach((pathVertices) => {
    // 直接计算世界坐标的顶点（用于渲染和物理）
    const worldVertices = pathVertices.map(v => ({
      x: centerX + (v.x - globalCentroid.x) * scaleFactor,
      y: topY + FUNNEL_HEIGHT / 2 + (v.y - globalCentroid.y) * scaleFactor
    }))

    // 计算这些世界坐标顶点的质心
    const worldCentroid = {
      x: worldVertices.reduce((sum, v) => sum + v.x, 0) / worldVertices.length,
      y: worldVertices.reduce((sum, v) => sum + v.y, 0) / worldVertices.length
    }

    // 直接使用世界坐标顶点创建刚体，质心位置也用世界坐标
    const funnel = Bodies.fromVertices(
      worldCentroid.x,
      worldCentroid.y,
      [worldVertices],
      {
        isStatic: true,
        friction: 0.5,
        render: {
          fillStyle: '#ffffff',
          strokeStyle: '#000000',
          lineWidth: 2
        }
      },
      false, // flagInternal 设为 false，不让 Matter.js 自动调整位置
      0.01, // removeCollinear threshold
      0.01 // minimumArea threshold
    )

    funnels.push(funnel)

    // 调试：检查刚体的实际顶点
    if (debugMode) {
      console.log('worldVertices count:', worldVertices.length)
      console.log('funnel.vertices count:', funnel.vertices.length)
      console.log('worldCentroid:', worldCentroid)
      console.log('funnel.position:', funnel.position)
    }

    // 保存外轮廓顶点（使用刚体的实际顶点，确保完全一致）
    funnelOutlineVertices.push(funnel.vertices.map(v => ({ x: v.x, y: v.y })))
  })

  return funnels
}

// 创建地面系统（固定地面 + 活动板 + 两侧挡板）
function createGround(p5: P5CanvasInstance): {
  grounds: Matter.Body[]
  trapDoors: Array<{ body: Matter.Body, isOpen: boolean, initialX: number, currentOffset: number, width: number }>
  sideWalls: Matter.Body[]
} {
  const centerX = p5.width / 2
  const groundWidth = p5.width * GROUND_WIDTH_RATIO
  const startX = centerX - groundWidth / 2
  const endX = centerX + groundWidth / 2

  // 计算活动板的位置（均匀分布）
  const spacing = groundWidth / (TRAP_DOOR_COUNT + 1)
  const trapDoorWidth = spacing * TRAP_DOOR_WIDTH_RATIO // 活动板宽度变小
  const trapDoorPositions: number[] = []
  for (let i = 1; i <= TRAP_DOOR_COUNT; i++) {
    trapDoorPositions.push(startX + spacing * i)
  }

  // 创建固定地面段（在活动板之间和两端）
  const grounds: Matter.Body[] = []
  let currentX = startX

  trapDoorPositions.forEach((doorX) => {
    // 活动板左侧的固定地面
    const segmentWidth = doorX - currentX - trapDoorWidth / 2
    if (segmentWidth > 5) {
      const segmentCenterX = currentX + segmentWidth / 2
      const ground = Bodies.rectangle(
        segmentCenterX,
        GROUND_Y,
        segmentWidth,
        GROUND_THICKNESS,
        {
          isStatic: true,
          friction: 0.5
        }
      )
      grounds.push(ground)
    }
    currentX = doorX + trapDoorWidth / 2
  })

  // 最后一段固定地面
  const lastSegmentWidth = endX - currentX
  if (lastSegmentWidth > 5) {
    const segmentCenterX = currentX + lastSegmentWidth / 2
    const ground = Bodies.rectangle(
      segmentCenterX,
      GROUND_Y,
      lastSegmentWidth,
      GROUND_THICKNESS,
      {
        isStatic: true,
        friction: 0.5
      }
    )
    grounds.push(ground)
  }

  // 创建活动板（简单的矩形，定时水平移动）
  const doors: Array<{ body: Matter.Body, isOpen: boolean, initialX: number, currentOffset: number, width: number }> = []

  trapDoorPositions.forEach((doorX) => {
    const door = Bodies.rectangle(
      doorX,
      GROUND_Y,
      trapDoorWidth,
      GROUND_THICKNESS,
      {
        isStatic: true, // 设为静态，我们会手动控制位置
        friction: 0.5
      }
    )

    doors.push({
      body: door,
      isOpen: false,
      initialX: doorX,
      currentOffset: 0,
      width: trapDoorWidth
    })
  })

  // 创建两侧挡板
  const walls: Matter.Body[] = []

  // 左侧挡板
  const leftWall = Bodies.rectangle(
    startX - GROUND_THICKNESS / 2,
    GROUND_Y - SIDE_WALL_HEIGHT / 2,
    GROUND_THICKNESS,
    SIDE_WALL_HEIGHT,
    {
      isStatic: true,
      friction: 0.5
    }
  )
  walls.push(leftWall)

  // 右侧挡板
  const rightWall = Bodies.rectangle(
    endX + GROUND_THICKNESS / 2,
    GROUND_Y - SIDE_WALL_HEIGHT / 2,
    GROUND_THICKNESS,
    SIDE_WALL_HEIGHT,
    {
      isStatic: true,
      friction: 0.5
    }
  )
  walls.push(rightWall)

  return { grounds, trapDoors: doors, sideWalls: walls }
}

function randomSign() {
  return Math.random() > 0.5 ? 1 : -1
}

// 创建球体
function createBall(p5: P5CanvasInstance): Matter.Body {
  const centerX = p5.width / 2
  const x = centerX + p5.random(FUNNEL_WIDTH / 3, FUNNEL_WIDTH / 2) * randomSign()
  const y = FUNNEL_TOP_Y - 50
  const radius = p5.random(BALL_MIN_RADIUS, BALL_MAX_RADIUS)

  const ball = Bodies.circle(x, y, radius, {
    restitution: 0.6,
    friction: 0.1,
    density: 0.001,
    // 启用空气摩擦力，使球体会旋转
    frictionAir: 0.01
  })

  return ball
}

// 清理离开屏幕的球体
function cleanupBalls(p5: P5CanvasInstance) {
  balls = balls.filter((ball) => {
    if (ball.position.y > p5.height + 100) {
      Composite.remove(world, ball)
      return false
    }
    return true
  })
}

// 更新活动板状态（水平滑动打开）
function updateTrapDoors(p5: P5CanvasInstance) {
  const currentTime = p5.millis()

  trapDoors.forEach((door, index) => {
    // 每个活动板有不同的打开时机（错开）
    const offset = (index * TRAP_DOOR_OPEN_INTERVAL) / TRAP_DOOR_COUNT
    const cycleTime = (currentTime + offset) % TRAP_DOOR_OPEN_INTERVAL

    let targetOffset = 0
    if (cycleTime < TRAP_DOOR_OPEN_DURATION) {
      // 打开状态：向左滑动
      door.isOpen = true
      targetOffset = -TRAP_DOOR_SLIDE_DISTANCE
    } else {
      // 关闭状态：回到初始位置
      door.isOpen = false
      targetOffset = 0
    }

    // 平滑插值到目标偏移
    const offsetDiff = targetOffset - door.currentOffset
    door.currentOffset += offsetDiff * 0.1 // 平滑系数

    // 设置新位置（水平移动）
    Matter.Body.setPosition(door.body, {
      x: door.initialX + door.currentOffset,
      y: GROUND_Y
    })
  })
}

function setup(p5: P5CanvasInstance) {
  p5.createCanvas(window.innerWidth, window.innerHeight)
  p5.textAlign(p5.CENTER, p5.CENTER)
  p5.textSize(20)

  // 检查 URL 是否包含 debug 参数
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    debugMode = urlParams.has('debug')
  }

  // 创建 Matter.js 引擎
  engine = Engine.create()
  world = engine.world

  // 设置重力
  engine.world.gravity.y = 1

  // 创建漏斗
  funnelBodies = createFunnel(p5)
  funnelBodies.forEach(body => Composite.add(world, body))

  // 创建地面系统
  const groundSystem = createGround(p5)
  groundBodies = groundSystem.grounds
  trapDoors = groundSystem.trapDoors
  sideWalls = groundSystem.sideWalls

  groundBodies.forEach(body => Composite.add(world, body))
  trapDoors.forEach(door => Composite.add(world, door.body))
  sideWalls.forEach(wall => Composite.add(world, wall))

  // 创建 Runner
  runner = Runner.create()
  Runner.run(runner, engine)
}

function draw(p5: P5CanvasInstance) {
  // 白色背景
  p5.background(255)

  // 更新物理引擎
  Engine.update(engine, 1000 / 60)

  // 生成新球体
  if (p5.millis() > nextBallTime) {
    const ball = createBall(p5)
    balls.push(ball)
    Composite.add(world, ball)
    nextBallTime = p5.millis() + BALL_SPAWN_INTERVAL
  }

  // 清理离开屏幕的球体
  cleanupBalls(p5)

  // 更新活动板状态
  updateTrapDoors(p5)

  // 渲染漏斗
  p5.push()
  p5.stroke(0)
  p5.strokeWeight(2)
  p5.noFill()

  funnelBodies.forEach((body) => {
    // 绘制所有外轮廓（使用保存的原始顶点）
    if (funnelOutlineVertices.length > 0) {
      funnelOutlineVertices.forEach((pathVertices) => {
        p5.push()
        p5.stroke(0)
        p5.strokeWeight(2)
        p5.noFill()
        p5.beginShape()
        pathVertices.forEach((vertex) => {
          p5.vertex(vertex.x, vertex.y)
        })
        p5.endShape(p5.CLOSE)
        p5.pop()
      })
    }

    // Debug 模式：显示分解后的各个凸多边形部分（绘制在外轮廓之上）
    if (debugMode && body.parts && body.parts.length > 0) {
      // 跳过第一个 part（它是父刚体本身）
      for (let i = 0; i < body.parts.length; i++) {
        const part = body.parts[i]
        p5.push()
        const hue = (i * 360 / body.parts.length) % 360
        p5.colorMode(p5.HSB)
        p5.fill(hue, 50, 90, 30)
        p5.stroke(hue, 80, 60)
        p5.strokeWeight(1)
        p5.beginShape()
        part.vertices.forEach((vertex) => {
          p5.vertex(vertex.x, vertex.y)
        })
        p5.endShape(p5.CLOSE)
        p5.pop()
      }

      // Debug: 绘制原始外轮廓的顶点标记
      p5.push()
      p5.fill(255, 0, 0)
      p5.noStroke()
      funnelOutlineVertices.forEach((pathVertices) => {
        pathVertices.forEach((vertex) => {
          p5.circle(vertex.x, vertex.y, 3)
        })
      })
      p5.pop()
    }
  })
  p5.pop()

  // 渲染固定地面段（只绘制顶部边缘线）
  p5.push()
  p5.stroke(0)
  p5.strokeWeight(2)

  groundBodies.forEach((ground) => {
    // 获取矩形的左右边界
    const halfWidth = (ground.bounds.max.x - ground.bounds.min.x) / 2
    const leftX = ground.position.x - halfWidth
    const rightX = ground.position.x + halfWidth
    // 绘制顶部线条
    p5.line(leftX, GROUND_Y, rightX, GROUND_Y)
  })
  p5.pop()

  // 渲染活动板（只绘制顶部边缘线）
  p5.push()
  p5.stroke(0)
  p5.strokeWeight(2)

  trapDoors.forEach((door) => {
    // 获取矩形的左右边界
    const halfWidth = door.width / 2
    const leftX = door.body.position.x - halfWidth
    const rightX = door.body.position.x + halfWidth
    // 绘制顶部线条
    p5.line(leftX, GROUND_Y, rightX, GROUND_Y)

    // Debug 模式：绘制初始位置标记点
    if (debugMode) {
      p5.push()
      p5.fill(255, 0, 0)
      p5.noStroke()
      p5.circle(door.initialX, GROUND_Y, 5)
      p5.pop()
    }
  })
  p5.pop()

  // 渲染两侧挡板
  p5.push()
  p5.stroke(0)
  p5.strokeWeight(2)
  p5.fill(255)

  sideWalls.forEach((wall) => {
    p5.push()
    p5.translate(wall.position.x, wall.position.y)
    p5.rotate(wall.angle)

    const vertices = wall.vertices
    p5.beginShape()
    vertices.forEach((vertex) => {
      const localX = vertex.x - wall.position.x
      const localY = vertex.y - wall.position.y
      p5.vertex(localX, localY)
    })
    p5.endShape(p5.CLOSE)
    p5.pop()
  })
  p5.pop()

  // 渲染球体（显示为"人"字）
  p5.push()
  p5.fill(0)
  p5.noStroke()

  balls.forEach((ball) => {
    p5.push()
    p5.translate(ball.position.x, ball.position.y)
    // 让"人"字跟随球体旋转
    p5.rotate(ball.angle)

    // Debug 模式：显示球体边框和方向向量（姿态/旋转）
    if (debugMode) {
      // 获取球体半径
      const radius = ball.circleRadius || 20

      // 绘制球体边框
      p5.push()
      p5.noFill()
      p5.stroke(100, 100, 255, 150) // 半透明蓝色
      p5.strokeWeight(1)
      p5.circle(0, 0, radius * 2)
      p5.pop()

      // 绘制方向向量（显示球体的旋转角度/姿态）
      p5.push()
      p5.stroke(255, 0, 0) // 红色
      p5.strokeWeight(2)
      // 方向向量指向右侧（0度方向）
      const radius2 = radius
      p5.line(0, 0, radius2, 0)

      // 在方向向量末端绘制一个小圆点
      p5.fill(255, 0, 0)
      p5.noStroke()
      p5.circle(radius2, 0, 4)
      p5.pop()

      // 显示角度和角速度信息（文字不旋转，保持直立）
      p5.push()
      p5.rotate(-ball.angle) // 反向旋转，让文字保持直立
      p5.fill(0)
      p5.noStroke()
      p5.textSize(10)
      const angleDegrees = (ball.angle * 180 / Math.PI).toFixed(0)
      const angularVelocity = ball.angularVelocity.toFixed(2)
      p5.text(`角度: ${angleDegrees}°`, 0, radius2 + 15)
      p5.text(`角速度: ${angularVelocity}`, 0, radius2 + 28)
      p5.pop()
    }

    // 获取球体半径
    const radius = ball.circleRadius || 20

    // 根据球体半径动态设置字体大小
    // 字体大小约为半径的 1.5 倍，确保文字能适应球体大小
    const fontSize = radius * 1.5
    p5.textSize(fontSize)

    // "人"字随球体旋转
    p5.text('人', 0, 0)
    p5.pop()
  })
  p5.pop()
}

function RushHour() {
  const { sketch } = useP5(setup, draw)

  // 清理函数
  useEffect(() => {
    return () => {
      if (engine) {
        Engine.clear(engine)
      }
      if (runner) {
        Runner.stop(runner)
      }
      balls = []
      funnelBodies = []
      groundBodies = []
    }
  }, [])

  return <ReactP5Wrapper sketch={sketch} />
}

export default RushHour
