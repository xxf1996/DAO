import type { LazyExoticComponent } from 'react'

/** 多语言映射 */
interface MultiLang {
  zh: string
  en: string
}

export type LangTypes = keyof MultiLang

interface LinkInfo {
  /** 链接名称 */
  name: MultiLang
  url: string
}

interface WorkBaseInfo {
  name: MultiLang
  /** 作品别名，用于路由地址 */
  alias: string
  /** 作品简单介绍，不宜过多 */
  desc: MultiLang
  /** 作品发布日期 */
  publicDate: string
  /** 作品标签 */
  tags: string[]
  /** 作品要显示的外链 */
  links: LinkInfo[]
  /** 源码地址 */
  sourceUrl?: string
}

/** 直接整体引用到iframe的作品 */
export interface IframeWorkInfo extends WorkBaseInfo {
  type: 'iframe'
  url: string
}

/** 类似codepen的作品 */
export interface ResourceWorkInfo extends WorkBaseInfo {
  type: 'resource'
  /** 作品的css代码 */
  css: string
  /** 作品的js代码 */
  js: string
  /** 作品的html代码 */
  html: string
  /** js外链 */
  scripts: string[]
  /** css外链 */
  styles: string[]
}

/** React组件形式的作品 */
export interface SourceCodeWorkInfo extends WorkBaseInfo {
  type: 'sourceCode'
  component: LazyExoticComponent<() => JSX.Element>
}

export type WorkInfo = IframeWorkInfo | ResourceWorkInfo | SourceCodeWorkInfo
