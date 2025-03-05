import type { SourceCodeWorkInfo } from '@/typings/work'
import { lazy } from 'react'
import { THREE_FIBER_LINK, THREE_LINK } from '../links'

const work: SourceCodeWorkInfo = {
  type: 'sourceCode',
  alias: 'ai-random-tree',
  name: {
    en: 'Random Tree',
    zh: '随机树'
  },
  desc: {
    en: 'I had a sudden inspiration to create a watercolor-style random tree rendering artwork using AI IDE in conjunction with LLM, while trying to minimize my own code modifications and instead using natural language to communicate with Agents to fulfill the requirements. As a result, the majority of this work\'s code and algorithms were completed by Trae/Cursor + Claude3.5.\nThis is also a small forward-looking test demo for attempting an interactive tree artwork, so the work is not yet fully complete. While having AI assist in creating the initial form of an artwork isn\'t much of a problem, and even the first few rounds of communication can complete most of the details, the most important aspect of creating artwork is in the details. You might need dozens or hundreds more rounds of communication to barely achieve the desired details, and in the end, you might still need to fine-tune it yourself to achieve the final effect.',
    zh: '我突发奇想让AI IDE配合LLM完成一个水彩风格随机树的渲染作品，自己则尽可能地不去修改代码，使用自然语言跟Agent进行交流让它们完成需求，因此本作品的代码和算法绝大部分由Trae/Cursor + Claude3.5完成。\n这也是一个关于树的交互作品尝试的小小前瞻性测试demo，因此作品状态还未完全完成；让AI辅助完成艺术作品的雏形还是没太大的问题，甚至前面几轮的沟通就能完成大部分细节，然而创作艺术作品最重要的就是细节，你可能需要剩下的几十上百轮沟通才能勉强达到想要的细节，最后可能还得是自己亲自微调才能达到最终效果。'
  },
  tags: ['three.js'],
  links: [THREE_LINK, THREE_FIBER_LINK],
  publicDate: '2025-03-05',
  component: lazy(() => import('./tree-fiber')),
}

export default work
