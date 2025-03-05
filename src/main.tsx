import React from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/global.scss'
import '@unocss/reset/normalize.css'
import 'virtual:uno.css'
import Home from '@/pages/home/Home'
import Work from '@/pages/work/Work'
import About from '@/pages/about/About'
import Page404 from '@/pages/error/404'
import Test from '@/works/ai-random-tree/test'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { find } from 'lodash-es'
import { works } from './works'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/about',
    element: <About />
  },
  {
    path: '/test',
    element: <Test />,
  },
  {
    path: '/:alias',
    element: <Work />,
    async loader({ params }) {
      const work = find(works, { alias: params.alias })
      if (!work) {
        document.title = '404'
        throw new Response(null, { status: 404 })
      }
      // TODO: 适配国际化
      document.title = work.name.zh
      return work
    },
    errorElement: <Page404 />
  }
])

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
