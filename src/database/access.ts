import { rpc } from './sql-wrapper';

export type Role = 'dono' | 'gerente' | 'caixa';
export type MemberRole = Exclude<Role, 'dono'>;

export interface MyAccess {
    role: Role;
    ownerId: string;
}

export interface TeamMember {
    memberId: string;
    email: string;
    fullName: string | null;
    role: MemberRole;
}

// Papel do usuário logado. Quem não é membro de nenhuma equipe é o dono da
// própria loja (inclusive todas as contas que já existiam antes dos perfis).
export async function getMyAccess(): Promise<MyAccess> {
    return rpc<MyAccess>('my_access', {});
}

// Gestão da equipe: só o dono. O banco recusa os demais com uma mensagem clara.
export async function listMembers(): Promise<TeamMember[]> {
    return rpc<TeamMember[]>('list_members', {});
}

export async function addMember(email: string, role: MemberRole): Promise<void> {
    await rpc('add_member', { p_email: email, p_role: role });
}

export async function setMemberRole(memberId: string, role: MemberRole): Promise<void> {
    await rpc('set_member_role', { p_member_id: memberId, p_role: role });
}

export async function removeMember(memberId: string): Promise<void> {
    await rpc('remove_member', { p_member_id: memberId });
}
