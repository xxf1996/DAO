// 加载p5.sound模块
import * as p5 from 'p5'

window.p5 = p5 // 因为sound只能挂载到全局属性p5上

await import('p5/lib/addons/p5.sound')

console.log('p5 sound loaded')
