import { EmbeddingInfo } from "typings/api"
import { PageJobInfo } from "typings/queue"
import ExcelJS from 'exceljs'
import { getEmbeddings } from './api/embedding'

/**
 * 列数据类型信息
 */
export interface ColumnDataTypeInfo {
  /** 列号（从1开始） */
  columnNumber: number
  /** 列名（如 A, B, C） */
  columnName: string
  /** 主要数据类型 */
  primaryType: 'number' | 'date' | 'boolean' | 'text' | 'empty' | 'mixed'
  /** 各类型统计 */
  typeStats: {
    number: number
    date: number
    boolean: number
    text: number
    empty: number
  }
  /** 总非空单元格数 */
  totalNonEmpty: number
}

/**
 * 表格区域信息
 */
export interface TableRegion {
  /** 区域左上角行号（从1开始） */
  top: number
  /** 区域左上角列号（从1开始） */
  left: number
  /** 区域右下角行号（从1开始） */
  bottom: number
  /** 区域右下角列号（从1开始） */
  right: number
  /** 检测到的表头行号（相对于top，从1开始），如果没有表头则为null */
  headerRow: number | null
  /** 数据行数（不包括表头） */
  dataRowCount: number
}

/**
 * 判断单个sheet中每个列的大致数据类型
 * @param sheet Excel工作表对象
 * @returns 每列的数据类型信息数组
 */
export function analyzeSheetColumnTypes(sheet: ExcelJS.Worksheet): ColumnDataTypeInfo[] {
  const results: ColumnDataTypeInfo[] = []

  if (!sheet.dimensions) {
    WIKI.logger.warn(`[analyzeSheetColumnTypes]: 工作表 ${sheet.name} 没有维度信息`)
    return results
  }

  const { top, left, bottom, right } = sheet.dimensions

  // 遍历每一列
  for (let colNum = left; colNum <= right; colNum++) {
    const columnName = getColumnName(colNum)
    const typeStats = {
      number: 0,
      date: 0,
      boolean: 0,
      text: 0,
      empty: 0
    }

    // 遍历该列的每个单元格
    for (let rowNum = top; rowNum <= bottom; rowNum++) {
      const cell = sheet.getCell(rowNum, colNum)
      const cellValue = cell.value

      // 判断单元格值的类型
      if (cellValue === null || cellValue === undefined) {
        typeStats.empty++
      } else if (cellValue instanceof Date) {
        typeStats.date++
      } else if (typeof cellValue === 'boolean') {
        typeStats.boolean++
      } else if (typeof cellValue === 'number') {
        typeStats.number++
      } else if (cell.formula) {
        // 公式单元格，尝试判断结果类型
        if (typeof cell.result === 'number') {
          typeStats.number++
        } else if (cell.result instanceof Date) {
          typeStats.date++
        } else if (typeof cell.result === 'boolean') {
          typeStats.boolean++
        } else {
          typeStats.text++
        }
      } else {
        // 文本类型或其他
        const strValue = String(cellValue)
        // 尝试判断是否为数字字符串
        if (strValue.trim() !== '' && !isNaN(Number(strValue)) && strValue.trim() === String(Number(strValue))) {
          typeStats.number++
        } else {
          typeStats.text++
        }
      }
    }

    const totalNonEmpty = typeStats.number + typeStats.date + typeStats.boolean + typeStats.text

    // 确定主要数据类型
    let primaryType: ColumnDataTypeInfo['primaryType'] = 'empty'
    if (totalNonEmpty === 0) {
      primaryType = 'empty'
    } else {
      // 找出出现次数最多的类型
      const maxCount = Math.max(
        typeStats.number,
        typeStats.date,
        typeStats.boolean,
        typeStats.text
      )

      if (typeStats.number === maxCount) {
        primaryType = 'number'
      } else if (typeStats.date === maxCount) {
        primaryType = 'date'
      } else if (typeStats.boolean === maxCount) {
        primaryType = 'boolean'
      } else if (typeStats.text === maxCount) {
        primaryType = 'text'
      }

      // 如果存在多种类型且没有明显的主要类型，标记为混合类型
      const typeCount = [
        typeStats.number > 0,
        typeStats.date > 0,
        typeStats.boolean > 0,
        typeStats.text > 0
      ].filter(Boolean).length

      if (typeCount > 1 && maxCount / totalNonEmpty < 0.5) {
        primaryType = 'mixed'
      }
    }

    results.push({
      columnNumber: colNum,
      columnName,
      primaryType,
      typeStats,
      totalNonEmpty
    })
  }

  return results
}

