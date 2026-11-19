import type { Role } from '../database/access';

// Áreas do app que dependem do papel. A interface usa isto para montar o menu
// e esconder colunas. É conveniência: quem garante o acesso de verdade são as
// políticas de RLS no banco (ver supabase/schema.sql).
export type Area =
    | 'painel'
    | 'vendas'
    | 'produtos'
    | 'categorias'
    | 'fornecedores'
    | 'movimentacoes'
    | 'locais'
    | 'relatorios'
    | 'configuracoes'
    | 'contagem'
    | 'clientes'
    | 'equipe';

const CAIXA_AREAS: readonly Area[] = ['vendas', 'produtos', 'clientes'];
const GERENTE_AREAS: readonly Area[] = [
    'painel', 'vendas', 'produtos', 'categorias', 'fornecedores',
    'movimentacoes', 'locais', 'relatorios', 'contagem', 'clientes',
];

export function canAccess(role: Role, area: Area): boolean {
    if (role === 'dono') return true;
    if (role === 'gerente') return GERENTE_AREAS.includes(area);
    return CAIXA_AREAS.includes(area);
}

// Preço de custo e margem só para quem gerencia a loja.
export function canSeeCost(role: Role): boolean {
    return role !== 'caixa';
}

// Só o dono altera configurações e a equipe.
export function canManageTeam(role: Role): boolean {
    return role === 'dono';
}

export function roleLabel(role: Role): string {
    return role === 'dono' ? 'Dono' : role === 'gerente' ? 'Gerente' : 'Caixa';
}
