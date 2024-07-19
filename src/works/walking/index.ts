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
    zh: '行走'
  },
  css,
  js,
  html,
  scripts: [],
  styles: [],
  publicDate: '2022-01-01',
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
