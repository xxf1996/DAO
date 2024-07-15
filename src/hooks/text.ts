import type { LangTypes, MultiLang } from '@/typings/work'
import { useLocalStorage } from 'react-use'

export function useMultiLangText(text: MultiLang) {
  const [lang] = useLocalStorage<LangTypes>('dao-lang', 'zh')
  // 根据当前语言切换
  return text[lang!]
}
