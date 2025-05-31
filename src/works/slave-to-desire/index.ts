import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { P5_LINK } from '../links'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'slave-to-desire',
  name: {
    en: 'Slave to Desire',
    zh: '欲望的奴隶'
  },
  desc: {
    en: 'Desire is endless and very dreamy, like beautiful bubbles, blown out by us to encapsulate ourselves, entering beautiful dreams one by one, and then bursting. \n\nP.s: It\'s so good to be an art director!',
    zh: '欲望是无穷无尽的，也是很梦幻的，就像是美丽的泡泡，被我们不停地吹出来把自己包裹住，进入一个个美丽的梦境，然后破灭。明知是梦一场，却还是乐此不疲，最终成为了欲望的奴隶。\n\nP.s: 当甲方的日子真好啊😀'
  },
  tags: [],
  links: [P5_LINK],
  publicDate: '2025-05-31',
  component: lazy(() => import('./slave-to-desire')),
}

export default work
