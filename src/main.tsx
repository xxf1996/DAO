import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import Home from '@/pages/home/Home'
import Work from '@/pages/work/Work'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'

const rouer = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/:alias',
    element: <Work />,
    async loader({ params }) {
      return params.alias
    }
  }
])

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={rouer} />
  </React.StrictMode>,
  document.getElementById('root')
)
