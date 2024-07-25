import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'thoughts-wandering',
  name: {
    en: 'wandering thoughts',
    zh: '思绪游荡'
  },
  desc: {
    en: 'wandering thoughts',
    zh: '思绪游荡'
  },
  tags: [],
  links: [],
  publicDate: '',
  component: lazy(() => import('./p5-test')),
}

export default work
