import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'logo',
  name: {
    en: 'Logo',
    zh: 'Logo',
  },
  desc: {
    en: 'Logo',
    zh: 'Logo',
  },
  tags: [],
  links: [],
  publicDate: '2024-08-06',
  component: lazy(() => import('./logo')),
}

export default work
