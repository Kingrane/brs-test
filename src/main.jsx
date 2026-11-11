import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const root = createRoot(document.getElementById('app'))

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)

// Real PWA shell: repeat launches get HTML/assets from the service worker cache.
// Registered after load so it never competes with the first paint.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
}
