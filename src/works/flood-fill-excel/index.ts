import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { P5_LINK } from '../links'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'flood-fill-excel',
  name: {
    en: 'Flood Fill Excel',
    zh: 'Flood Fill Excel'
  },
  desc: {
    en: 'A visualization of the flood fill algorithm (4-connected BFS) to find table regions in an Excel sheet. Click on any cell with text to start the flood fill animation.',
    zh: '使用 flood fill 算法（四联通 BFS）可视化查找 Excel 表格中的区域。点击任意有文本的单元格开始 flood fill 动画。'
  },
  tags: [],
  links: [P5_LINK],
  publicDate: '2025-01-20',
  component: lazy(() => import('./flood-fill-excel')),
}

export default work
