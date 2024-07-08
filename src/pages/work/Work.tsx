import type { WorkInfo } from '@/typings/work'
import { Suspense, lazy } from 'react'
import { useLoaderData } from 'react-router-dom'

// eslint-disable-next-line @typescript-eslint/naming-convention
const IframeWork = lazy(() => import('@/pages/work/IframeWork'))

function Work() {
  const work = useLoaderData() as WorkInfo
  console.log(work)
  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <Suspense fallback={null}>
        { work.type === 'iframe' ? <IframeWork work={work} /> : null }
      </Suspense>
    </div>
  )
}

export default Work
