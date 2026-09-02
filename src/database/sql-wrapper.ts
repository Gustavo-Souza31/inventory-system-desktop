import { supabase } from './supabaseClient';

// Camada de acesso a dados: cada função abaixo chama o Supabase direto do
// renderer via supabase-js (HTTPS), sem passar mais por IPC do Electron nem
// por um backend próprio. Isolamento por usuário é garantido no banco via
// Row Level Security (RLS) — não precisa filtrar por usuário aqui.

export async function getAll<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw new Error(error.message);
    return (data ?? []) as T[];
}

export async function getById<T>(table: string, id: number): Promise<T | undefined> {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? undefined) as T | undefined;
}

export async function findWhere<T>(table: string, query: Record<string, any>): Promise<T[]> {
    let builder = supabase.from(table).select('*');
    for (const [key, value] of Object.entries(query)) {
        builder = builder.eq(key, value);
    }
    const { data, error } = await builder;
    if (error) throw new Error(error.message);
    return (data ?? []) as T[];
}

export async function insert(table: string, item: Record<string, any>): Promise<number> {
    const { data, error } = await supabase.from(table).insert(item).select('id').single();
    if (error) throw new Error(error.message);
    return data.id;
}

export async function updateById(table: string, id: number, changes: Record<string, any>): Promise<void> {
    const { error } = await supabase.from(table).update(changes).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function deleteById(table: string, id: number): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
}

export async function clearTable(table: string): Promise<void> {
    // O PostgREST exige algum filtro num DELETE; ".neq('id', 0)" combinado
    // com RLS apaga só as linhas do usuário logado (ids sempre são > 0).
    const { error } = await supabase.from(table).delete().neq('id', 0);
    if (error) throw new Error(error.message);
}

export async function rpc<T>(fn: string, params: Record<string, any>): Promise<T> {
    const { data, error } = await supabase.rpc(fn, params);
    if (error) {
        // Junta message/details/hint do PostgrestError — pra erros vindos de
        // RAISE EXCEPTION (restore_backup) ou de constraint violation, isso
        // costuma trazer o motivo real (não uma mensagem genérica).
        const parts = [error.message, error.details, error.hint].filter(Boolean);
        throw new Error(parts.join(' — '));
    }
    return data as T;
}
