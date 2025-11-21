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
  layer: number // -1 表示未访问，>=0 表示访问层级（从起始点的距离）
  isProcessing: boolean
  regionId: number // -1 表示不属于任何区域，>=0 表示区域ID
  isStartPoint: boolean // 是否为出发点
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
          regionId: -1,
          isStartPoint: false
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
        this.cells[r][c].isStartPoint = false
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
  draw(validRegions: Set<number>) {
    const padding = 40

    // 先绘制所有单元格
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c]
        const x = padding + c * this.cellWidth
        const y = padding + r * this.cellHeight

        // 根据单元格状态选择颜色
        if (cell.isStartPoint) {
          // 出发点：浅红色
          this.p5.fill(255, 200, 200)
        } else if (cell.isProcessing) {
          // 当前正在处理的单元格（当前层级）：浅黄色
          this.p5.fill(255, 255, 200)
        } else if (cell.visited) {
          // 已访问的单元格
          if (validRegions.has(cell.regionId)) {
            // 有效表格区域：浅绿色
            this.p5.fill(200, 255, 200)
          } else {
            // 检测过但还未判定是否有效：浅蓝色
            this.p5.fill(200, 220, 255)
          }
        } else {
          // 未访问：白色背景（无论是否有文本）
          this.p5.fill(255)
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

        // 绘制文本（始终保持黑色，不随单元格状态改变）
        if (cell.text) {
          this.p5.fill(0)
          this.p5.noStroke()
          this.p5.textAlign(this.p5.LEFT, this.p5.TOP)
          this.p5.textSize(Math.min(this.cellWidth, this.cellHeight) * 0.3)
          this.p5.text(cell.text, x + 4, y + 4)
        }
      }
    }

    // 绘制有效区域的红框
    this.p5.stroke(255, 0, 0)
    this.p5.strokeWeight(3)
    this.p5.noFill()

    for (const regionId of validRegions) {
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
  queue: Array<{ row: number, col: number, layer: number }> // BFS 队列，存储位置和层级
  visited: Set<string> // 已访问的单元格，格式为 "row,col"
  currentRegion: Array<[number, number]> // 当前区域的所有单元格
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
  currentRegionId: number // 当前正在检测的区域ID
  validRegions: Array<{ id: number, bounds: { minRow: number, maxRow: number, minCol: number, maxCol: number } }> // 有效的区域列表
  frameCounter: number
  speedDelay: number // 帧延迟，用于控制动画速度
  startPoint: { row: number, col: number } | null // 用户点击的起始点
  searchingNext: boolean // 是否正在查找下一个未访问的单元格
  currentLayer: number // 当前正在处理的层级
}

let grid: Grid
let floodFillState: FloodFillState = {
  isRunning: false,
  queue: [],
  visited: new Set(),
  currentRegion: [],
  minRow: Infinity,
  maxRow: -Infinity,
  minCol: Infinity,
  maxCol: -Infinity,
  currentRegionId: 0,
  validRegions: [],
  frameCounter: 0,
  speedDelay: 10,
  startPoint: null,
  searchingNext: false,
  currentLayer: -1
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

    const startRow = cellPos.row
    const startCol = cellPos.col
    const clickedCell = grid.getCell(startRow, startCol)
    if (!clickedCell) return

    // 标记用户点击的单元格为出发点
    clickedCell.isStartPoint = true

    // 初始化 flood fill 状态，无论点击的是否有文本都从该点开始
    floodFillState = {
      isRunning: true,
      queue: [{ row: startRow, col: startCol, layer: 0 }],
      visited: new Set(),
      currentRegion: [],
      minRow: Infinity,
      maxRow: -Infinity,
      minCol: Infinity,
      maxCol: -Infinity,
      currentRegionId: 0,
      validRegions: [],
      frameCounter: 0,
      speedDelay: 10,
      startPoint: { row: startRow, col: startCol },
      searchingNext: false,
      currentLayer: 0
    }
  }
}