/**
 * 判断工作表中的列是否主要为文本类型
 * @param columnTypes 列类型信息数组
 * @returns 是否主要为文本类型
 */
function isTextSheet(columnTypes: ColumnDataTypeInfo[]): boolean {
  const textCount = columnTypes.filter(column => column.primaryType === 'text').length
  const totalCount = columnTypes.length
  return textCount / totalCount > 0.5
}

/**
 * 获取工作表中的非空单元格总数
 * @param columnTypes 列类型信息数组
 * @returns 非空单元格总数
 */
function getNonEmptyCellCount(columnTypes: ColumnDataTypeInfo[]): number {
  return columnTypes.reduce((sum, column) => sum + column.totalNonEmpty, 0)
}

/**
 * 基于列类型信息统计当前表的行数
 * 通过查找所有列中 totalNonEmpty 的最大值来判断最大行数
 * @param columnTypes 列类型信息数组
 * @returns 表的行数（基于最大非空单元格数）
 */
export function getSheetRowCount(columnTypes: ColumnDataTypeInfo[]): number {
  if (!columnTypes || columnTypes.length === 0) {
    return 0
  }

  // 找到所有列中 totalNonEmpty 的最大值
  const maxNonEmpty = Math.max(...columnTypes.map(column => column.totalNonEmpty))

  return maxNonEmpty
}

/**
 * 将列号转换为列名（如 1 -> A, 2 -> B, 27 -> AA）
 * @param colNum 列号（从1开始）
 * @returns 列名
 */
function getColumnName(colNum: number): string {
  let result = ''
  while (colNum > 0) {
    colNum--
    result = String.fromCharCode(65 + (colNum % 26)) + result
    colNum = Math.floor(colNum / 26)
  }
  return result
}

/**
 * 检测表格区域中的表头行
 * @param sheet Excel工作表对象
 * @param top 区域顶部行号
 * @param bottom 区域底部行号
 * @param left 区域左侧列号
 * @param right 区域右侧列号
 * @returns 表头行号（相对于top，从1开始），如果没有检测到表头则返回null
 */
function detectHeaderRow(
  sheet: ExcelJS.Worksheet,
  top: number,
  bottom: number,
  left: number,
  right: number
): number | null {
  // 检查前3行，找出最可能是表头的行
  const checkRows = Math.min(3, bottom - top + 1)
  let bestHeaderRow: number | null = null
  let bestScore = 0

  for (let offset = 0; offset < checkRows; offset++) {
    const rowNum = top + offset
    let textCount = 0
    let numberCount = 0
    let emptyCount = 0
    let totalCells = 0

    // 分析该行的数据类型分布
    for (let colNum = left; colNum <= right; colNum++) {
      const cell = sheet.getCell(rowNum, colNum)
      const value = cell.value
      totalCells++

      if (value === null || value === undefined || String(value).trim() === '') {
        emptyCount++
      } else if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && String(value).trim() === String(Number(value)))) {
        numberCount++
      } else {
        textCount++
      }
    }

    // 计算表头得分：
    // 1. 文本比例高（>50%）更可能是表头
    // 2. 非空单元格比例高（>70%）更可能是表头
    // 3. 数字比例低（<30%）更可能是表头
    const textRatio = textCount / totalCells
    const nonEmptyRatio = (totalCells - emptyCount) / totalCells
    const numberRatio = numberCount / totalCells

    let score = 0
    if (textRatio > 0.5) score += 3
    if (textRatio > 0.7) score += 2
    if (nonEmptyRatio > 0.7) score += 2
    if (numberRatio < 0.3) score += 2
    if (offset === 0) score += 1 // 第一行更可能是表头

    if (score > bestScore) {
      bestScore = score
      bestHeaderRow = offset + 1 // 返回相对于top的偏移量（从1开始）
    }
  }

  // 如果得分足够高（>=5），认为找到了表头
  return bestScore >= 5 ? bestHeaderRow : null
}

