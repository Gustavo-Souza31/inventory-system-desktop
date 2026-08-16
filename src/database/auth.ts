import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

export async function getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
    return () => data.subscription.unsubscribe();
}

export async function login(email: string, password: string): Promise<{ email: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(traduzErro(error.message));
    return { email: data.user?.email ?? email };
}

/**
 * Retorna `needsEmailConfirmation: true` quando o projeto Supabase exige
 * confirmação por e-mail antes de liberar a sessão (comportamento padrão).
 */
export async function register(
    email: string,
    password: string
): Promise<{ email: string; needsEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(traduzErro(error.message));
    return { email, needsEmailConfirmation: !data.session };
}

export async function logout(): Promise<void> {
    await supabase.auth.signOut();
}

function traduzErro(message: string): string {
    if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (message.includes('User already registered')) return 'Já existe uma conta com esse e-mail.';
    if (message.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    return message;
}
