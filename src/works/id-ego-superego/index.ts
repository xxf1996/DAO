import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { P5_LINK } from '../links'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'id-ego-superego',
  name: {
    en: 'Id, Ego, and Superego',
    zh: '本我、自我和超我'
  },
  desc: {
    en: 'The concepts of id, ego, and superego were proposed by Freud in psychology, representing different parts of an individual\'s psychological consciousness. I won\'t elaborate on their specific meanings here; those interested can read books related to psychoanalysis.\n\nI personally believe that the id actually represents our most authentic desires, the superego represents our expectations and constraints for ourselves, and the ego is the final presentation of oneself resulting from the constant negotiation between the id and superego. Based on this understanding, the inspiration for this artwork formed — the two ends of the scale are the id and superego. New elements continuously join while old ones leave from both the id and superego, representing the process of our inner negotiation. The result, shown by the direction the scale tilts, is our currently presented self — the ego.',
    zh: '本我、自我和超我是由弗洛伊德所提出的心理学概念，代表了个人心理意识的不同部分。其具体含义我就不在这里赘述了，感兴趣的可以去看看精神分析学相关的书籍。\n\n我个人认为本我实际上就是内心最真实的欲望，超我则是对自己的期望和约束，自我就是在本我和超我之间不停地博弈所最终呈现的自己；基于这些理解就形成了这个作品的灵感——天平的两端是本我和超我，本我和超我当中不停地有新的东西加入和旧的东西离去，这就是我们内心博弈的过程，其结果也就是天平的倾斜方向就是我们当前所呈现的自己——即自我。'
  },
  tags: [],
  links: [P5_LINK],
  publicDate: '2025-05-10',
  component: lazy(() => import('./id-ego-superego')),
}

export default work
