import type { ResourceWorkInfo } from '@/typings/work'
import css from './content.css?raw'
import js from './content.js?raw'
import html from './content.html?raw'

const work: ResourceWorkInfo = {
  type: 'resource',
  alias: 'direction-of-the-wind',
  name: {
    en: 'direction of the wind',
    zh: '风的方向'
  },
  desc: {
    en: 'direction of the wind',
    zh: '风的方向'
  },
  css,
  js,
  html,
  scripts: ['https://cdn.bootcss.com/p5.js/0.5.11/p5.min.js'],
  styles: [],
  publicDate: '2022-01-01',
  tags: [],
  links: []
}

export default work
