export type TreeNode = {
  length: number
  thickness: number
  angle: number
  branches: TreeNode[]
  controlX: number
  controlY: number
  leafSizes: number[]
  leafOffsets: Array<{ x: number, y: number }>
  position: { x: number, y: number, z: number }
  rotation: { x: number, y: number, z: number, order: string }
  level: number
}

type GenerateTreeParams = {
  len: number
  thickness: number
  density: number
  lengthFactor: number
  thicknessFactor: number
  maxLevel: number
  maxLeafCount: number
}

let currentLeafCount = 0

function generateTree(
  len: number,
  thickness: number,
  density: number,
  lengthFactor: number,
  thicknessFactor: number,
  position = { x: 0, y: 0, z: 0 },
  rotation = { x: 0, y: 0, z: 0, order: 'XYZ' },
  level = 0,
  maxLevel = 6,
  maxLeafCount = 100
): TreeNode {
  const node: TreeNode = {
    length: len,
    thickness: thickness,
    angle: 0,
    branches: [],
    controlX: Math.random() * len * 0.6 - len * 0.3,
    controlY: -len * 0.5,
    leafSizes: [],
    leafOffsets: [],
    position,
    rotation,
    level
  }

  if (len > 4 && level < maxLevel) {
    let minBranches = 2
    let maxBranches = 3.2

    if (len >= 120) {
      minBranches = 4
      maxBranches = 6
    } else if (len >= 80) {
      minBranches = 2
      maxBranches = 4
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

        const newPosition = { x: 0, y: len, z: 0 }
        const xRotation = (Math.random() * 30) * (Math.PI / 180)
        const yRotation = (Math.random() * 360) * (Math.PI / 180)
        const zRotation = (angle * Math.PI) / 180
        const newRotation = { x: xRotation, y: yRotation, z: zRotation, order: 'XYZ' }

        const branch = generateTree(
          newLen,
          newThickness,
          density,
          lengthFactor,
          thicknessFactor,
          newPosition,
          newRotation,
          level + 1,
          maxLevel,
          maxLeafCount
        )
        branch.angle = angle
        node.branches.push(branch)
      }
    }

    if (currentLeafCount < maxLeafCount && level > 2 && Math.random() < 0.3) {
      const leafCount = 1
      currentLeafCount++
      node.leafSizes = Array(leafCount)
        .fill(0)
        .map(() => Math.random() * 15 + 8)
      node.leafOffsets = Array(leafCount)
        .fill(0)
        .map(() => ({
          x: Math.random() * 15 - 7.5,
          y: Math.random() * 15 - 7.5
        }))
    }

    if (node.branches.length === 0) {
      const angle = Math.random() * 60 - 30
      const newLen = len * lengthFactor * (Math.random() * 0.15 + 0.85)
      const newThickness = thickness * thicknessFactor * (Math.random() * 0.1 + 0.9)
      const newPosition = { x: 0, y: len, z: 0 }
      const newRotation = { x: 0, y: 0, z: (angle * Math.PI) / 180, order: 'XYZ' }

      const branch = generateTree(
        newLen,
        newThickness,
        density,
        lengthFactor,
        thicknessFactor,
        newPosition,
        newRotation,
        level + 1,
        maxLevel,
        maxLeafCount
      )
      branch.angle = angle
      node.branches.push(branch)
    }
  } else if (currentLeafCount < maxLeafCount && Math.random() < 0.5) {
    const leafCount = 1
    currentLeafCount++
    node.leafSizes = Array(leafCount)
      .fill(0)
      .map(() => Math.random() * 15 + 8)
    node.leafOffsets = Array(leafCount)
      .fill(0)
      .map(() => ({
        x: Math.random() * 15 - 7.5,
        y: Math.random() * 15 - 7.5
      }))
  }

  return node
}

self.onmessage = (e: MessageEvent<GenerateTreeParams>) => {
  try {
    currentLeafCount = 0
    const tree = generateTree(
      e.data.len,
      e.data.thickness,
      e.data.density,
      e.data.lengthFactor,
      e.data.thicknessFactor,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0, order: 'XYZ' },
      0,
      e.data.maxLevel,
      e.data.maxLeafCount
    )
    self.postMessage({ type: 'success', data: tree })
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
