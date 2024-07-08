import type { IframeWorkInfo } from '@/typings/work'

export interface IframeWorkProps {
  work: IframeWorkInfo
}

function IframeWork({ work: { url } }: IframeWorkProps) {
  return (
    <iframe className="w-full h-full border-none" src={url} />
  )
}

export default IframeWork
