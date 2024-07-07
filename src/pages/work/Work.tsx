import { useLoaderData } from 'react-router-dom'

function Work() {
  const data = useLoaderData() as string
  return (
    <div>
      work
      {' '}
      {data}
    </div>
  )
}

export default Work
