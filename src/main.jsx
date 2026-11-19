import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import I18nProvider from './i18n/I18nProvider.jsx'
import AstryxProviders from './i18n/AstryxProviders.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <AstryxProviders>
        <App />
      </AstryxProviders>
    </I18nProvider>
  </StrictMode>,
)

// PWA : coque hors ligne. Désactivé en développement (HMR) ; l'API n'est jamais mise en cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn("Service worker non enregistré :", err)
    })
  })
}
