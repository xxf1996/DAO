import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'logo',
  name: {
    en: 'logo',
    zh: 'logo',
  },
  desc: {
    en: 'logo',
    zh: 'logo',
  },
  tags: [],
  links: [],
  publicDate: '',
  component: lazy(() => import('./logo')),
}

export default work
