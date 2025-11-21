import type { WorkInfo } from '@/typings/work'
import directionOfTheWind from './direction-of-the-wind'
import walking from './walking'
import thoughtsWandering from './thoughts-wandering'
import logo from './logo'
import spectacleSociety from './spectacle-society'
import tree from './ai-random-tree'
import idEgoSuperego from './id-ego-superego'
import slaveToDesire from './slave-to-desire'
import floodFillExcel from './flood-fill-excel'

export const works: WorkInfo[] = [
  logo,
  {
    type: 'iframe',
    alias: 'eye-fires',
    name: {
      en: 'eyes like fire',
      zh: '目光如炬'
    },
    desc: {
      en: '作品灵感来自顾城的《一代人》，“黑夜给了我黑色的眼睛，我却用它寻找光明。”',
      zh: '作品灵感来自顾城的《一代人》，“黑夜给了我黑色的眼睛，我却用它寻找光明。”'
    },
    url: 'https://xiexuefeng.cc/app/we/demo/eye-fires/',
    publicDate: '20??-??',
    tags: ['诗', '着色器'],
    links: [
      {
        name: {
          en: 'Fires Shader',
          zh: 'Fires Shader'
        },
        url: 'https://www.shadertoy.com/view/XsXSWS'
      }
    ],
    source: false
  },
  directionOfTheWind,
  walking,
  thoughtsWandering,
  spectacleSociety,
  tree,
  idEgoSuperego,
  slaveToDesire,
  floodFillExcel
]