function draw(p5: P5CanvasInstance, animationSpeed: number, minRows: number, minCols: number) {
  p5.background(250)

  // 更新单元格大小（响应窗口大小变化）
  grid.updateCellSize()

  // 更新动画速度延迟（速度越小，延迟越大）
  // animationSpeed: 0.1-5，转换为延迟：50-1帧
  floodFillState.speedDelay = Math.max(1, Math.floor(50 / animationSpeed))

  // 执行 Flood Fill 算法 (严格按照 detectTableRegions 的逻辑)
  if (floodFillState.isRunning) {
    floodFillState.frameCounter++

    // 根据速度延迟决定是否处理
    if (floodFillState.frameCounter >= floodFillState.speedDelay) {
      floodFillState.frameCounter = 0

      // 如果正在查找下一个未访问的单元格
      if (floodFillState.searchingNext) {
        let found = false
        for (let r = 0; r < grid.rows && !found; r++) {
          for (let c = 0; c < grid.cols && !found; c++) {
            const cellKey = `${r},${c}`
            const cell = grid.getCell(r, c)
            if (cell && cell.text && !floodFillState.visited.has(cellKey)) {
              // 找到下一个未访问的有文本单元格，开始新区域的BFS
              floodFillState.queue = [{ row: r, col: c, layer: 0 }]
              floodFillState.currentRegion = []
              floodFillState.minRow = r
              floodFillState.maxRow = r
              floodFillState.minCol = c
              floodFillState.maxCol = c
              floodFillState.currentRegionId++
              floodFillState.searchingNext = false
              floodFillState.currentLayer = 0
              found = true
            }
          }
        }

        if (!found) {
          // 没有找到更多区域，算法结束
          floodFillState.isRunning = false
        }
        return
      }

      // 如果当前区域的队列为空，检查当前区域是否有效
      if (floodFillState.queue.length === 0) {
        if (floodFillState.currentRegion.length > 0) {
          // 检查当前区域大小是否满足最小要求
          const rowCount = floodFillState.maxRow - floodFillState.minRow + 1
          const colCount = floodFillState.maxCol - floodFillState.minCol + 1

          if (rowCount >= minRows && colCount >= minCols) {
            // 标记当前区域为有效区域
            floodFillState.validRegions.push({
              id: floodFillState.currentRegionId,
              bounds: {
                minRow: floodFillState.minRow,
                maxRow: floodFillState.maxRow,
                minCol: floodFillState.minCol,
                maxCol: floodFillState.maxCol
              }
            })

            // 为当前区域的所有单元格分配区域ID
            for (const [row, col] of floodFillState.currentRegion) {
              const cell = grid.getCell(row, col)
              if (cell) {
                cell.regionId = floodFillState.currentRegionId
              }
            }
          }
        }

        // 开始查找下一个区域
        floodFillState.searchingNext = true
        return
      }

      // 处理队列中的下一个单元格（每次只处理一个）
      if (floodFillState.queue.length === 0) return

      const current = floodFillState.queue.shift()!
      const cellKey = `${current.row},${current.col}`
      const cell = grid.getCell(current.row, current.col)

      // 检查单元格是否已访问或无效
      if (!cell || floodFillState.visited.has(cellKey)) {
        return
      }

      // 检查单元格是否有文本（严格遵循 detectTableRegions 的逻辑）
      if (!cell.text) {
        // 空单元格直接标记为已访问，但不加入区域，也不扩展
        floodFillState.visited.add(cellKey)
        cell.visited = true
        cell.layer = current.layer
        return
      }

      floodFillState.currentLayer = current.layer

      // 清除之前的处理状态
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          grid.cells[r][c].isProcessing = false
        }
      }

      // 标记为已访问
      floodFillState.visited.add(cellKey)
      cell.visited = true
      cell.layer = current.layer
      cell.isProcessing = true // 标记为当前正在处理

      // 将有文本的单元格加入当前区域并更新边界
      floodFillState.currentRegion.push([current.row, current.col])
      floodFillState.minRow = Math.min(floodFillState.minRow, current.row)
      floodFillState.maxRow = Math.max(floodFillState.maxRow, current.row)
      floodFillState.minCol = Math.min(floodFillState.minCol, current.col)
      floodFillState.maxCol = Math.max(floodFillState.maxCol, current.col)

      // 检查四个方向的邻居（上下左右）
      const neighbors: Array<[number, number]> = [
        [current.row - 1, current.col], // 上
        [current.row + 1, current.col], // 下
        [current.row, current.col - 1], // 左
        [current.row, current.col + 1] // 右
      ]

      for (const [nr, nc] of neighbors) {
        const neighborKey = `${nr},${nc}`
        const neighborCell = grid.getCell(nr, nc)

        // 检查邻居是否在范围内、未访问、且有文本（严格遵循 detectTableRegions 的逻辑）
        if (
          nr >= 0 && nr < grid.rows
          && nc >= 0 && nc < grid.cols
          && neighborCell
          && !floodFillState.visited.has(neighborKey)
          && neighborCell.text // 只有邻居有文本时才加入队列（关键！）
        ) {
          // 检查队列中是否已存在该邻居
          const alreadyInQueue = floodFillState.queue.some(
            item => item.row === nr && item.col === nc
          )
          if (!alreadyInQueue) {
            floodFillState.queue.push({ row: nr, col: nc, layer: current.layer + 1 })
          }
        }
      }
    }
  }

  // 绘制网格（传入有效区域集合用于绘制）
  const validRegionIds = new Set(floodFillState.validRegions.map(r => r.id))
  grid.draw(validRegionIds)
}

