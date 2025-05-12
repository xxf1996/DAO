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
    en: 'A simple figure blowing bubbles, gradually the bubble grows until it encapsulates the figure and floats into the air. After a random interval, the bubble bursts and the figure falls back to the ground to begin the cycle again. This represents how we are often swept away by our desires, only to have them burst and leave us back where we started.',
    zh: '一个简约的线条人物吹泡泡，泡泡逐渐变大直至将人物包裹起来然后飘到空中。经过一段随机的时间后，泡泡破裂，人物掉回地面，然后又开始吹泡泡，如此循环。这象征着人们如何被自己的欲望所困，被其席卷上天，却又在欲望的破灭后跌回原点，周而复始。'
  },
  tags: [],
  links: [P5_LINK],
  publicDate: '2025-05-12',
  component: lazy(() => import('./slave-to-desire')),
}

export default work
