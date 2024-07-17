import { useMultiLangText } from '@/hooks/text'
import type { LangTypes, LinkInfo, MultiLang } from '@/typings/work'
import { works } from '@/works'
import './home.scss'
import { useLocalStorage } from 'react-use'

export interface HomeContainerProps {
  children?: React.ReactNode
}

function HomeContainer({ children }: HomeContainerProps) {
  return (
    <div className="home__container">
      { children }
    </div>
  )
}

function HomeWokrs() {
  return (
    <div className="home__works">
      { works.map((work, idx) => (
        <a key={work.alias} href={`/${work.alias}`}>
          <span className="home__works-no">{(idx + 1).toString().padStart(3, '0')}</span>
          {useMultiLangText(work.name)}
        </a>
      )) }
    </div>
  )
}

function HomeHeader() {
  const [lang, setLang] = useLocalStorage<LangTypes>('dao-lang', 'zh')
  const toggleLang = (type: LangTypes) => {
    setLang(type)
    window.location.reload()
  }

  return (
    <div className="home__header">
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
  }
]

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
    </HomeContainer>
  )
}

export default Home