function FloodFillExcel() {
  const gridRef = useRef<Grid | null>(null)
  const resetTriggerRef = useRef(0)
  const randomizeTriggerRef = useRef(0)

  const controls = useControls({
    rows: { value: 20, min: 10, max: 50, step: 1 },
    cols: { value: 30, min: 15, max: 60, step: 1 },
    animationSpeed: { value: 6, min: 1, max: 15, step: 0.1 },
    minRows: { value: 2, min: 1, max: 10, step: 1 },
    minCols: { value: 2, min: 1, max: 10, step: 1 },
    reset: button(() => {
      resetTriggerRef.current++
      if (gridRef.current) {
        gridRef.current.reset()
        floodFillState = {
          isRunning: false,
          queue: [],
          visited: new Set(),
          currentRegion: [],
          minRow: Infinity,
          maxRow: -Infinity,
          minCol: Infinity,
          maxCol: -Infinity,
          currentRegionId: 0,
          validRegions: [],
          frameCounter: 0,
          speedDelay: 10,
          startPoint: null,
          searchingNext: false,
          currentLayer: -1
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
          visited: new Set(),
          currentRegion: [],
          minRow: Infinity,
          maxRow: -Infinity,
          minCol: Infinity,
          maxCol: -Infinity,
          currentRegionId: 0,
          validRegions: [],
          frameCounter: 0,
          speedDelay: 10,
          startPoint: null,
          searchingNext: false,
          currentLayer: -1
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
        visited: new Set(),
        currentRegion: [],
        minRow: Infinity,
        maxRow: -Infinity,
        minCol: Infinity,
        maxCol: -Infinity,
        currentRegionId: 0,
        validRegions: [],
        frameCounter: 0,
        speedDelay: 10,
        startPoint: null,
        searchingNext: false,
        currentLayer: -1
      }
    }
  }, [controls.rows, controls.cols])

  function setupWithRef(p5: P5CanvasInstance) {
    setup(p5)
    gridRef.current = grid
  }

  function drawWithRef(p5: P5CanvasInstance) {
    draw(p5, controls.animationSpeed, controls.minRows, controls.minCols)
  }

  const { sketch } = useP5(setupWithRef, drawWithRef)

  return <ReactP5Wrapper sketch={sketch} />
}

export default FloodFillExcel
