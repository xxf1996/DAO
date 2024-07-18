import type { MultiLang, WorkInfo } from '@/typings/work'
import { Suspense, lazy, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import './work.scss'
import { useMultiLangText } from '@/hooks/text'

// eslint-disable-next-line @typescript-eslint/naming-convention
const IframeWork = lazy(() => import('@/components/IframeWork'))
// eslint-disable-next-line @typescript-eslint/naming-convention
const ResourceWork = lazy(() => import('@/components/ResourceWork'))

interface WorkInfoDisplayProps {
  work: WorkInfo
}

const publish: MultiLang = {
  zh: '发布于',
  en: 'Publish At'
}

function WorkInfoDisplay({ work }: WorkInfoDisplayProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [minimized, setMinimized] = useState(false)
  const toggleCollapsed = () => {
    setCollapsed(!collapsed)
  }
  const goHome = () => {
    window.location.href = '/'
  }

  return (
    <div className={`work__info ${minimized ? 'work__info-minimized' : ''}`}>
      <div className="work__info-icon work__info-maximized i-carbon-information-filled" onClick={() => setMinimized(false)} />
      <div className="work__info-header">
        {collapsed ? <div className="i-carbon-chevron-right work__info-icon" onClick={toggleCollapsed} /> : <div className="i-carbon-chevron-down work__info-icon" onClick={toggleCollapsed} />}
        <span className="work__info-title">{useMultiLangText(work.name)}</span>
        <div className="work__info-icon i-carbon-home" onClick={goHome} />
        <div className="work__info-icon i-carbon-close" onClick={() => setMinimized(true)} />
      </div>
      <p className="work__info-date">
        {useMultiLangText(publish)}
        {' '}
        {work.publicDate}
      </p>
      <div className={`work__info-content ${collapsed ? 'hidden' : ''}`}>
        <p className="work__info-desc">{useMultiLangText(work.desc)}</p>
        {work.links.map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="work__info-link"
          >
            {useMultiLangText(link.name)}
            <div className="i-carbon-link work__info-icon" />
          </a>
        ))}
      </div>
    </div>
  )
}

function Work() {
  const work = useLoaderData() as WorkInfo
  console.log(work)
  return (
    <div className="work__container">
      <Suspense fallback={null}>
        { work.type === 'iframe' ? <IframeWork work={work} /> : null }
        { work.type === 'resource' ? <ResourceWork work={work} /> : null }
      </Suspense>
      <WorkInfoDisplay work={work} />
    </div>
  )
}

export default Work
