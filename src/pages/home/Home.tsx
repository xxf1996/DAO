import { useMultiLangText } from '@/hooks/text'
import { works } from '@/works'

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
    <div className="mt-6">
      { works.map(work => <a key={work.alias} href={`/${work.alias}`}>{useMultiLangText(work.name)}</a>) }
    </div>
  )
}

function Home() {
  return (
    <HomeContainer>
      <h1 className="text-center text-light-900">道</h1>
      <div className="text-center font-size-6 w-150 mx-auto">
        “道生一，一生二，二生三，三生万物”
        <p className="text-right">——《道德经》</p>
      </div>
      <HomeWokrs />
    </HomeContainer>
  )
}

export default Home
