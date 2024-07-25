import type { ResourceWorkInfo } from '@/typings/work'
import css from './content.css?raw'
import js from './content.js?raw'
import html from './content.html?raw'

const work: ResourceWorkInfo = {
  type: 'resource',
  alias: 'walking',
  name: {
    en: 'walking',
    zh: '步履不停'
  },
  desc: {
    en: 'walking',
    zh: '用SVG曲线绘制的一幅简单的意象画面，沙滩中只有不停的脚步。'
  },
  css,
  js,
  html,
  scripts: [],
  styles: [],
  publicDate: '2020-02-27',
  tags: [],
  links: [
    {
      name: {
        en: 'codepen',
        zh: 'codepen'
      },
      url: 'https://codepen.io/xxf1996/pen/mdJmdoV'
    }
  ]
}

export default work
