import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './logo.css'
import './theme.css'
import './mobile.css'
import './admin.css'
import './admin-upload.css'
import './admin-tools.css'
import './catalog-table.css'
import './card-carousel.css'
import './product-fit.css'
import './admin-image-remove.css'
import './admin-row-gallery.css'
import './product-detail-clean.css'
import './product-detail-colors.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
