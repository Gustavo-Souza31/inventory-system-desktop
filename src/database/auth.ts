const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3001';

const TOKEN_KEY = 'authToken';
const EMAIL_KEY = 'authEmail';

export function getApiUrl(): string {
    return API_URL;
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function getEmail(): string | null {
    return localStorage.getItem(EMAIL_KEY);
}

export function isAuthenticated(): boolean {
    return !!getToken();
}

export function logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
}

async function authRequest(path: string, email: string, password: string): Promise<{ email: string }> {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Erro ao autenticar.');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(EMAIL_KEY, data.email);
    return { email: data.email };
}

export function login(email: string, password: string): Promise<{ email: string }> {
    return authRequest('/auth/login', email, password);
}

export function register(email: string, password: string): Promise<{ email: string }> {
    return authRequest('/auth/register', email, password);
}
