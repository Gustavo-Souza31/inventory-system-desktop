import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. Verifique o arquivo .env na raiz do projeto.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // O app roda em Electron/Capacitor: o link de confirmação por e-mail é
        // aberto no navegador do sistema, não dentro do app. No fluxo PKCE
        // (padrão da lib) o code_verifier fica salvo apenas no localStorage
        // da janela que chamou signUp(), então a troca do código por sessão
        // falha nesse navegador externo mesmo com o e-mail já confirmado no
        // servidor. O fluxo implicit não depende desse verifier local.
        flowType: 'implicit',
    },
});
