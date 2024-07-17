import type { LangTypes, MultiLang } from '@/typings/work'
import { useLocalStorage } from 'react-use'

export function useMultiLangText(text: MultiLang) {
  /**
   * //NOTICE: 由于react限制hooks不能在回调函数中使用，所以这里不能用useLocalStorage，否则函数组件使用该方法时会触发报错：Error: Rendered more hooks than during the previous render.
   * @link https://react.dev/warnings/invalid-hook-call-warning
   */
  const lang = (localStorage.getItem('dao-lang') || 'zh').replaceAll('"', '') as LangTypes
  // console.log(text, lang)
  // 根据当前语言切换
  return text[lang!]
}
