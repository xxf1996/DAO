import { lazy } from 'react'
import { P5_LINK } from '../links'
import type { SourceCodeWorkInfo } from '@/typings/work'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'spectacle-society',
  name: {
    en: 'Spectacle Society',
    zh: '景观社会',
  },
  desc: {
    en: 'Inspired by the cover of the Chinese version of the “Landscape Society” (this book is really a headache to read, all abstract concepts 😅)\n Operation Tips: Hold down the left mouse button to rotate, hold down the right mouse button to move, scroll wheel to zoom in and out of the picture!',
    zh: '由《景观社会》中文版封面得到的灵感（这本书看得真是令人头疼，全是抽象概念😅）\n操作提示：按住鼠标左键可以旋转，按住鼠标右键可以移动，滚动滚轮缩放画面',
  },
  tags: ['p5.js'],
  links: [P5_LINK, {
    url: 'https://book.douban.com/subject/26865819/',
    name: {
      zh: '景观社会 (豆瓣)',
      en: '景观社会 (豆瓣)'
    }
  }, {
    url: 'https://aphelis.net/cover-debord-society-spectacle/',
    name: {
      zh: '居伊·德波《景观社会》1983版封面图',
      en: 'Cover of the 1983 edition of Guy Debord’s Society of the Spectacle'
    }
  }],
  publicDate: '2024-12-19',
  component: lazy(() => import('./spectacle-society')),
}

export default work
