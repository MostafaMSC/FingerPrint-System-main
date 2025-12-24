import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Configure axios global baseURL from env or infer backend origin (no '/api' suffix)
const ENV_API_URL = process.env.REACT_APP_API_URL;
function inferAxiosBase() {
  if (ENV_API_URL) {
    return ENV_API_URL.replace(/\/api\/?$/i, '');
  }
  if (typeof window === 'undefined') return 'http://localhost:5830';
  const host = window.location.hostname;
  const proto = window.location.protocol;
  if (host === 'localhost' || host === '127.0.0.1') return `${proto}//${host}:5830`;
  if (process.env.NODE_ENV === 'production') return '';
  return `${proto}//${host}:5830`;
}

axios.defaults.baseURL = inferAxiosBase();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