/**
 * 检测sheet中的多个独立表格区域
 * @param sheet Excel工作表对象
 * @param minRows 最小行数阈值，少于此行数的区域会被忽略，默认为2
 * @param minCols 最小列数阈值，少于此列数的区域会被忽略，默认为2
 * @returns 检测到的表格区域数组
 */
export function detectTableRegions(
  sheet: ExcelJS.Worksheet,
  minRows: number = 2,
  minCols: number = 2
): TableRegion[] {
  if (!sheet.dimensions) {
    WIKI.logger.warn(`[detectTableRegions]: 工作表 ${sheet.name} 没有维度信息`)
    return []
  }

  const { top, left, bottom, right } = sheet.dimensions
  const regions: TableRegion[] = []

  // 创建一个集合标记已访问的单元格
  const visited = new Set<string>()

  // 检查单元格是否有值
  const hasValue = (row: number, col: number): boolean => {
    const cell = sheet.getCell(row, col)
    const value = cell.value
    return value !== null && value !== undefined && String(value).trim() !== ''
  }

  // 查找连续的数据区域（使用洪水填充算法）
  const findRegion = (startRow: number, startCol: number): TableRegion | null => {
    const key = `${startRow},${startCol}`
    if (visited.has(key) || !hasValue(startRow, startCol)) {
      return null
    }

    // 使用BFS找到所有连通的非空单元格
    const queue: [number, number][] = [[startRow, startCol]]
    let minRow = startRow, maxRow = startRow
    let minCol = startCol, maxCol = startCol

    while (queue.length > 0) {
      const [row, col] = queue.shift()!
      const cellKey = `${row},${col}`

      if (visited.has(cellKey) || !hasValue(row, col)) {
        continue
      }

      visited.add(cellKey)

      minRow = Math.min(minRow, row)
      maxRow = Math.max(maxRow, row)
      minCol = Math.min(minCol, col)
      maxCol = Math.max(maxCol, col)

      // 检查相邻单元格（上下左右）
      const neighbors = [
        [row - 1, col], [row + 1, col],
        [row, col - 1], [row, col + 1]
      ]

      for (const [nr, nc] of neighbors) {
        if (nr >= top && nr <= bottom && nc >= left && nc <= right) {
          const neighborKey = `${nr},${nc}`
          if (!visited.has(neighborKey) && hasValue(nr, nc)) {
            queue.push([nr, nc])
          }
        }
      }
    }

    // 检查区域大小是否满足最小要求
    const rowCount = maxRow - minRow + 1
    const colCount = maxCol - minCol + 1

    if (rowCount < minRows || colCount < minCols) {
      return null
    }

    // 检测表头
    const headerRow = detectHeaderRow(sheet, minRow, maxRow, minCol, maxCol)

    return {
      top: minRow,
      left: minCol,
      bottom: maxRow,
      right: maxCol,
      headerRow: headerRow,
      dataRowCount: headerRow !== null ? maxRow - minRow + 1 - headerRow : rowCount
    }
  }

  // 遍历整个sheet，查找所有独立的表格区域
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const region = findRegion(row, col)
      if (region) {
        regions.push(region)
        WIKI.logger.info(`[detectTableRegions]: 检测到表格区域: ${getColumnName(region.left)}${region.top}:${getColumnName(region.right)}${region.bottom}, 表头行: ${region.headerRow || '无'}`)
      }
    }
  }

  // 过滤包含关系：如果一个区域完全被另一个区域包含，保留较大的区域，过滤掉被包含的小区域
  if (regions.length <= 1) {
    return regions
  }

  // 计算每个区域的面积
  const regionAreas = regions.map(r => ({
    region: r,
    area: (r.bottom - r.top + 1) * (r.right - r.left + 1)
  }))

  // 按面积从大到小排序
  regionAreas.sort((a, b) => b.area - a.area)

  // 标记需要排除的区域（被其他区域包含的小区域）
  const excludeSet = new Set<number>()

  // 检查每个区域是否被其他更大的区域包含
  for (let i = 0; i < regionAreas.length; i++) {
    const current = regionAreas[i]

    // 检查当前区域是否被更大的区域包含
    for (let j = 0; j < i; j++) {
      const larger = regionAreas[j]

      // 检查 current 是否完全被 larger 包含
      if (
        current.region.top >= larger.region.top &&
        current.region.bottom <= larger.region.bottom &&
        current.region.left >= larger.region.left &&
        current.region.right <= larger.region.right
      ) {
        // current 被 larger 完全包含，标记 current 需要排除
        excludeSet.add(i)
        WIKI.logger.info(`[detectTableRegions]: 区域 ${getColumnName(current.region.left)}${current.region.top}:${getColumnName(current.region.right)}${current.region.bottom} 被区域 ${getColumnName(larger.region.left)}${larger.region.top}:${getColumnName(larger.region.right)}${larger.region.bottom} 包含，将排除小区域`)
        break // 找到一个包含它的大区域就足够了
      }
    }
  }

  // 过滤掉被标记的区域
  const filteredRegions = regionAreas
    .filter((_, index) => !excludeSet.has(index))
    .map(item => item.region)

  WIKI.logger.info(`[detectTableRegions]: 过滤前区域数: ${regions.length}, 过滤后区域数: ${filteredRegions.length}`)

  return filteredRegions
}

