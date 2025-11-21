import { useP5 } from '@/hooks/p5'
import { ReactP5Wrapper, type P5CanvasInstance } from '@p5-wrapper/react'
import { useControls, button } from 'leva'
import { useRef, useEffect } from 'react'

// 单元格类型
type Cell = {
  row: number
  col: number
  text: string
  visited: boolean
  layer: number // -1 表示未访问，>=0 表示访问层级
  isProcessing: boolean
}

// 网格类
class Grid {
  cells: Cell[][]
  rows: number
  cols: number
  cellWidth: number
  cellHeight: number
  private p5: P5CanvasInstance

  constructor(p5: P5CanvasInstance, rows: number, cols: number) {
    this.p5 = p5
    this.rows = rows
    this.cols = cols
    this.cells = []
    this.cellWidth = 0
    this.cellHeight = 0
    this.initializeCells()
  }

  private initializeCells() {
    this.cells = []
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = []
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c] = {
          row: r,
          col: c,
          text: '',
          visited: false,
          layer: -1,
          isProcessing: false
        }
      }
    }
  }

  resize(rows: number, cols: number) {
    this.rows = rows
    this.cols = cols
    this.initializeCells()
    this.generatePresetRegions()
  }

  updateCellSize() {
    const padding = 40
    const availableWidth = this.p5.width - padding * 2
    const availableHeight = this.p5.height - padding * 2
    this.cellWidth = availableWidth / this.cols
    this.cellHeight = availableHeight / this.rows
  }

  // 生成预设的表格区域
  generatePresetRegions() {
    // 清除所有文本
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c].text = ''
      }
    }

    // 区域1: 左上角的小表格 (5x4)
    const region1 = { startRow: 2, startCol: 2, rows: 5, cols: 4, text: 'A' }
    this.fillRegion(region1.startRow, region1.startCol, region1.rows, region1.cols, region1.text)

    // 区域2: 中间的大表格 (6x8)
    const region2 = { startRow: 3, startCol: 10, rows: 6, cols: 8, text: 'B' }
    this.fillRegion(region2.startRow, region2.startCol, region2.rows, region2.cols, region2.text)

    // 区域3: 右侧的表格 (4x5)
    const region3 = { startRow: 2, startCol: 20, rows: 4, cols: 5, text: 'C' }
    this.fillRegion(region3.startRow, region3.startCol, region3.rows, region3.cols, region3.text)

    // 区域4: 底部的小表格 (3x6)
    const region4 = { startRow: 12, startCol: 5, rows: 3, cols: 6, text: 'D' }
    this.fillRegion(region4.startRow, region4.startCol, region4.rows, region4.cols, region4.text)

    // 区域5: 右下角的表格 (5x7)
    const region5 = { startRow: 13, startCol: 18, rows: 5, cols: 7, text: 'E' }
    this.fillRegion(region5.startRow, region5.startCol, region5.rows, region5.cols, region5.text)
  }

  private fillRegion(startRow: number, startCol: number, rows: number, cols: number, text: string) {
    for (let r = startRow; r < startRow + rows && r < this.rows; r++) {
      for (let c = startCol; c < startCol + cols && c < this.cols; c++) {
        this.cells[r][c].text = `${text}${r - startRow + 1}-${c - startCol + 1}`
      }
    }
  }

  // 重置所有单元格的访问状态
  reset() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c].visited = false
        this.cells[r][c].layer = -1
        this.cells[r][c].isProcessing = false
      }
    }
  }

  // 获取单元格
  getCell(row: number, col: number): Cell | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null
    }
    return this.cells[row][col]
  }

  // 获取四个方向的邻居
  getNeighbors(row: number, col: number): Cell[] {
    const neighbors: Cell[] = []
    const directions = [
      { r: -1, c: 0 }, // 上
      { r: 1, c: 0 }, // 下
      { r: 0, c: -1 }, // 左
      { r: 0, c: 1 } // 右
    ]

    for (const dir of directions) {
      const cell = this.getCell(row + dir.r, col + dir.c)
      if (cell) {
        neighbors.push(cell)
      }
    }

    return neighbors
  }

  // 将屏幕坐标转换为单元格坐标
  screenToCell(x: number, y: number): { row: number, col: number } | null {
    const padding = 40
    const cellX = x - padding
    const cellY = y - padding

    if (cellX < 0 || cellY < 0) return null

    const col = Math.floor(cellX / this.cellWidth)
    const row = Math.floor(cellY / this.cellHeight)

    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null
    }

    return { row, col }
  }

  // 绘制网格
  draw() {
    const padding = 40

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c]
        const x = padding + c * this.cellWidth
        const y = padding + r * this.cellHeight

        // 根据单元格状态选择颜色
        if (cell.visited) {
          // 已访问：根据层级使用不同颜色
          const layerColors = [
            [100, 150, 255], // 第0层 - 蓝色
            [100, 255, 150], // 第1层 - 绿色
            [255, 255, 100], // 第2层 - 黄色
            [255, 150, 100], // 第3层 - 橙色
            [255, 100, 150], // 第4层 - 粉色
            [200, 100, 255], // 第5层 - 紫色
          ]
          const colorIndex = Math.min(cell.layer, layerColors.length - 1)
          const color = layerColors[colorIndex]
          this.p5.fill(color[0], color[1], color[2], 200)
        } else if (cell.text) {
          // 未访问有文本：白色背景
          this.p5.fill(255)
        } else {
          // 未访问无文本：浅灰色背景
          this.p5.fill(240)
        }

        // 绘制单元格背景
        this.p5.noStroke()
        this.p5.rect(x, y, this.cellWidth, this.cellHeight)

        // 绘制边框
        if (cell.isProcessing) {
          // 当前处理：高亮边框
          this.p5.stroke(255, 0, 0)
          this.p5.strokeWeight(3)
        } else {
          this.p5.stroke(200)
          this.p5.strokeWeight(1)
        }
        this.p5.noFill()
        this.p5.rect(x, y, this.cellWidth, this.cellHeight)

        // 绘制文本
        if (cell.text) {
          this.p5.fill(cell.visited ? 255 : 0)
          this.p5.noStroke()
          this.p5.textAlign(this.p5.LEFT, this.p5.TOP)
          this.p5.textSize(Math.min(this.cellWidth, this.cellHeight) * 0.3)
          this.p5.text(cell.text, x + 4, y + 4)
        }
      }
    }
  }
}

