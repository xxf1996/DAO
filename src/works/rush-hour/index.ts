import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { P5_LINK } from '../links'

const MATTER_LINK = {
  name: {
    en: 'Matter.js',
    zh: 'Matter.js'
  },
  url: 'https://brm.io/matter-js/'
}

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'rush-hour',
  name: {
    en: 'Rush Hour',
    zh: '早高峰'
  },
  desc: {
    en: 'Expresses the author\'s hatred for rush hour.\nPhysics simulation uses Matter.js, rendering uses p5.js',
    zh: '表达了作者对早高峰的厌恶之情。\n\n物理仿真采用Matter.js，渲染采用p5.js\n\n在地址后加上?emoji或许会有意想不到的效果'
  },
  tags: ['物理仿真', '极简主义', '交互艺术'],
  links: [P5_LINK, MATTER_LINK],
  publicDate: '2025-11-23',
  defaultCollapsed: true,
  source: true,
  component: lazy(() => import('./rush-hour')),
}

export default work
