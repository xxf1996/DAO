import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import '@unocss/reset/normalize.css'
import 'virtual:uno.css'
import Home from '@/pages/home/Home'
import Work from '@/pages/work/Work'
import Page404 from '@/pages/error/404'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { find } from 'lodash-es'
import { works } from './works'

const rouer = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/:alias',
    element: <Work />,
    async loader({ params }) {
      const work = find(works, { alias: params.alias })
      if (!work) {
        throw new Response(null, { status: 404 })
      }
      return work
    },
    errorElement: <Page404 />
  }
])

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={rouer} />
  </React.StrictMode>,
  document.getElementById('root')
)
