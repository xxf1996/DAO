import type { P5CanvasInstance } from '@p5-wrapper/react'
import { ReactP5Wrapper } from '@p5-wrapper/react'
import { useP5 } from '@/hooks/p5'
import { useControls } from 'leva'
import './index.scss'
import { useRef, useEffect } from 'react'

type TreeNode = {
  length: number
  thickness: number
  angle: number
  branches: TreeNode[]
  // 存储绘制信息
  controlX: number
  controlY: number
  leafSizes: number[]
  leafOffsets: Array<{ x: number, y: number }>
}

function generateTree(
  p5: P5CanvasInstance,
  len: number,
  thickness: number,
  density: number,
  lengthFactor: number,
  thicknessFactor: number
): TreeNode {
  const node: TreeNode = {
    length: len,
    thickness: thickness,
    angle: 0,
    branches: [],
    // 预先生成绘制信息
    controlX: p5.random(-len * 0.3, len * 0.3),
    controlY: -len * 0.5,
    leafSizes: Array(3).fill(0).map(() => p5.random(5, 15)),
    leafOffsets: Array(3).fill(0).map(() => ({
      x: p5.random(-5, 5),
      y: p5.random(-5, 5)
    }))
  }

  if (len > 4) {
    // 根据层级调整分支数量，前两级分支更多
    let minBranches = 2
    let maxBranches = 3.2

    // 通过长度判断当前层级（180是初始长度）
    if (len >= 120) { // 第一层
      minBranches = 3
      maxBranches = 4
    } else if (len >= 80) { // 第二层
      minBranches = 2.5
      maxBranches = 3.5
    }

    const branches = Math.floor(p5.random(minBranches, maxBranches))

    // 确保分支角度分布更加均匀
    // 根据层级调整角度范围，前两级分支角度范围更大
    const baseAngle = len >= 120 ? -35 : -30
    const angleSpread = len >= 120 ? 70 : (len >= 80 ? 65 : 60)
    const angleStep = angleSpread / (branches - 1)

    for (let i = 0; i < branches; i++) {
      // 提高分支生成概率，使树更加茂密
      // 前两级分支的生成概率更高
      const densityMultiplier = len >= 120 ? 1.5 : (len >= 80 ? 1.3 : 1.2)
      if (p5.random(1) < density * densityMultiplier) {
        // 计算基础角度，确保分支分布均匀
        const baseAngleForBranch = baseAngle + angleStep * i
        // 添加小幅度随机扰动，但保持在合理范围内
        const angle = baseAngleForBranch + p5.random(-10, 10)

        // 使用更平滑的长度衰减
        const lengthVariation = p5.random(0.85, 1)
        const newLen = len * lengthFactor * lengthVariation

        // 使用更平滑的粗细衰减
        const thicknessVariation = p5.random(0.9, 1)
        const newThickness = thickness * thicknessFactor * thicknessVariation

        const branch = generateTree(p5, newLen, newThickness, density, lengthFactor, thicknessFactor)
        branch.angle = angle
        node.branches.push(branch)
      }
    }

    // 如果没有生成任何分支，确保至少生成一个
    if (node.branches.length === 0) {
      const angle = p5.random(-30, 30)
      const newLen = len * lengthFactor * p5.random(0.85, 1)
      const newThickness = thickness * thicknessFactor * p5.random(0.9, 1)
      const branch = generateTree(p5, newLen, newThickness, density, lengthFactor, thicknessFactor)
      branch.angle = angle
      node.branches.push(branch)
    }
  }

  return node
}

function drawTreeNode(p5: P5CanvasInstance, node: TreeNode) {
  // 设置水彩效果的颜色和透明度
  const branchColor = p5.color(139, 69, 19, 100)
  const leafColor = p5.color(34, 139, 34, 80)

  // 绘制弯曲的树枝
  p5.stroke(branchColor)
  p5.strokeWeight(node.thickness)
  p5.noFill()
  p5.beginShape()
  p5.vertex(0, 0)
  // 使用预先生成的控制点
  p5.bezierVertex(node.controlX, node.controlY, node.controlX, node.controlY - node.length * 0.3, 0, -node.length)
  p5.endShape()

  // 在树枝末端添加水彩效果的叶片
  if (node.branches.length === 0 && node.length < 10) {
    p5.push()
    p5.translate(0, -node.length)
    p5.noStroke()
    // 使用预先生成的叶片信息
    for (let i = 0; i < 3; i++) {
      p5.fill(leafColor)
      p5.ellipse(node.leafOffsets[i].x, node.leafOffsets[i].y, node.leafSizes[i], node.leafSizes[i])
    }
    p5.pop()
  }

  p5.translate(0, -node.length)

  for (const branch of node.branches) {
    p5.push()
    p5.rotate(p5.radians(branch.angle))
    drawTreeNode(p5, branch)
    p5.pop()
  }
}

const treeStructureRef = { current: null as TreeNode | null }
const debounceTimerRef = { current: null as number | null }

function Tree() {
  const controls = useControls({
    density: { value: 0.7, min: 0.3, max: 1, step: 0.1 },
    lengthFactor: { value: 0.8, min: 0.5, max: 0.9, step: 0.1 },
    thicknessFactor: { value: 0.7, min: 0.5, max: 0.9, step: 0.1 }
  })

  function setup(p5: P5CanvasInstance) {
    p5.createCanvas(window.innerWidth, window.innerHeight)
    generateTreeWithDebounce(p5)
  }

  function draw(p5: P5CanvasInstance) {
    if (!treeStructureRef.current) return

    p5.background(245, 245, 240) // 设置米白色背景
    p5.translate(p5.width / 2, p5.height)

    drawTreeNode(p5, treeStructureRef.current)
  }

  function generateTreeWithDebounce(p5: P5CanvasInstance) {
    if (debounceTimerRef.current) {
      window.cancelAnimationFrame(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.requestAnimationFrame(() => {
      treeStructureRef.current = generateTree(
        p5,
        180,
        20,
        controls.density,
        controls.lengthFactor,
        controls.thicknessFactor
      )
    })
  }

  // useEffect(() => {
  //   const p5Instance = p5.createCanvas(window.innerWidth, window.innerHeight)
  //   if (p5Instance) {
  //     generateTreeWithDebounce(p5Instance)
  //   }
  // }, [controls.density, controls.lengthFactor, controls.thicknessFactor])

  const { sketch } = useP5(setup, draw)

  return <ReactP5Wrapper sketch={sketch} />
}

export default Tree
