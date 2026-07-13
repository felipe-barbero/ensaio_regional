import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/ensaio_regional">
      <TooltipProvider>
        <App />
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
)
