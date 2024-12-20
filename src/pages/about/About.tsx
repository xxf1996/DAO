import { useMultiLangText } from '@/hooks/text'
import { HomeContainer, HomeHeader } from '@/pages/home/Home'
import type { MultiLang } from '@/typings/work'
import contentZh from './zh.html?raw'
import contentEn from './en.html?raw'

const title: MultiLang = {
  zh: '关于',
  en: 'About'
}
const content: MultiLang = {
  zh: contentZh,
  en: contentEn
}

function About() {
  return (
    <HomeContainer>
      <HomeHeader logoPath="/" />
      <h1 className="home__title">
        {useMultiLangText(title)}
      </h1>
      <iframe className="w-full h-full border-none mt-12" srcDoc={useMultiLangText(content)} />
    </HomeContainer>
  )
}

export default About
