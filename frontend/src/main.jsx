import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Import Bootstrap CSS & Icons
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Custom Cybersecurity Theme Overrides
import './index.css'

// Import Bootstrap JS for dynamic components like collapsible navbar
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
