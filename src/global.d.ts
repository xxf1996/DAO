import type * as p5 from 'p5'

declare global {
  export interface Window {
    /** P5全局属性，并非实例 */
    p5?: typeof p5
  }
}

// NOTICE: 必须export才会被识别
export {}
