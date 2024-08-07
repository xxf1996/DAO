import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { P5_LINK } from '../links'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'logo',
  name: {
    en: 'Logo',
    zh: 'Logo',
  },
  desc: {
    en: 'Based on the idea of "Dao begets one, life begets two, two begets three, and three begets all things", one begets two and then three, and all things are transformed.',
    zh: '基于“道生一，一生二，二生三，三生万物”这句话产生的idea，一到二再到三，幻化万物。',
  },
  tags: ['p5.js'],
  links: [P5_LINK],
  publicDate: '2024-08-06',
  component: lazy(() => import('./logo')),
}

export default work