// Flood Fill 算法状态
type FloodFillState = {
  isRunning: boolean
  queue: Array<{ row: number, col: number, layer: number }>
  currentLayer: number
}

let grid: Grid
let floodFillState: FloodFillState = {
  isRunning: false,
  queue: [],
  currentLayer: 0
}

function setup(p5: P5CanvasInstance) {
  p5.createCanvas(window.innerWidth, window.innerHeight)
  grid = new Grid(p5, 20, 30)
  grid.updateCellSize()
  grid.generatePresetRegions()

  p5.mousePressed = () => {
    if (floodFillState.isRunning) return

    const cellPos = grid.screenToCell(p5.mouseX, p5.mouseY)
    if (!cellPos) return

    const cell = grid.getCell(cellPos.row, cellPos.col)
    if (!cell || !cell.text) return

    // 重置状态
    grid.reset()
    floodFillState = {
      isRunning: true,
      queue: [{ row: cellPos.row, col: cellPos.col, layer: 0 }],
      currentLayer: 0
    }
  }
}

function draw(p5: P5CanvasInstance, animationSpeed: number) {
  p5.background(250)

  // 更新单元格大小（响应窗口大小变化）
  grid.updateCellSize()

  // 清除所有单元格的处理状态（在绘制新帧之前）
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      grid.cells[r][c].isProcessing = false
    }
  }

  // 执行 Flood Fill 算法
  if (floodFillState.isRunning && floodFillState.queue.length > 0) {
    // 根据动画速度决定每帧处理的单元格数量
    const cellsPerFrame = Math.max(1, Math.floor(animationSpeed))

    for (let i = 0; i < cellsPerFrame && floodFillState.queue.length > 0; i++) {
      const current = floodFillState.queue.shift()!
      const cell = grid.getCell(current.row, current.col)

      if (!cell || cell.visited) continue

      // 标记为已访问
      cell.visited = true
      cell.layer = current.layer
      cell.isProcessing = true // 在当前帧显示高亮边框

      // 获取邻居单元格
      const neighbors = grid.getNeighbors(current.row, current.col)

      // 将未访问且有文本的邻居加入队列
      for (const neighbor of neighbors) {
        if (!neighbor.visited && neighbor.text) {
          floodFillState.queue.push({
            row: neighbor.row,
            col: neighbor.col,
            layer: current.layer + 1
          })
        }
      }
    }

    // 如果队列为空，算法完成
    if (floodFillState.queue.length === 0) {
      floodFillState.isRunning = false
    }
  }

  // 绘制网格
  grid.draw()
}

function FloodFillExcel() {
  const gridRef = useRef<Grid | null>(null)
  const resetTriggerRef = useRef(0)
  const randomizeTriggerRef = useRef(0)

  const controls = useControls({
    rows: { value: 20, min: 10, max: 50, step: 1 },
    cols: { value: 30, min: 15, max: 60, step: 1 },
    animationSpeed: { value: 1, min: 0.1, max: 5, step: 0.1 },
    reset: button(() => {
      resetTriggerRef.current++
      if (gridRef.current) {
        gridRef.current.reset()
        floodFillState = {
          isRunning: false,
          queue: [],
          currentLayer: 0
        }
      }
    }),
    randomize: button(() => {
      randomizeTriggerRef.current++
      if (gridRef.current) {
        gridRef.current.generatePresetRegions()
        gridRef.current.reset()
        floodFillState = {
          isRunning: false,
          queue: [],
          currentLayer: 0
        }
      }
    })
  })

  // 响应行数和列数变化
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.resize(controls.rows, controls.cols)
      gridRef.current.updateCellSize()
      floodFillState = {
        isRunning: false,
        queue: [],
        currentLayer: 0
      }
    }
  }, [controls.rows, controls.cols])

  function setupWithRef(p5: P5CanvasInstance) {
    setup(p5)
    gridRef.current = grid
  }

  function drawWithRef(p5: P5CanvasInstance) {
    draw(p5, controls.animationSpeed)
  }

  const { sketch } = useP5(setupWithRef, drawWithRef)

  return <ReactP5Wrapper sketch={sketch} />
}

export default FloodFillExcel
