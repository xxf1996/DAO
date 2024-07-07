interface MultiLang {
  zh: string
  en: string
}

interface LinkInfo {
  name: string
  url: string
}

interface WorkBaseInfo {
  name: MultiLang
  alias: string
  desc: MultiLang
  publicDate: string
  tags: string[]
  links: LinkInfo[]
}

interface IframeWork extends WorkBaseInfo {
  type: 'iframe'
  url: string
}

interface ResourceWork extends WorkBaseInfo {
  type: 'resource'
  css: string[]
  js: string[]
  html: string
}

interface SourceCodeWork extends WorkBaseInfo {
  type: 'sourceCode'
  component: React.JSX.Element
}

export type WorkInfo = IframeWork | ResourceWork | SourceCodeWork
