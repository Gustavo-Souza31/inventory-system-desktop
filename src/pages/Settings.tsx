import { useState, useEffect, useRef } from 'react';
import {
    Save, Download, Upload, CheckCircle, AlertCircle, LifeBuoy, MessageCircle, Mail, Users, UserPlus, Trash2,
} from 'lucide-react';
import { version as appVersion } from '../../package.json';
import { getAll, insert, updateById, clearTable } from '../database/sql-wrapper';
import { listMembers, addMember, setMemberRole, removeMember, type TeamMember, type MemberRole } from '../database/access';
import type { Settings as SettingsType } from '../database/types';
import { exportDatabase, importDatabase, daysSinceLastBackup } from '../utils/backup';
import { canManageTeam, roleLabel } from '../utils/permissions';
import { translateDbError } from '../utils/dbErrors';
import { SUPPORT_EMAIL, getWhatsAppSupportUrl, getMailtoSupportUrl } from '../config/support';
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
    const [backupDays, setBackupDays] = useState<number | null>(() => daysSinceLastBackup());
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

    const teamSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const importMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (teamSuccessTimerRef.current !== null) clearTimeout(teamSuccessTimerRef.current);
            if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
            if (importMsgTimerRef.current !== null) clearTimeout(importMsgTimerRef.current);
        };
    }, []);

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

    function clearTeamSuccess() {
        if (teamSuccessTimerRef.current !== null) {
            clearTimeout(teamSuccessTimerRef.current);
            teamSuccessTimerRef.current = null;
        }
        setTeamSuccess(null);
    }

    function showTeamSuccess(message: string) {
        if (teamSuccessTimerRef.current !== null) {
            clearTimeout(teamSuccessTimerRef.current);
        }
        setTeamSuccess(message);
        teamSuccessTimerRef.current = setTimeout(() => {
            setTeamSuccess(null);
            teamSuccessTimerRef.current = null;
        }, 4000);
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
            showTeamSuccess(`Convite enviado para ${trimmedEmail} como ${roleLabel(inviteRole)}.`);
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
        clearTeamSuccess();
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
        clearTeamSuccess();
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
        if (savedTimerRef.current !== null) {
            clearTimeout(savedTimerRef.current);
        }
        setSaved(true);
        savedTimerRef.current = setTimeout(() => {
            setSaved(false);
            savedTimerRef.current = null;
        }, 2500);
    }

    async function handleExport() {
        await exportDatabase();
        setBackupDays(daysSinceLastBackup());
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
        if (importMsgTimerRef.current !== null) {
            clearTimeout(importMsgTimerRef.current);
        }
        importMsgTimerRef.current = setTimeout(() => {
            setImportMsg(null);
            importMsgTimerRef.current = null;
        }, 5000);
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
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={16} /> Exportar Backup
                    </button>
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} /> Importar Backup
                    </button>
                    <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                </div>
                {(backupDays === null || backupDays > 7) && (
                    <p style={{
                        fontSize: '12px', marginTop: '12px', color: 'var(--warning)',
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>
                            {backupDays === null
                                ? 'Você ainda não fez backup neste computador.'
                                : `Último backup há ${backupDays} ${backupDays === 1 ? 'dia' : 'dias'}.`}
                        </span>
                    </p>
                )}
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
                        Gerencie quem acessa esta loja. A pessoa convidada precisa ter uma conta nova no app e aceitar o convite ao entrar.
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
                                const isPending = member.status === 'pendente';
                                return (
                                    <div key={member.memberId} className="team-member-row">
                                        <div className="team-member-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <div className="team-member-name truncate" title={displayName}>
                                                    {displayName}
                                                </div>
                                                <span className={`badge ${isPending ? 'badge-warning' : 'badge-success'}`}>
                                                    {isPending ? 'Convite pendente' : 'Ativo'}
                                                </span>
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

            <div className="card" style={{ marginTop: '20px' }}>
                <div className="section-title" style={{ marginBottom: '12px' }}>
                    <LifeBuoy size={16} /> Ajuda e suporte
                </div>
                <p style={{ fontSize: '13px', marginBottom: '16px' }} className="text-muted">
                    Precisa de ajuda com o Empacota? Fale com nossa equipe pelo WhatsApp ou por e-mail.
                </p>
                <div className="support-actions">
                    <a
                        className="btn btn-secondary"
                        href={getWhatsAppSupportUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <MessageCircle size={16} />
                        Falar no WhatsApp
                    </a>
                    <a
                        className="btn btn-secondary"
                        href={getMailtoSupportUrl()}
                    >
                        <Mail size={16} />
                        {SUPPORT_EMAIL}
                    </a>
                </div>
                <div className="support-version">
                    <span>Versão do app</span>
                    <span className="font-mono">v{appVersion}</span>
                </div>
            </div>

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
                                A pessoa precisa ter uma conta nova no app e aceitar o convite ao entrar.
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
