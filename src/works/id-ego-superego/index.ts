import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { P5_LINK } from '../links'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'id-ego-superego',
  name: {
    en: 'id, ego, superego',
    zh: '本我、自我和超我'
  },
  desc: {
    en: 'The id, ego, and superego are the three components of the human psyche, according to Freud\'s psychoanalysis theory.',
    zh: '本我、自我和超我是弗洛伊德精神分析理论中的三个组成部分。'
  },
  tags: [],
  links: [P5_LINK],
  publicDate: '2025-04-30',
  component: lazy(() => import('./id-ego-superego')),
}

export default work
