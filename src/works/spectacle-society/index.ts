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
    en: 'Spectacle Society',
    zh: '景观社会',
  },
  tags: ['p5.js'],
  links: [P5_LINK],
  publicDate: '',
  component: lazy(() => import('./spectacle-society')),
}

export default work
