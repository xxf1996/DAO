import { useMultiLangText } from '@/hooks/text'
import type { MultiLang } from '@/typings/work'
import { works } from '@/works'
import './home.scss'

export interface HomeContainerProps {
  children?: React.ReactNode
}

function HomeContainer({ children }: HomeContainerProps) {
  return (
    <div className="h-screen w-screen bg-dark-900 px-6 py-4 box-border">
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

const title: MultiLang = {
  zh: '道',
  en: 'DAO'
}

function Home() {
  return (
    <HomeContainer>
      <h1 className="home__title">{useMultiLangText(title)}</h1>
      <div className="home__quote">
        “道生一，一生二，二生三，三生万物”
        <p className="text-right">——《道德经》</p>
      </div>
      <HomeWokrs />
    </HomeContainer>
  )
}

export default Home
