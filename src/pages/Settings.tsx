import { useState, useEffect, useRef } from 'react';
import { Save, Download, Upload, CheckCircle, AlertCircle, Users, UserPlus, Trash2 } from 'lucide-react';
import { getAll, insert, updateById, clearTable } from '../database/sql-wrapper';
import { listMembers, addMember, setMemberRole, removeMember, type TeamMember, type MemberRole } from '../database/access';
import type { Settings as SettingsType } from '../database/types';
import { exportDatabase, importDatabase } from '../utils/backup';
import { canManageTeam, roleLabel } from '../utils/permissions';
import { translateDbError } from '../utils/dbErrors';
import { useRole } from '../components/Layout';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

// Todas as tabelas do banco (electron/database.ts), usado só pelo botão
// "Limpar Todos os Dados" abaixo.
const ALL_TABLES = [
    'movements', 'priceHistory', 'productStock', 'products',
    'categories', 'suppliers', 'locations', 'settings',
];

export function Settings() {
    const role = useRole();
    const isOwner = canManageTeam(role);

    const [settings, setSettings] = useState<SettingsType>({
        companyName: '',
        cnpj: '',
        lowStockThreshold: 10,
    });
    const [saved, setSaved] = useState(false);
    const [importMsg, setImportMsg] = useState<{ success: boolean; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [teamError, setTeamError] = useState<string | null>(null);
    const [teamSuccess, setTeamSuccess] = useState<string | null>(null);
    const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<MemberRole>('caixa');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);

    const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        async function load() {
            const [s] = await getAll<SettingsType & { id: number }>('settings');
            if (s) setSettings(s);
        }
        load();
    }, []);

    async function loadMembers() {
        setLoadingMembers(true);
        setTeamError(null);
        try {
            const list = await listMembers();
            setMembers(list);
        } catch (err) {
            setTeamError(err instanceof Error ? translateDbError(err.message) : 'Erro ao carregar equipe.');
        } finally {
            setLoadingMembers(false);
        }
    }

    useEffect(() => {
        if (isOwner) {
            loadMembers();
        }
    }, [isOwner]);

    function showTeamSuccess(message: string) {
        setTeamSuccess(message);
        setTimeout(() => setTeamSuccess(null), 4000);
    }

    function openInviteModal() {
        setInviteEmail('');
        setInviteRole('caixa');
        setInviteError(null);
        setInviteOpen(true);
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        const trimmedEmail = inviteEmail.trim();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            setInviteError('Informe um e-mail válido.');
            return;
        }
        setInviting(true);
        setInviteError(null);
        try {
            await addMember(trimmedEmail, inviteRole);
            setInviteOpen(false);
            showTeamSuccess(`Membro ${trimmedEmail} convidado como ${roleLabel(inviteRole)}.`);
            await loadMembers();
        } catch (err) {
            setInviteError(err instanceof Error ? translateDbError(err.message) : 'Erro ao convidar membro.');
        } finally {
            setInviting(false);
        }
    }

    async function handleRoleChange(member: TeamMember, newRole: MemberRole) {
        if (member.role === newRole) return;
        setUpdatingMemberId(member.memberId);
        setTeamError(null);
        setTeamSuccess(null);
        try {
            await setMemberRole(member.memberId, newRole);
            setMembers((prev) =>
                prev.map((m) => (m.memberId === member.memberId ? { ...m, role: newRole } : m))
            );
            showTeamSuccess(`Papel de ${member.fullName || member.email} alterado para ${roleLabel(newRole)}.`);
        } catch (err) {
            setTeamError(err instanceof Error ? translateDbError(err.message) : 'Erro ao alterar papel.');
        } finally {
            setUpdatingMemberId(null);
        }
    }

    async function handleConfirmRemove() {
        if (!removeTarget || removing) return;
        setRemoving(true);
        setTeamError(null);
        setTeamSuccess(null);
        try {
            await removeMember(removeTarget.memberId);
            const removedName = removeTarget.fullName || removeTarget.email;
            setMembers((prev) => prev.filter((m) => m.memberId !== removeTarget.memberId));
            setRemoveTarget(null);
            showTeamSuccess(`${removedName} foi removido da equipe.`);
        } catch (err) {
            setTeamError(err instanceof Error ? translateDbError(err.message) : 'Erro ao remover membro.');
            setRemoveTarget(null);
        } finally {
            setRemoving(false);
        }
    }

    async function handleSave() {
        const [existing] = await getAll<SettingsType & { id: number }>('settings');
        if (existing?.id) {
            await updateById('settings', existing.id, {
                companyName: settings.companyName,
                cnpj: settings.cnpj,
                lowStockThreshold: settings.lowStockThreshold,
            });
        } else {
            await insert('settings', settings);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!window.confirm('⚠️ Isto irá substituir TODOS os dados atuais por este backup. Esta ação NÃO PODE SER DESFEITA. Deseja continuar?')) {
            e.target.value = '';
            return;
        }
        const result = await importDatabase(file);
        setImportMsg(result);
        e.target.value = '';
        if (result.success) {
            const [s] = await getAll<SettingsType & { id: number }>('settings');
            if (s) setSettings(s);
        }
        setTimeout(() => setImportMsg(null), 5000);
    }

    return (
        <div style={{ maxWidth: '600px' }}>
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>Dados da Empresa</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label">Nome da Empresa</label>
                        <input className="form-input" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} placeholder="Nome da sua empresa" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">CNPJ</label>
                        <input className="form-input" value={settings.cnpj} onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>Estoque</div>
                <div className="form-group">
                    <label className="form-label">Limite padrão de estoque baixo</label>
                    <input className="form-input" type="number" min="1" value={settings.lowStockThreshold} onChange={(e) => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })} />
                    <span style={{ fontSize: '12px' }} className="text-muted">
                        Produtos com quantidade igual ou menor a este valor serão marcados como "estoque baixo".
                    </span>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>
                    <Download size={16} /> Backup e Restauração
                </div>
                <p style={{ fontSize: '13px', marginBottom: '16px' }} className="text-muted">
                    Exporte os dados do sistema como arquivo JSON para backup, ou importe um backup anterior.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={exportDatabase}>
                        <Download size={16} /> Exportar Backup
                    </button>
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} /> Importar Backup
                    </button>
                    <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                </div>
                {importMsg && (
                    <div style={{
                        marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: importMsg.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: importMsg.success ? 'var(--success)' : 'var(--danger)',
                    }}>
                        {importMsg.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {importMsg.message}
                    </div>
                )}
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>Banco de Dados</div>
                <p style={{ fontSize: '13px', marginBottom: '12px' }} className="text-muted">
                    Os dados são salvos localmente no seu computador em um arquivo SQLite.
                </p>
                <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                        if (window.confirm('⚠️ Isto irá apagar TODOS os dados. Tem certeza?')) {
                            for (const table of ALL_TABLES) {
                                await clearTable(table);
                            }
                            window.location.reload();
                        }
                    }}
                >
                    Limpar Todos os Dados
                </button>
            </div>

            <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%' }}>
                <Save size={16} />
                {saved ? '✓ Salvo com sucesso!' : 'Salvar Configurações'}
            </button>

            {isOwner && (
                <div className="card" style={{ marginTop: '24px' }}>
                    <div className="team-header">
                        <div className="section-title" style={{ marginBottom: 0 }}>
                            <Users size={16} /> Equipe
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={openInviteModal}>
                            <UserPlus size={14} /> Convidar membro
                        </button>
                    </div>
                    <p style={{ fontSize: '13px', marginBottom: '16px' }} className="text-muted">
                        Gerencie quem acessa esta loja. A pessoa convidada precisa já ter criado uma conta no app.
                    </p>

                    {teamSuccess && (
                        <div style={{
                            marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--success-bg)', color: 'var(--success)',
                        }}>
                            <CheckCircle size={16} />
                            {teamSuccess}
                        </div>
                    )}

                    {teamError && (
                        <div style={{
                            marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--danger-bg)', color: 'var(--danger)',
                        }}>
                            <AlertCircle size={16} />
                            {teamError}
                        </div>
                    )}

                    {loadingMembers ? (
                        <p className="text-muted" style={{ fontSize: '13px' }}>Carregando membros...</p>
                    ) : members.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: '13px' }}>
                            Nenhum membro na equipe ainda. Convide um gerente ou caixa para trabalhar na loja.
                        </p>
                    ) : (
                        <div className="team-list">
                            {members.map((member) => {
                                const displayName = member.fullName || member.email;
                                return (
                                    <div key={member.memberId} className="team-member-row">
                                        <div className="team-member-info">
                                            <div className="team-member-name truncate" title={displayName}>
                                                {displayName}
                                            </div>
                                            {member.fullName && (
                                                <div className="team-member-email truncate" title={member.email}>
                                                    {member.email}
                                                </div>
                                            )}
                                        </div>
                                        <div className="team-member-actions">
                                            <select
                                                className="form-select team-role-select"
                                                value={member.role}
                                                disabled={updatingMemberId === member.memberId}
                                                aria-label={`Papel de ${displayName}`}
                                                onChange={(e) => handleRoleChange(member, e.target.value as MemberRole)}
                                            >
                                                <option value="gerente">{roleLabel('gerente')}</option>
                                                <option value="caixa">{roleLabel('caixa')}</option>
                                            </select>
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => setRemoveTarget(member)}
                                                title="Remover membro"
                                                aria-label={`Remover ${displayName}`}
                                                style={{ color: 'var(--danger)' }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {inviteOpen && (
                <Modal
                    title="Convidar membro"
                    onClose={() => { if (!inviting) setInviteOpen(false); }}
                    footer={
                        <>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setInviteOpen(false)}
                                disabled={inviting}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="invite-member-form"
                                className="btn btn-primary"
                                disabled={inviting}
                            >
                                {inviting ? 'Convidando...' : 'Convidar'}
                            </button>
                        </>
                    }
                >
                    <form id="invite-member-form" onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">E-mail da conta *</label>
                            <input
                                className="form-input"
                                type="email"
                                autoFocus
                                required
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="funcionario@exemplo.com"
                            />
                            <span style={{ fontSize: '12px' }} className="text-muted">
                                A pessoa precisa já ter criado uma conta no Empacota com este e-mail.
                            </span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Papel</label>
                            <select
                                className="form-select"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                            >
                                <option value="caixa">{roleLabel('caixa')} — Vendas e consulta de Produtos (sem custo)</option>
                                <option value="gerente">{roleLabel('gerente')} — Tudo, exceto Configurações e Equipe</option>
                            </select>
                        </div>
                        {inviteError && (
                            <div style={{
                                padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--danger-bg)', color: 'var(--danger)',
                            }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <span>{inviteError}</span>
                            </div>
                        )}
                    </form>
                </Modal>
            )}

            {removeTarget && (
                <ConfirmDialog
                    title="Remover Membro"
                    message={`Tem certeza que deseja remover "${removeTarget.fullName || removeTarget.email}" da equipe? Esta pessoa perderá o acesso à loja.`}
                    confirmLabel={removing ? 'Removendo...' : 'Remover'}
                    onConfirm={handleConfirmRemove}
                    onCancel={() => { if (!removing) setRemoveTarget(null); }}
                />
            )}
        </div>
    );
}
