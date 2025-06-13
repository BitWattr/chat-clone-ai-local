import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import global styles for the entire application

// Create a React root to render the application.
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the main App component into the root element.
// React.StrictMode enables additional checks and warnings for its descendants.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
