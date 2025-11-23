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
const Body = Matter.Body

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
// 保存漏斗的原始顶点用于渲染外轮廓（每个路径一个数组）
let funnelOutlineVertices: Array<Array<{ x: number, y: number }>> = []

// 生成球体的计时器
let nextBallTime = 0

// 漏斗配置
const FUNNEL_PATHS = ['M1 1Q48 33 8 40L1 1']
const FUNNEL_WIDTH = 400 // 漏斗顶部宽度
const FUNNEL_HEIGHT = 300 // 漏斗高度
const FUNNEL_TOP_Y = 50 // 漏斗顶部Y坐标

// 地面配置
const GROUND_Y = FUNNEL_TOP_Y + FUNNEL_HEIGHT + 150 // 地面Y坐标
const GROUND_SEGMENT_WIDTH = 120 // 地面每段宽度
const GROUND_GAP_WIDTH = 80 // 地面空缺宽度
const GROUND_THICKNESS = 20 // 地面厚度

// 球体配置
const BALL_MIN_RADIUS = 15
const BALL_MAX_RADIUS = 25
const BALL_SPAWN_INTERVAL = 800 // 生成间隔（毫秒）

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

  // 使用顶点创建静态刚体
  // flagInternal 参数设为 true 会自动将凹多边形分解为多个凸多边形
  const scaleFactor = 5 // 放大路径
  const funnel = Bodies.fromVertices(
    centerX,
    topY + FUNNEL_HEIGHT / 2,
    vertices,
    {
      isStatic: true,
      friction: 0.5,
      render: {
        fillStyle: '#ffffff',
        strokeStyle: '#000000',
        lineWidth: 2
      }
    },
    true, // flagInternal - 自动调整位置
    0.01, // removeCollinear threshold
    0.01 // minimumArea threshold
  )

  // 缩放刚体以匹配设计尺寸
  Body.scale(funnel, scaleFactor, scaleFactor)

  // 计算每个路径的外轮廓顶点
  funnelOutlineVertices = vertices.map((pathVertices) => {
    // 计算该路径顶点的质心
    const pathCentroid = {
      x: pathVertices.reduce((sum, v) => sum + v.x, 0) / pathVertices.length,
      y: pathVertices.reduce((sum, v) => sum + v.y, 0) / pathVertices.length
    }

    // 计算缩放后的外轮廓顶点（相对于刚体的最终位置）
    return pathVertices.map((v) => {
      // 相对于路径质心的偏移
      const offsetX = v.x - pathCentroid.x
      const offsetY = v.y - pathCentroid.y
      // 缩放后相对于刚体位置的世界坐标
      return {
        x: funnel.position.x + offsetX * scaleFactor,
        y: funnel.position.y + offsetY * scaleFactor
      }
    })
  })

  return [funnel]
}

// 创建带空缺的地面
function createGround(p5: P5CanvasInstance): Matter.Body[] {
  const grounds: Matter.Body[] = []
  const totalWidth = p5.width
  const segmentCount = Math.ceil(totalWidth / (GROUND_SEGMENT_WIDTH + GROUND_GAP_WIDTH))

  // 从左到右创建地面段
  for (let i = 0; i < segmentCount; i++) {
    const x = i * (GROUND_SEGMENT_WIDTH + GROUND_GAP_WIDTH) + GROUND_SEGMENT_WIDTH / 2

    const ground = Bodies.rectangle(
      x,
      GROUND_Y,
      GROUND_SEGMENT_WIDTH,
      GROUND_THICKNESS,
      {
        isStatic: true,
        friction: 0.5
      }
    )

    grounds.push(ground)
  }

  return grounds
}

// 创建球体
function createBall(p5: P5CanvasInstance): Matter.Body {
  const centerX = p5.width / 2
  const x = centerX + p5.random(-FUNNEL_WIDTH / 3, FUNNEL_WIDTH / 3)
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

  // 创建地面
  groundBodies = createGround(p5)
  groundBodies.forEach(body => Composite.add(world, body))

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
    if (debugMode && body.parts && body.parts.length > 1) {
      // 跳过第一个 part（它是父刚体本身）
      for (let i = 1; i < body.parts.length; i++) {
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

  // 渲染地面
  p5.push()
  p5.stroke(0)
  p5.strokeWeight(2)
  p5.fill(255)

  groundBodies.forEach((body) => {
    p5.push()
    p5.translate(body.position.x, body.position.y)
    p5.rotate(body.angle)

    const vertices = body.vertices
    p5.beginShape()
    vertices.forEach((vertex) => {
      const localX = vertex.x - body.position.x
      const localY = vertex.y - body.position.y
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
