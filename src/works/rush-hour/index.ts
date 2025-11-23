import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'

const MATTER_LINK = {
  name: {
    en: 'Matter.js',
    zh: 'Matter.js'
  },
  url: 'https://brm.io/matter-js/'
}

const P5_LINK = {
  name: {
    en: 'p5.js',
    zh: 'p5.js'
  },
  url: 'https://p5js.org/'
}

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'rush-hour',
  name: {
    en: 'Rush Hour',
    zh: '高峰时刻'
  },
  desc: {
    en: 'A minimalist physics simulation artwork depicting people falling through a funnel-shaped terrain onto a segmented ground below. Using Matter.js for physics simulation and p5.js for rendering, it presents a simple yet thought-provoking visual metaphor about life\'s rush and flow.',
    zh: '一个极简风格的物理仿真作品，描绘了人们从漏斗状地形坠落到下方分段地面的场景。使用 Matter.js 进行物理仿真，p5.js 进行渲染，以简洁的视觉呈现关于生活节奏和流动的隐喻。'
  },
  tags: ['物理仿真', '极简主义', '交互艺术'],
  links: [P5_LINK, MATTER_LINK],
  publicDate: '2025-11-23',
  component: lazy(() => import('./rush-hour')),
}

export default work
