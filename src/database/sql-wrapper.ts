import { getApiUrl, getToken, logout } from './auth';

// Camada HTTP: cada uma das 6 funções abaixo chama a rota REST equivalente
// no servidor (server/src/api.ts). Sem SQL sendo montado aqui — quem monta
// o SQL agora é o servidor, com a whitelist de tabelas dele.
async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
    const token = getToken();
    const headers: Record<string, string> = {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${getApiUrl()}${path}`, { ...options, headers });

    if (res.status === 401) {
        // Sessão expirada ou token inválido: desloga e avisa o App.tsx
        // pra voltar pra tela de login.
        logout();
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (res.status === 404) return null;

    const data = res.status === 204 ? null : await res.json();
    if (!res.ok) {
        throw new Error(data?.error || `Erro ${res.status}`);
    }
    return data;
}

export async function getAll<T>(table: string): Promise<T[]> {
    return await apiFetch(`/api/${table}`);
}

export async function getById<T>(table: string, id: number): Promise<T | undefined> {
    const row = await apiFetch(`/api/${table}/${id}`);
    return row ?? undefined;
}

export async function findWhere<T>(table: string, query: Record<string, any>): Promise<T[]> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        params.set(k, String(v));
    }
    return await apiFetch(`/api/${table}?${params.toString()}`);
}

export async function insert(table: string, item: Record<string, any>): Promise<number> {
    const res = await apiFetch(`/api/${table}`, {
        method: 'POST',
        body: JSON.stringify(item),
    });
    return res.id;
}

export async function updateById(table: string, id: number, changes: Record<string, any>): Promise<void> {
    await apiFetch(`/api/${table}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(changes),
    });
}

export async function deleteById(table: string, id: number): Promise<void> {
    await apiFetch(`/api/${table}/${id}`, { method: 'DELETE' });
}

export async function clearTable(table: string): Promise<void> {
    await apiFetch(`/api/${table}`, { method: 'DELETE' });
}
