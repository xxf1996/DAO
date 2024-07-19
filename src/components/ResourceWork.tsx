import type { ResourceWorkInfo } from '@/typings/work'

export interface ResourceWorkProps {
  work: ResourceWorkInfo
}

function getResource(work: ResourceWorkInfo) {
  const styles = work.styles.map(url => `<link rel="stylesheet" href="${url}" />`).join('\n')
  const scripts = work.scripts.map(url => `<script src="${url}"></script>`).join('\n')
  const js = work.js.length > 0 ? `<script>${work.js}</script>` : ''
  const css = work.css.length > 0 ? `<style>${work.css}</style>` : ''
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${work.name.en}</title>
    ${styles}
    ${css}
    ${scripts}
  </head>
  <body>
    ${work.html}
    ${js}
  </body>
</html>
  `
}

function ResourceWork({ work }: ResourceWorkProps) {
  return (
    <iframe className="w-full h-full border-none" srcDoc={getResource(work)} />
  )
}

export default ResourceWork
