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
  draw(visitedRegions: Set<number>, currentLayer: number) {
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
        } else if (cell.visited) {
          // 已访问的单元格
          if (visitedRegions.has(cell.regionId)) {
            // 有效表格区域：浅绿色
            this.p5.fill(200, 255, 200)
          } else if (cell.layer === currentLayer) {
            // 当前遍历的层级：浅黄色
            this.p5.fill(255, 255, 200)
          } else {
            // 检测过但不是表格区域：原来的颜色
            if (cell.text) {
              this.p5.fill(255) // 白色背景
            } else {
              this.p5.fill(240) // 浅灰色背景
            }
          }
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

    // 出发点就是用户点击的单元格
    const startRow = cellPos.row
    const startCol = cellPos.col
    const clickedCell = grid.getCell(startRow, startCol)
    if (!clickedCell) return

    // 开始检测所有区域
    // 重置所有单元格的 regionId，检测时会重新分配
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.cells[r][c].text) {
          grid.cells[r][c].regionId = -1
        }
      }
    }

    // 标记用户点击的单元格为出发点
    clickedCell.isStartPoint = true

    // 如果点击的是有文本的单元格，从该单元格开始BFS
    // 如果点击的是空单元格，也需要从该单元格开始BFS（虽然不会扩散，但出发点要正确）
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

function draw(p5: P5CanvasInstance, animationSpeed: number, minRows: number, minCols: number) {
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
        // 检查当前区域是否满足最小行数和列数要求
        if (floodFillState.currentRegionId >= 0) {
          const bounds = grid.getRegionBounds(floodFillState.currentRegionId)
          if (bounds) {
            const regionRows = bounds.maxRow - bounds.minRow + 1
            const regionCols = bounds.maxCol - bounds.minCol + 1
            // 只有满足最小行数和列数要求的区域才会被标记为有效表格
            if (regionRows >= minRows && regionCols >= minCols) {
              floodFillState.visitedRegions.add(floodFillState.currentRegionId)
            }
          }
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
          // 注意：只有用户点击的单元格才是出发点，自动查找的下一个区域不是出发点
          floodFillState.queue = [{ row: nextCell.row, col: nextCell.col, layer: 0 }]
          floodFillState.currentLayer = 0
          floodFillState.currentRegionId++
        } else {
          // 所有区域都已检测完成
          floodFillState.isRunning = false
        }
      } else {
        // 严格按照BFS：先处理完当前层级的所有单元格，再处理下一层级
        // 获取当前层级的第一个单元格的层级
        const currentLayer = floodFillState.queue[0].layer
        floodFillState.currentLayer = currentLayer

        // 收集当前层级的所有单元格（去重，确保每个单元格只处理一次）
        const currentLayerCells: Array<{ row: number, col: number, layer: number }> = []
        const seenCells = new Set<string>() // 用于去重

        while (floodFillState.queue.length > 0 && floodFillState.queue[0].layer === currentLayer) {
          const cell = floodFillState.queue.shift()!
          const cellKey = `${cell.row},${cell.col}`
          // 只添加未访问且未处理过的单元格
          const gridCell = grid.getCell(cell.row, cell.col)
          if (gridCell && !gridCell.visited && !seenCells.has(cellKey)) {
            currentLayerCells.push(cell)
            seenCells.add(cellKey)
          }
        }

        // 处理当前层级的所有单元格
        for (const current of currentLayerCells) {
          const cell = grid.getCell(current.row, current.col)

          // 再次检查，确保单元格未被访问（防止重复访问）
          if (cell && !cell.visited) {
            // 只有有文本的单元格才会被标记为已访问并继续BFS
            if (cell.text) {
              // 标记为已访问，并分配当前区域ID
              cell.visited = true
              cell.layer = current.layer
              cell.regionId = floodFillState.currentRegionId
              cell.isProcessing = true // 在当前帧显示高亮边框

              // 获取邻居单元格
              const neighbors = grid.getNeighbors(current.row, current.col)

              // 将未访问且有文本的邻居加入队列（四联通），层级为当前层级+1
              // 同时检查队列中是否已存在该单元格，避免重复添加
              for (const neighbor of neighbors) {
                if (!neighbor.visited && neighbor.text) {
                  // 检查队列中是否已存在该单元格
                  const alreadyInQueue = floodFillState.queue.some(
                    item => item.row === neighbor.row && item.col === neighbor.col
                  )
                  if (!alreadyInQueue) {
                    floodFillState.queue.push({
                      row: neighbor.row,
                      col: neighbor.col,
                      layer: current.layer + 1
                    })
                  }
                }
              }
            }
            // 如果点击的是空单元格，它会被标记为出发点但不会被访问，队列会变空
            // 然后在下一帧会查找下一个有文本的单元格
          }
        }
      }
    }
  }

  // 绘制网格（传入已访问的区域集合和当前层级用于绘制）
  grid.draw(floodFillState.visitedRegions, floodFillState.currentLayer)
}

function FloodFillExcel() {
  const gridRef = useRef<Grid | null>(null)
  const resetTriggerRef = useRef(0)
  const randomizeTriggerRef = useRef(0)

  const controls = useControls({
    rows: { value: 20, min: 10, max: 50, step: 1 },
    cols: { value: 30, min: 15, max: 60, step: 1 },
    animationSpeed: { value: 1, min: 0.1, max: 5, step: 0.1 },
    minRows: { value: 2, min: 1, max: 10, step: 1 },
    minCols: { value: 2, min: 1, max: 10, step: 1 },
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
    draw(p5, controls.animationSpeed, controls.minRows, controls.minCols)
  }

  const { sketch } = useP5(setupWithRef, drawWithRef)

  return <ReactP5Wrapper sketch={sketch} />
}

export default FloodFillExcel
