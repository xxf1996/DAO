import type { P5CanvasInstance } from '@p5-wrapper/react'
import { useControls } from 'leva'
import './index.scss'
import { useEffect, useRef, useState } from 'react'

type TreeNode = {
  length: number
  thickness: number
  angle: number
  branches: TreeNode[]
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
    controlX: Math.random() * len * 0.6 - len * 0.3,
    controlY: -len * 0.5,
    leafSizes: Array(3)
      .fill(0)
      .map(() => Math.random() * 10 + 5),
    leafOffsets: Array(3)
      .fill(0)
      .map(() => ({
        x: Math.random() * 10 - 5,
        y: Math.random() * 10 - 5,
      }))
  }

  if (len > 4) {
    let minBranches = 2
    let maxBranches = 3.2

    if (len >= 120) {
      minBranches = 3
      maxBranches = 4
    } else if (len >= 80) {
      minBranches = 2.5
      maxBranches = 3.5
    }

    const branches = Math.floor(Math.random() * (maxBranches - minBranches) + minBranches)

    const baseAngle = len >= 120 ? -35 : -30
    const angleSpread = len >= 120 ? 70 : len >= 80 ? 65 : 60
    const angleStep = angleSpread / (branches - 1)

    for (let i = 0; i < branches; i++) {
      const densityMultiplier = len >= 120 ? 1.5 : len >= 80 ? 1.3 : 1.2
      if (Math.random() < density * densityMultiplier) {
        const baseAngleForBranch = baseAngle + angleStep * i
        const angle = baseAngleForBranch + (Math.random() * 20 - 10)

        const lengthVariation = Math.random() * 0.15 + 0.85
        const newLen = len * lengthFactor * lengthVariation

        const thicknessVariation = Math.random() * 0.1 + 0.9
        const newThickness = thickness * thicknessFactor * thicknessVariation

        const branch = generateTree(p5, newLen, newThickness, density, lengthFactor, thicknessFactor)
        branch.angle = angle
        node.branches.push(branch)
      }
    }

    if (node.branches.length === 0) {
      const angle = Math.random() * 60 - 30
      const newLen = len * lengthFactor * (Math.random() * 0.15 + 0.85)
      const newThickness = thickness * thicknessFactor * (Math.random() * 0.1 + 0.9)
      const branch = generateTree(p5, newLen, newThickness, density, lengthFactor, thicknessFactor)
      branch.angle = angle
      node.branches.push(branch)
    }
  }

  return node
}

function TreeSVG() {
  const controls = useControls({
    density: { value: 0.7, min: 0.3, max: 1, step: 0.1 },
    lengthFactor: { value: 0.8, min: 0.5, max: 0.9, step: 0.1 },
    thicknessFactor: { value: 0.7, min: 0.5, max: 0.9, step: 0.1 }
  })

  const [treeStructure, setTreeStructure] = useState<TreeNode | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const generateTreeWithDebounce = () => {
      if (debounceTimerRef.current) {
        window.cancelAnimationFrame(debounceTimerRef.current)
      }

      debounceTimerRef.current = window.requestAnimationFrame(() => {
        setTreeStructure(
          generateTree(
            {} as P5CanvasInstance,
            180,
            20,
            controls.density,
            controls.lengthFactor,
            controls.thicknessFactor
          )
        )
      })
    }

    generateTreeWithDebounce()
  }, [controls.density, controls.lengthFactor, controls.thicknessFactor])

  const renderBranch = (node: TreeNode, x: number, y: number, parentAngle: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = []
    const totalAngle = parentAngle + node.angle
    const radians = (totalAngle * Math.PI) / 180

    // 计算终点坐标
    const endX = x
    const endY = y - node.length

    // 计算控制点
    const controlX1 = x + node.controlX * Math.cos(radians) - node.controlY * Math.sin(radians)
    const controlY1 = y + node.controlX * Math.sin(radians) + node.controlY * Math.cos(radians)
    const controlX2 = controlX1
    const controlY2 = controlY1 - node.length * 0.3

    // 绘制树枝
    elements.push(
      <path
        key={`branch-${x}-${y}-${node.angle}`}
        d={`M ${x} ${y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
        stroke="#8B4513"
        strokeWidth={node.thickness}
        fill="none"
        filter="url(#branch-filter)"
      />
    )

    // 在叶子节点添加水彩效果的叶片
    if (node.branches.length === 0 && node.length < 10) {
      node.leafOffsets.forEach((offset, i) => {
        const leafX = endX + offset.x * Math.cos(radians) - offset.y * Math.sin(radians)
        const leafY = endY + offset.x * Math.sin(radians) + offset.y * Math.cos(radians)

        elements.push(
          <circle
            key={`leaf-${leafX}-${leafY}-${i}`}
            cx={leafX}
            cy={leafY}
            r={node.leafSizes[i] / 2}
            fill="#228B22"
            filter="url(#leaf-filter)"
          />
        )
      })
    }

    // 递归绘制分支
    node.branches.forEach((branch) => {
      elements.push(...renderBranch(branch, endX, endY, totalAngle))
    })

    return elements
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#F5F5F0' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <filter id="branch-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="noise" />
            <feDisplacementMap in="blur" in2="noise" scale="3" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 0.8 0"
            />
          </filter>
          <filter id="leaf-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            <feTurbulence type="fractalNoise" baseFrequency="0.5" />
            <feDisplacementMap in="SourceGraphic" scale="5" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0.2
                      0 0 1 0 0
                      0 0 0 0.6 0"
            />
          </filter>
        </defs>
        {treeStructure && renderBranch(treeStructure, window.innerWidth / 2, window.innerHeight, 0)}
      </svg>
    </div>
  )
}

export default TreeSVG
