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
  regionId: number // -1 表示不属于任何区域，>=0 表示区域ID
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
          isProcessing: false,
          regionId: -1
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

  // 生成随机的表格区域
  generatePresetRegions() {
    // 清除所有文本和区域ID
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c].text = ''
        this.cells[r][c].regionId = -1
      }
    }

    // 随机生成3-6个区域
    const numRegions = this.p5.random(3, 7)

    for (let i = 0; i < numRegions; i++) {
      // 随机区域大小（不一定填满）
      const minRows = 2
      const maxRows = Math.min(8, Math.floor(this.rows / 3))
      const minCols = 2
      const maxCols = Math.min(10, Math.floor(this.cols / 3))

      const regionRows = this.p5.random(minRows, maxRows)
      const regionCols = this.p5.random(minCols, maxCols)

      // 随机起始位置
      const startRow = Math.floor(this.p5.random(0, this.rows - regionRows))
      const startCol = Math.floor(this.p5.random(0, this.cols - regionCols))

      // 随机填充密度（0.3-0.9，即30%-90%的单元格有文本）
      const fillDensity = this.p5.random(0.3, 0.9)
      const regionId = i

      this.fillRandomRegion(startRow, startCol, regionRows, regionCols, regionId, fillDensity)
    }
  }

  private fillRandomRegion(
    startRow: number,
    startCol: number,
    rows: number,
    cols: number,
    regionId: number,
    fillDensity: number
  ) {
    const totalCells = rows * cols
    const cellsToFill = Math.floor(totalCells * fillDensity)
    const filledCells: Array<{ r: number, c: number }> = []

    // 随机选择要填充的单元格
    for (let i = 0; i < cellsToFill; i++) {
      let r: number, c: number
      let attempts = 0
      do {
        r = startRow + Math.floor(this.p5.random(0, rows))
        c = startCol + Math.floor(this.p5.random(0, cols))
        attempts++
      } while (
        filledCells.some(cell => cell.r === r && cell.c === c)
        && attempts < 100
      )

      if (attempts < 100) {
        filledCells.push({ r, c })
        this.cells[r][c].text = `${String.fromCharCode(65 + regionId)}${filledCells.length}`
        this.cells[r][c].regionId = regionId
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
        this.cells[r][c].regionId = -1
      }
    }
  }

  // 获取区域边界（用于绘制红框）
  getRegionBounds(regionId: number): { minRow: number, maxRow: number, minCol: number, maxCol: number } | null {
    let minRow = Infinity
    let maxRow = -Infinity
    let minCol = Infinity
    let maxCol = -Infinity
    let found = false

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c].regionId === regionId && this.cells[r][c].text) {
          found = true
          minRow = Math.min(minRow, r)
          maxRow = Math.max(maxRow, r)
          minCol = Math.min(minCol, c)
          maxCol = Math.max(maxCol, c)
        }
      }
    }

    if (!found) return null

    return { minRow, maxRow, minCol, maxCol }
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
  draw(visitedRegions: Set<number>) {
    const padding = 40

    // 先绘制所有单元格
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

    // 绘制已检测区域的红框
    this.p5.stroke(255, 0, 0)
    this.p5.strokeWeight(3)
    this.p5.noFill()

    for (const regionId of visitedRegions) {
      const bounds = this.getRegionBounds(regionId)
      if (bounds) {
        const x = padding + bounds.minCol * this.cellWidth
        const y = padding + bounds.minRow * this.cellHeight
        const width = (bounds.maxCol - bounds.minCol + 1) * this.cellWidth
        const height = (bounds.maxRow - bounds.minRow + 1) * this.cellHeight
        this.p5.rect(x, y, width, height)
      }
    }
  }
}

// Flood Fill 算法状态
type FloodFillState = {
  isRunning: boolean
  queue: Array<{ row: number, col: number, layer: number }>
  currentLayer: number
  currentRegionId: number // 当前正在检测的区域ID
  visitedRegions: Set<number> // 已检测完成的区域ID集合
  nextStartCell: { row: number, col: number } | null
  frameCounter: number
  speedDelay: number // 帧延迟，用于控制动画速度
}

