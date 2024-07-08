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

export interface IframeWorkInfo extends WorkBaseInfo {
  type: 'iframe'
  url: string
}

export interface ResourceWorkInfo extends WorkBaseInfo {
  type: 'resource'
  css: string[]
  js: string[]
  html: string
}

export interface SourceCodeWorkInfo extends WorkBaseInfo {
  type: 'sourceCode'
  component: React.JSX.Element
}

export type WorkInfo = IframeWorkInfo | ResourceWorkInfo | SourceCodeWorkInfo
