import { rpc } from './sql-wrapper';

export type Role = 'dono' | 'gerente' | 'caixa';
export type MemberRole = Exclude<Role, 'dono'>;
export type InviteStatus = 'pendente' | 'ativo';

export interface MyAccess {
    role: Role;
    ownerId: string;
}

export interface TeamMember {
    memberId: string;
    email: string;
    fullName: string | null;
    role: MemberRole;
    status: InviteStatus;
}

export interface PendingInvite {
    role: MemberRole;
    ownerEmail: string;
    ownerName: string | null;
    companyName: string | null;
}

// Papel do usuário logado. Quem não é membro (ativo) de nenhuma equipe é o dono
// da própria loja (inclusive todas as contas que já existiam antes dos perfis).
export async function getMyAccess(): Promise<MyAccess> {
    return rpc<MyAccess>('my_access', {});
}

// Gestão da equipe: só o dono. O banco recusa os demais com uma mensagem clara.
export async function listMembers(): Promise<TeamMember[]> {
    return rpc<TeamMember[]>('list_members', {});
}

// Cria um convite PENDENTE: só vale depois que a pessoa aceitar (acceptInvite).
export async function addMember(email: string, role: MemberRole): Promise<void> {
    await rpc('add_member', { p_email: email, p_role: role });
}

export async function setMemberRole(memberId: string, role: MemberRole): Promise<void> {
    await rpc('set_member_role', { p_member_id: memberId, p_role: role });
}

export async function removeMember(memberId: string): Promise<void> {
    await rpc('remove_member', { p_member_id: memberId });
}

// Lado de quem recebe o convite: ver, aceitar ou recusar/sair da equipe.
export async function getPendingInvite(): Promise<PendingInvite | null> {
    return (await rpc<PendingInvite | null>('my_pending_invite', {})) ?? null;
}

export async function acceptInvite(): Promise<void> {
    await rpc('accept_invite', {});
}

// Recusa um convite pendente ou sai de uma equipe da qual já faz parte.
export async function leaveTeam(): Promise<void> {
    await rpc('leave_team', {});
}
