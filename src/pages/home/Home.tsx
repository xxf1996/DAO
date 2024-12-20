import { useMultiLangText } from '@/hooks/text'
import type { LangTypes, LinkInfo, MultiLang } from '@/typings/work'
import { works } from '@/works'
import './home.scss'
import { useLocalStorage } from 'react-use'
import Logo from '@/works/logo/logo'
import { numToHanzi } from '@/utils/text'
import { useState } from 'react'

export interface HomeContainerProps {
  children?: React.ReactNode
}

export interface HomeHeaderProps {
  /** 点击logo跳转的路径，默认为 /logo */
  logoPath?: string
}

export function HomeContainer({ children }: HomeContainerProps) {
  return (
    <div className="home__container">
      { children }
    </div>
  )
}

function HomeWokrs() {
  const [hoveredNo, setHoveredNo] = useState('')
  return (
    <div className="home__works">
      <div className="home__works-hanzi">{ hoveredNo }</div>
      { works.slice(1).map((work, idx) => ( // slice(1) 去掉 logo
        <a
          className="home__works-link"
          key={work.alias}
          href={`/${work.alias}`}
          data-hanzi={numToHanzi(idx + 1)}
          onMouseEnter={() => setHoveredNo(numToHanzi(idx + 1))}
          onMouseLeave={() => setHoveredNo('')}
        >
          <span className="home__works-no">{(idx + 1).toString().padStart(3, '0')}</span>
          {useMultiLangText(work.name)}
        </a>
      )) }
    </div>
  )
}

export function HomeHeader({ logoPath }: HomeHeaderProps) {
  const [lang, setLang] = useLocalStorage<LangTypes>('dao-lang', 'zh')
  const toggleLang = (type: LangTypes) => {
    setLang(type)
    window.location.reload()
  }

  return (
    <div className="home__header">
      <a className="home__header-logo" href={logoPath ?? '/logo'}>
        <Logo />
      </a>
      <div className="home__header-lang">
        <button className={`home__header-lang-btn ${lang === 'zh' ? 'home__header-lang-active' : ''}`} onClick={() => toggleLang('zh')}>中</button>
        /
        <button className={`home__header-lang-btn ${lang === 'en' ? 'home__header-lang-active' : ''}`} onClick={() => toggleLang('en')}>EN</button>
      </div>
    </div>
  )
}

const footerLinks: LinkInfo[] = [
  {
    name: {
      en: 'Github',
      zh: 'Github'
    },
    url: 'https://github.com/xxf1996'
  },
  {
    name: {
      en: 'About',
      zh: '关于'
    },
    url: '/about'
  }
]
const copyright: MultiLang = {
  zh: '© 始于 2024/07',
  en: '© Since 2024/07'
}

function HomeFooter() {
  return (
    <div className="home__footer">
      <div className="home__footer-links">
        { footerLinks.map(link => (
          <a key={link.url} target="_blank" href={link.url}>
            {useMultiLangText(link.name)}
          </a>
        ))}
      </div>
      <p className="home__footer-copyright">{useMultiLangText(copyright)}</p>
    </div>
  )
}

const title: MultiLang = {
  zh: '道',
  en: 'DAO'
}

function Home() {
  // FIXME: useMultiLangText没有响应性
  return (
    <HomeContainer>
      <HomeHeader />
      <h1 className="home__title">
        {useMultiLangText(title)}
        {/* <div className="i-carbon-home" /> */}
      </h1>
      <div className="home__quote">
        “道生一，一生二，二生三，三生万物”
        <p className="text-right">——《道德经》</p>
      </div>
      <HomeWokrs />
      <HomeFooter />
    </HomeContainer>
  )
}

export default Home
