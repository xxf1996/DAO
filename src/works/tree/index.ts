import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { P5_LINK } from '../links'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'tree',
  name: {
    en: 'Tree',
    zh: '树'
  },
  desc: {
    en: 'A recursive tree drawing program that allows you to adjust parameters like density, length and thickness to create different tree shapes.',
    zh: '一个递归绘制树的程序，可以通过调节密度、长度和粗细等参数来创造不同的树形。'
  },
  tags: ['p5.js'],
  links: [P5_LINK],
  publicDate: '2024-01-01',
  component: lazy(() => import('./tree-fiber')),
}

export default work
