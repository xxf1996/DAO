/* eslint-disable @typescript-eslint/naming-convention */
import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { useEffect, useRef } from 'react'
import Matter from 'matter-js'

// Matter.js 模块
const Engine = Matter.Engine
const Render = Matter.Render
const Runner = Matter.Runner
const Bodies = Matter.Bodies
const Composite = Matter.Composite
const Body = Matter.Body
const Vertices = Matter.Vertices
const Svg = Matter.Svg

// 物理引擎实例
let engine: Matter.Engine
let world: Matter.World
let runner: Matter.Runner

// 球体数组
let balls: Matter.Body[] = []

// 地形刚体
let funnelBodies: Matter.Body[] = []
let groundBodies: Matter.Body[] = []

// 生成球体的计时器
let nextBallTime = 0

// 漏斗配置
const FUNNEL_WIDTH = 400 // 漏斗顶部宽度
const FUNNEL_HEIGHT = 300 // 漏斗高度
const FUNNEL_BOTTOM_WIDTH = 100 // 漏斗底部宽度
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

// 创建漏斗形状的静态刚体
function createFunnel(p5: P5CanvasInstance): Matter.Body[] {
  const centerX = p5.width / 2
  const topY = FUNNEL_TOP_Y
  const bottomY = topY + FUNNEL_HEIGHT

  // 左侧墙
  const leftWall = Bodies.rectangle(
    centerX - FUNNEL_WIDTH / 2 + FUNNEL_BOTTOM_WIDTH / 4,
    (topY + bottomY) / 2,
    10,
    FUNNEL_HEIGHT,
    {
      isStatic: true,
      angle: -Math.atan((FUNNEL_WIDTH - FUNNEL_BOTTOM_WIDTH) / 2 / FUNNEL_HEIGHT)
    }
  )

  // 右侧墙
  const rightWall = Bodies.rectangle(
    centerX + FUNNEL_WIDTH / 2 - FUNNEL_BOTTOM_WIDTH / 4,
    (topY + bottomY) / 2,
    10,
    FUNNEL_HEIGHT,
    {
      isStatic: true,
      angle: Math.atan((FUNNEL_WIDTH - FUNNEL_BOTTOM_WIDTH) / 2 / FUNNEL_HEIGHT)
    }
  )

  return [leftWall, rightWall]
}

// 创建带空缺的地面
function createGround(p5: P5CanvasInstance): Matter.Body[] {
  const grounds: Matter.Body[] = []
  const centerX = p5.width / 2
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
    density: 0.001
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
    // 文字保持直立，不随球体旋转
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