/**
 * 提取表格区域的CSV内容
 * @param sheet Excel工作表对象
 * @param region 表格区域信息
 * @param options CSV转换选项
 * @returns CSV格式的字符串数组
 */
export function regionToCSV(
  sheet: ExcelJS.Worksheet,
  region: TableRegion,
  options: SheetToCSVOptions = {}
): string[] {
  const {
    delimiter = ',',
    includeEmptyRows = false,
    dateFormat = 'YYYY-MM-DD',
    skipEmptyRows = false
  } = options

  const csvRows: string[] = []

  // 格式化单元格值（复用原有逻辑）
  const formatCellValue = (cell: ExcelJS.Cell): string => {
    const value = cell.value

    if (value === null || value === undefined) {
      return ''
    }

    if (cell.formula && cell.result !== undefined) {
      return formatCellValue({ ...cell, value: cell.result } as ExcelJS.Cell)
    }

    if (value instanceof Date) {
      const year = value.getFullYear()
      const month = String(value.getMonth() + 1).padStart(2, '0')
      const day = String(value.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE'
    }

    if (typeof value === 'number') {
      return String(value)
    }

    if (typeof value === 'object' && 'richText' in value) {
      const richText = value as ExcelJS.CellRichTextValue
      return richText.richText.map(rt => rt.text).join('')
    }

    let strValue = String(value)
    if (strValue.includes(delimiter) || strValue.includes('\n') || strValue.includes('\r') || strValue.includes('"')) {
      strValue = `"${strValue.replace(/"/g, '""')}"`
    }

    return strValue
  }

  // 遍历区域内的每一行
  for (let rowNum = region.top; rowNum <= region.bottom; rowNum++) {
    const rowValues: string[] = []

    for (let colNum = region.left; colNum <= region.right; colNum++) {
      const cell = sheet.getCell(rowNum, colNum)
      const cellValue = formatCellValue(cell)
      rowValues.push(cellValue)
    }

    const isEmptyRow = rowValues.every(val => val === '')

    if (isEmptyRow && (skipEmptyRows || !includeEmptyRows)) {
      continue
    }

    csvRows.push(rowValues.join(delimiter))
  }

  return csvRows
}

/**
 * 分析表格区域的列类型（排除表头行）
 * @param sheet Excel工作表对象
 * @param region 表格区域信息
 * @returns 每列的数据类型信息数组
 */
export function analyzeRegionColumnTypes(sheet: ExcelJS.Worksheet, region: TableRegion): ColumnDataTypeInfo[] {
  const results: ColumnDataTypeInfo[] = []

  for (let colNum = region.left; colNum <= region.right; colNum++) {
    const columnName = getColumnName(colNum)
    const typeStats = {
      number: 0,
      date: 0,
      boolean: 0,
      text: 0,
      empty: 0
    }

    // 只分析数据行（排除表头）
    const startRow = region.headerRow !== null ? region.top + region.headerRow : region.top
    for (let rowNum = startRow; rowNum <= region.bottom; rowNum++) {
      const cell = sheet.getCell(rowNum, colNum)
      const cellValue = cell.value

      if (cellValue === null || cellValue === undefined) {
        typeStats.empty++
      } else if (cellValue instanceof Date) {
        typeStats.date++
      } else if (typeof cellValue === 'boolean') {
        typeStats.boolean++
      } else if (typeof cellValue === 'number') {
        typeStats.number++
      } else if (cell.formula) {
        if (typeof cell.result === 'number') {
          typeStats.number++
        } else if (cell.result instanceof Date) {
          typeStats.date++
        } else if (typeof cell.result === 'boolean') {
          typeStats.boolean++
        } else {
          typeStats.text++
        }
      } else {
        const strValue = String(cellValue)
        if (strValue.trim() !== '' && !isNaN(Number(strValue)) && strValue.trim() === String(Number(strValue))) {
          typeStats.number++
        } else {
          typeStats.text++
        }
      }
    }

    const totalNonEmpty = typeStats.number + typeStats.date + typeStats.boolean + typeStats.text
    let primaryType: ColumnDataTypeInfo['primaryType'] = 'empty'

    if (totalNonEmpty > 0) {
      const maxCount = Math.max(typeStats.number, typeStats.date, typeStats.boolean, typeStats.text)
      if (typeStats.number === maxCount) {
        primaryType = 'number'
      } else if (typeStats.date === maxCount) {
        primaryType = 'date'
      } else if (typeStats.boolean === maxCount) {
        primaryType = 'boolean'
      } else if (typeStats.text === maxCount) {
        primaryType = 'text'
      }

      const typeCount = [
        typeStats.number > 0,
        typeStats.date > 0,
        typeStats.boolean > 0,
        typeStats.text > 0
      ].filter(Boolean).length

      if (typeCount > 1 && maxCount / totalNonEmpty < 0.5) {
        primaryType = 'mixed'
      }
    }

    results.push({
      columnNumber: colNum,
      columnName,
      primaryType,
      typeStats,
      totalNonEmpty
    })
  }

  return results
}

/**
 * CSV 转换选项
 */
export interface SheetToCSVOptions {
  /** 分隔符，默认为逗号 */
  delimiter?: string
  /** 是否包含空行，默认为 false */
  includeEmptyRows?: boolean
  /** 日期格式，默认为 'YYYY-MM-DD' */
  dateFormat?: string
  /** 是否跳过完全空白的行，默认为 false */
  skipEmptyRows?: boolean
}

/**
 * 将单个sheet转为CSV字符串
 * @param sheet Excel工作表对象
 * @param options CSV转换选项
 * @returns CSV格式的字符串
 */
export function sheetToCSV(sheet: ExcelJS.Worksheet, options: SheetToCSVOptions = {}): string[] {
  const {
    delimiter = ',',
    includeEmptyRows = false,
    dateFormat = 'YYYY-MM-DD',
    skipEmptyRows = false
  } = options

  if (!sheet.dimensions) {
    WIKI.logger.warn(`[sheetToCSV]: 工作表 ${sheet.name} 没有维度信息`)
    return []
  }

  const { top, left, bottom, right } = sheet.dimensions
  const csvRows: string[] = []

  // 格式化单元格值
  const formatCellValue = (cell: ExcelJS.Cell): string => {
    const value = cell.value

    if (value === null || value === undefined) {
      return ''
    }

    // 处理公式单元格
    if (cell.formula && cell.result !== undefined) {
      return formatCellValue({ ...cell, value: cell.result } as ExcelJS.Cell)
    }

    // 处理日期
    if (value instanceof Date) {
      // 简单的日期格式化（可以根据需要扩展）
      const year = value.getFullYear()
      const month = String(value.getMonth() + 1).padStart(2, '0')
      const day = String(value.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // 处理布尔值
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE'
    }

    // 处理数字
    if (typeof value === 'number') {
      return String(value)
    }

    // 处理富文本对象
    if (typeof value === 'object' && 'richText' in value) {
      const richText = value as ExcelJS.CellRichTextValue
      return richText.richText.map(rt => rt.text).join('')
    }

    // 转换为字符串
    let strValue = String(value)

    // CSV 转义：如果包含分隔符、换行符或双引号，需要用双引号包裹，并转义内部的双引号
    if (strValue.includes(delimiter) || strValue.includes('\n') || strValue.includes('\r') || strValue.includes('"')) {
      strValue = `"${strValue.replace(/"/g, '""')}"`
    }

    return strValue
  }

  // 遍历每一行
  for (let rowNum = top; rowNum <= bottom; rowNum++) {
    const rowValues: string[] = []

    // 遍历该行的每个单元格
    for (let colNum = left; colNum <= right; colNum++) {
      const cell = sheet.getCell(rowNum, colNum)
      const cellValue = formatCellValue(cell)
      rowValues.push(cellValue)
    }

    // 检查是否为空行
    const isEmptyRow = rowValues.every(val => val === '')

    // 如果当前行为空，根据选项决定是否跳过
    if (isEmptyRow && (skipEmptyRows || !includeEmptyRows)) {
      continue
    }

    // 将行值用分隔符连接
    csvRows.push(rowValues.join(delimiter))
  }

  return csvRows
}

/**
 * 判断工作表是否为简单文本类型
 * @param columnTypes 列类型信息数组
 * @param csvContent CSV内容
 * @returns 是否为简单文本类型（CSV内容小于1024个字符，且主要为文本类型）
 */
function isSimpleSheet(columnTypes: ColumnDataTypeInfo[], csvContent: string): boolean {
  return csvContent.length < 1024 && isTextSheet(columnTypes)
}

/**
 * 判断工作表是否数据量过大
 * @param columnTypes 列类型信息数组
 * @returns 是否数据量过大（行数大于200，非空单元格数大于1000）
 */
function isComplexSheet(columnTypes: ColumnDataTypeInfo[]): boolean {
  if (!isTextSheet(columnTypes)) {
    return true
  }
  const rowCount = getSheetRowCount(columnTypes)
  const nonEmptyCellCount = getNonEmptyCellCount(columnTypes)
  return rowCount > 200 && nonEmptyCellCount > 1000
}

/**
 * 判断表格区域是否为简单类型
 * @param columnTypes 列类型信息数组
 * @param csvContent CSV内容
 * @returns 是否为简单类型
 */
function isSimpleRegion(columnTypes: ColumnDataTypeInfo[], csvContent: string): boolean {
  const textCount = columnTypes.filter(column => column.primaryType === 'text').length
  const totalCount = columnTypes.length
  const isText = textCount / totalCount > 0.5
  return csvContent.length < 1024 && isText
}

/**
 * 判断表格区域是否数据量过大
 * @param columnTypes 列类型信息数组
 * @returns 是否数据量过大
 */
function isComplexRegion(columnTypes: ColumnDataTypeInfo[]): boolean {
  const textCount = columnTypes.filter(column => column.primaryType === 'text').length
  const totalCount = columnTypes.length
  if (textCount / totalCount <= 0.5) {
    return true
  }
  const rowCount = Math.max(...columnTypes.map(column => column.totalNonEmpty))
  const nonEmptyCellCount = columnTypes.reduce((sum, column) => sum + column.totalNonEmpty, 0)
  return rowCount > 200 && nonEmptyCellCount > 1000
}

/**
 * 提取单个sheet中的不同表格
 * @param sheet Excel工作表对象
 * @param minRows 最小行数阈值，少于此行数的区域会被忽略，默认为2
 * @param minCols 最小列数阈值，少于此列数的区域会被忽略，默认为2
 * @returns 提取到的表格信息数组，每个表格包含区域信息和CSV内容
 */
export interface ExtractedTable {
  /** 表格区域信息 */
  region: TableRegion
  /** 表格区域范围，例如A1:B2 */
  range: string
  /** CSV格式的表格内容 */
  csvRows: string[]
  /** CSV内容的字符串形式 */
  csvContent: string
  /** 列类型分析结果 */
  columnTypes: ColumnDataTypeInfo[]
  /** 表头行内容（如果有） */
  headerRow: string | null
}

export function extractTablesFromSheet(
  sheet: ExcelJS.Worksheet,
  minRows: number = 2,
  minCols: number = 2
): ExtractedTable[] {
  const tables: ExtractedTable[] = []

  // 检测表格区域
  const regions = detectTableRegions(sheet, minRows, minCols)
  WIKI.logger.info(`[extractTablesFromSheet]: 工作表 ${sheet.name} 检测到 ${regions.length} 个表格区域`)

  if (regions.length === 0) {
    WIKI.logger.warn(`[extractTablesFromSheet]: 工作表 ${sheet.name} 未检测到有效的表格区域`)
    return tables
  }

  // 对每个表格区域单独处理
  for (let regionIndex = 0; regionIndex < regions.length; regionIndex++) {
    const region = regions[regionIndex]
    const range = `${getColumnName(region.left)}${region.top}:${getColumnName(region.right)}${region.bottom}`
    WIKI.logger.info(`[extractTablesFromSheet]: 处理表格区域 ${regionIndex + 1}/${regions.length}: ${range}`)

    // 提取CSV内容
    const csvRows = regionToCSV(sheet, region)
    const csvContent = csvRows.join('\n')

    // 分析列类型
    const columnTypes = analyzeRegionColumnTypes(sheet, region)

    // 提取表头（如果有）
    let headerRow: string | null = null
    if (region.headerRow !== null && region.headerRow > 0 && region.headerRow <= csvRows.length) {
      headerRow = csvRows[region.headerRow - 1] // headerRow是相对于top的偏移（从1开始）
      WIKI.logger.info(`[extractTablesFromSheet]: 表格区域 ${regionIndex + 1} 检测到表头（第${region.headerRow}行）: ${headerRow}`)
    } else {
      // 如果没有检测到表头，但第一行主要是文本，也尝试使用第一行作为表头
      if (csvRows.length > 1) {
        const firstRowTextRatio = columnTypes.filter(col => col.primaryType === 'text').length / columnTypes.length
        if (firstRowTextRatio > 0.5) {
          headerRow = csvRows[0]
          WIKI.logger.info(`[extractTablesFromSheet]: 表格区域 ${regionIndex + 1} 使用第一行作为表头（推断）: ${headerRow}`)
        }
      }
    }

    tables.push({
      region,
      range,
      csvRows,
      csvContent,
      columnTypes,
      headerRow
    })
  }

  return tables
}

export async function excelVectors(page: PageJobInfo): Promise<EmbeddingInfo[]> {
  const buffer = await WIKI.models.pages.getDocumentBuffer(page.id)
  if (!buffer) {
    throw new Error('Document buffer not found')
  }
  const vectors: EmbeddingInfo[] = []
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheets = workbook.worksheets
  WIKI.logger.info(`[excelVectors]: 获取Excel工作表数: ${sheets.length}`)
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
    const sheet = sheets[sheetIndex]
    const dimensions = sheet.dimensions
    WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 的维度: ${dimensions}`)

    // 分析列数据类型
    const columnTypes = analyzeSheetColumnTypes(sheet)
    // WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 的列类型分析: ${JSON.stringify(columnTypes, null, 2)}`)
    WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 的非空单元格总数: ${getNonEmptyCellCount(columnTypes)}`)
    WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 的行数（基于最大非空单元格数）: ${getSheetRowCount(columnTypes)}`)
    WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 是否主要为文本类型: ${isTextSheet(columnTypes)}`)
    const tables = extractTablesFromSheet(sheet)
    WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 提取到 ${tables.length} 个表格; ${JSON.stringify(tables.map(table => table.range), null, 2)}`)
    const csvRows = sheetToCSV(sheet)
    const csvContent = csvRows.join('\n')
    WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 的CSV内容(${csvContent.length}个字符)`)
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex]
      WIKI.logger.info(`[excelVectors]: 处理表格 ${tableIndex + 1}/${tables.length}: ${table.range}`)
      const csvContent = table.csvContent
      WIKI.logger.info(`[excelVectors]: 表格 ${tableIndex + 1} 的CSV内容(${csvContent.length}个字符)`)
      if (isSimpleRegion(table.columnTypes, csvContent)) {
        WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 中 ${table.range} 为简单表类型，进行整体向量化`)
        const content = `以下是来自【${page.path}】的【${sheet.name}】工作表(${table.range})的CSV内容：\n${csvContent}`
        const { dense_vectors, sparse_vectors } = await getEmbeddings(content, 'hybrid', 2048)
        const embeddingInfo: EmbeddingInfo = {
          vectors: dense_vectors,
          sparseVectors: sparse_vectors,
          source: page.path,
          dataType: 'excel',
          content: content,
          fileID: page.id,
          sheetName: sheet.name,
          sheetIndex: sheetIndex,
          tableIndex: tableIndex,
          tableRange: table.range,
        }
        vectors.push(embeddingInfo)
      } else if (isComplexRegion(table.columnTypes)) {
        WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 中 ${table.range} 的为复杂表或数字表，只向量表结构`)
        const content = `以下是来自【${page.path}】的【${sheet.name}】工作表(${table.range})的表头结构：\n${table.headerRow}`
        const { dense_vectors, sparse_vectors } = await getEmbeddings(content, 'hybrid', 2048)
        const embeddingInfo: EmbeddingInfo = {
          vectors: dense_vectors,
          sparseVectors: sparse_vectors,
          source: page.path,
          dataType: 'excel',
          content: content,
          fileID: page.id,
          sheetName: sheet.name,
          sheetIndex: sheetIndex,
          tableIndex: tableIndex,
          tableRange: table.range,
          headerRow: table.headerRow,
        }
        vectors.push(embeddingInfo)
      } else {
        WIKI.logger.info(`[excelVectors]: 工作表 ${sheet.name} 中 ${table.range} 为文本类型，进行逐行向量化`)
        // 默认第一行为表头，从第二行开始逐行向量化
        const head = table.headerRow || table.csvRows[0]
        for (let rowIndex = 1; rowIndex < table.csvRows.length; rowIndex++) {
          const content = `以下是来自【${page.path}】的【${sheet.name}】工作表(${table.range})的第${rowIndex}行CSV内容(第一行为表头)：\n${head}\n${table.csvRows[rowIndex]}`
          const { dense_vectors, sparse_vectors } = await getEmbeddings(content, 'hybrid', 2048)
          const embeddingInfo: EmbeddingInfo = {
            vectors: dense_vectors,
            sparseVectors: sparse_vectors,
            source: page.path,
            dataType: 'excel',
            content: content,
            fileID: page.id,
            sheetName: sheet.name,
            sheetIndex: sheetIndex,
            tableIndex: tableIndex,
            tableRange: table.range,
            rowIndex: rowIndex,
          }
          vectors.push(embeddingInfo)
        }
      }
    }
  }
  return vectors
}
