const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// Token solo en memoria temporal
let sessionToken = null;

export async function register({ username, email, password }) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    return await res.json();
}

export async function login({ email, password }) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
        sessionToken = data.token; // Solo memoria
    }
    return data;
}

export function logout() {
    sessionToken = null;
}

export function getToken() {
    return sessionToken;
}

export async function verify() {
    const token = getToken();
    if (!token) return { valid: false };
    const res = await fetch(`${API_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}
