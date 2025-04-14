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
    zh: '大概是大学时看到p5.js那典型的边框和几何，随手写的吧'
  },
  css,
  js,
  html,
  scripts: ['https://cdn.jsdelivr.net/npm/p5@0.5.11/lib/p5.min.js'],
  styles: [],
  publicDate: '2017-06-13',
  tags: [],
  links: [
    {
      name: {
        en: 'p5.js',
        zh: 'p5.js'
      },
      url: 'https://p5js.org/'
    },
    {
      name: {
        en: 'codepen',
        zh: 'codepen'
      },
      url: 'https://codepen.io/xxf1996/pen/XgKxNX'
    }
  ]
}

export default work
