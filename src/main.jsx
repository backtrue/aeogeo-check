
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AeoDashboard from './AeoDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AeoDashboard />
  </StrictMode>,
)
