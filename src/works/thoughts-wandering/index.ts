import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { P5_LINK } from '../links'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'thoughts-wandering',
  name: {
    en: 'wandering thoughts',
    zh: '思绪游荡'
  },
  desc: {
    en: 'Various ideas or inspirations always come to mind while walking on weekdays, so one day while walking it occurred to me that my mind wandering pattern could actually be visualized in this form 🤣',
    zh: '平日在散步的时候总是会想起各种的想法或灵感，于是某天散步时突然想起了自己的思维游荡模式其实可以可视化为这种形式🤣'
  },
  tags: [],
  links: [P5_LINK],
  publicDate: '2024-08-07',
  component: lazy(() => import('./thoughts-wandering')),
}

export default work
