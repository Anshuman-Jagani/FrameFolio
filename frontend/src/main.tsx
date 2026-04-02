import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'

import './index.css'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const withGoogle = Boolean(clientId)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {withGoogle ? (
        <GoogleOAuthProvider clientId={clientId as string}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </StrictMode>,
)
