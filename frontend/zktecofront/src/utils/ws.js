// WebSocket helper: choose URL from env or infer from window location
const ENV_WS_URL = process.env.REACT_APP_WS_URL;

function inferWsUrl() {
    if (typeof window === 'undefined') return 'ws://localhost:5830/ws';
    const host = window.location.hostname;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    if (host === 'localhost' || host === '127.0.0.1') return `${proto}://${host}:5830/ws`;
    if (process.env.NODE_ENV === 'production') return `${proto}://${host}/ws`;
    return `${proto}://${host}:5830/ws`;
}

export const getWsUrl = () => ENV_WS_URL || inferWsUrl();

export function createWebSocket(path = '/ws') {
    const base = ENV_WS_URL || inferWsUrl();
    // If env provides full path, use it; otherwise append path
    const url = base.endsWith('/ws') || base.includes(path) ? base : `${base.replace(/\/$/, '')}${path}`;
    return new WebSocket(url);
}

export default { getWsUrl, createWebSocket };
