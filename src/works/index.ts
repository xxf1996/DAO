import type { WorkInfo } from '@/typings/work'
import directionOfTheWind from './direction-of-the-wind'

export const works: WorkInfo[] = [
  {
    type: 'iframe',
    alias: 'test',
    name: {
      en: 'test',
      zh: '测试'
    },
    desc: {
      en: 'test',
      zh: '测试'
    },
    url: 'https://xiexuefeng.cc/app/we/demo/eye-fires/',
    publicDate: '2022-01-01',
    tags: [],
    links: []
  },
  directionOfTheWind
]
