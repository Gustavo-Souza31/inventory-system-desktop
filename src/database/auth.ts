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
 *
 * nome/telefone vão em options.data: como a sessão ainda não existe até a
 * confirmação, é isso que alimenta o trigger que cria a linha em "profiles"
 * (ver supabase/schema.sql).
 */
export async function register(
    email: string,
    password: string,
    fullName: string,
    phone: string
): Promise<{ email: string; needsEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName, phone },
            emailRedirectTo: 'https://gustavo-souza31.github.io/inventory-system-desktop/',
        },
    });
    if (error) throw new Error(traduzErro(error.message));
    return { email, needsEmailConfirmation: !data.session };
}

export async function logout(): Promise<void> {
    await supabase.auth.signOut();
}

/**
 * O link de recuperação abre no navegador externo (mesma situação da
 * confirmação de cadastro — ver comentário em supabaseClient.ts), então
 * o redirectTo aponta pra uma página estática no GitHub Pages
 * (docs/reset-password.html) que troca a senha diretamente ali, sem
 * precisar do app Electron aberto.
 *
 * O Supabase sempre retorna sucesso aqui, exista ou não uma conta com
 * esse e-mail — é assim que evita revelar quais e-mails têm cadastro
 * (proteção contra enumeração de usuários já embutida na API, não é
 * algo que precisamos mascarar no frontend).
 */
export async function resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://gustavo-souza31.github.io/inventory-system-desktop/reset-password.html',
    });
    if (error) throw new Error(traduzErro(error.message));
}

function traduzErro(message: string): string {
    if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (message.includes('User already registered')) return 'Já existe uma conta com esse e-mail.';
    if (message.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    return message;
}
