import type { WorkInfo } from '@/typings/work'
import { Suspense, lazy } from 'react'
import { useLoaderData } from 'react-router-dom'

// eslint-disable-next-line @typescript-eslint/naming-convention
const IframeWork = lazy(() => import('@/components/IframeWork'))
// eslint-disable-next-line @typescript-eslint/naming-convention
const ResourceWork = lazy(() => import('@/components/ResourceWork'))

function Work() {
  const work = useLoaderData() as WorkInfo
  console.log(work)
  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <Suspense fallback={null}>
        { work.type === 'iframe' ? <IframeWork work={work} /> : null }
        { work.type === 'resource' ? <ResourceWork work={work} /> : null }
      </Suspense>
    </div>
  )
}

export default Work