let grid: Grid
let floodFillState: FloodFillState = {
  isRunning: false,
  queue: [],
  currentLayer: 0,
  currentRegionId: -1,
  visitedRegions: new Set(),
  nextStartCell: null,
  frameCounter: 0,
  speedDelay: 10 // 默认每10帧处理一次
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

    // 重置状态
    grid.reset()

    // 找到第一个有文本的单元格作为起始点（如果点击的是空单元格）
    let startRow = cellPos.row
    let startCol = cellPos.col
    const clickedCell = grid.getCell(startRow, startCol)

    // 如果点击的是空单元格，找到最近的有文本单元格
    if (!clickedCell || !clickedCell.text) {
      let found = false
      for (let r = 0; r < grid.rows && !found; r++) {
        for (let c = 0; c < grid.cols && !found; c++) {
          if (grid.cells[r][c].text) {
            startRow = r
            startCol = c
            found = true
          }
        }
      }
      if (!found) return // 没有找到有文本的单元格
    }

    // 开始检测所有区域
    // 重置所有单元格的 regionId，检测时会重新分配
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.cells[r][c].text) {
          grid.cells[r][c].regionId = -1
        }
      }
    }

    floodFillState = {
      isRunning: true,
      queue: [{ row: startRow, col: startCol, layer: 0 }],
      currentLayer: 0,
      currentRegionId: 0, // 从0开始分配区域ID
      visitedRegions: new Set(),
      nextStartCell: null,
      frameCounter: 0,
      speedDelay: 10
    }
  }
}

function draw(p5: P5CanvasInstance, animationSpeed: number) {
  p5.background(250)

  // 更新单元格大小（响应窗口大小变化）
  grid.updateCellSize()

  // 更新动画速度延迟（速度越小，延迟越大）
  // animationSpeed: 0.1-5，转换为延迟：50-1帧
  floodFillState.speedDelay = Math.max(1, Math.floor(50 / animationSpeed))

  // 清除所有单元格的处理状态（在绘制新帧之前）
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      grid.cells[r][c].isProcessing = false
    }
  }

  // 执行 Flood Fill 算法
  if (floodFillState.isRunning) {
    floodFillState.frameCounter++

    // 根据速度延迟决定是否处理
    if (floodFillState.frameCounter >= floodFillState.speedDelay) {
      floodFillState.frameCounter = 0

      // 如果当前区域队列为空，检查是否还有未检测的区域
      if (floodFillState.queue.length === 0) {
        // 标记当前区域为已访问
        if (floodFillState.currentRegionId >= 0) {
          floodFillState.visitedRegions.add(floodFillState.currentRegionId)
        }

        // 查找下一个未访问的有文本单元格
        let nextCell: { row: number, col: number } | null = null
        for (let r = 0; r < grid.rows && !nextCell; r++) {
          for (let c = 0; c < grid.cols && !nextCell; c++) {
            const cell = grid.cells[r][c]
            if (cell.text && !cell.visited) {
              nextCell = { row: r, col: c }
            }
          }
        }

        if (nextCell) {
          // 开始检测下一个区域，分配新的区域ID
          floodFillState.queue = [{ row: nextCell.row, col: nextCell.col, layer: 0 }]
          floodFillState.currentLayer = 0
          floodFillState.currentRegionId++
        } else {
          // 所有区域都已检测完成
          floodFillState.isRunning = false
        }
      } else {
        // 处理当前队列中的单元格
        const current = floodFillState.queue.shift()!
        const cell = grid.getCell(current.row, current.col)

        if (cell && !cell.visited) {
          // 标记为已访问，并分配当前区域ID
          cell.visited = true
          cell.layer = current.layer
          cell.regionId = floodFillState.currentRegionId
          cell.isProcessing = true // 在当前帧显示高亮边框

          // 获取邻居单元格
          const neighbors = grid.getNeighbors(current.row, current.col)

          // 将未访问且有文本的邻居加入队列（四联通）
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
      }
    }
  }

  // 绘制网格（传入已访问的区域集合用于绘制红框）
  grid.draw(floodFillState.visitedRegions)
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
          currentLayer: 0,
          currentRegionId: -1,
          visitedRegions: new Set(),
          nextStartCell: null,
          frameCounter: 0,
          speedDelay: 10
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
          currentLayer: 0,
          currentRegionId: -1,
          visitedRegions: new Set(),
          nextStartCell: null,
          frameCounter: 0,
          speedDelay: 10
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
        currentLayer: 0,
        currentRegionId: -1,
        visitedRegions: new Set(),
        nextStartCell: null,
        frameCounter: 0,
        speedDelay: 10
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
