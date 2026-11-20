import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, Navigate, useOutletContext } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Tags,
    Truck,
    ArrowLeftRight,
    ClipboardCheck,
    BarChart3,
    Settings,
    BoxesIcon,
    MapPin,
    ShoppingCart,
    Users,
    Menu,
    X,
    LogOut,
    Bell,
    UserPlus,
    type LucideIcon,
} from 'lucide-react';
import { logout } from '../database/auth';
import {
    getMyAccess,
    getPendingInvite,
    acceptInvite,
    leaveTeam,
    type Role,
    type PendingInvite,
} from '../database/access';
import { supabase } from '../database/supabaseClient';
import { getAll } from '../database/sql-wrapper';
import { getLowStockAlerts, type LowStockAlert } from '../utils/lowStock';
import { canAccess, roleLabel, type Area } from '../utils/permissions';
import { translateDbError } from '../utils/dbErrors';
import { LowStockModal } from './LowStockModal';
import { ConfirmDialog } from './ConfirmDialog';
import type { Settings as SettingsType } from '../database/types';

export interface LayoutContext {
    role: Role;
}

export function useRole(): Role {
    const ctx = useOutletContext<LayoutContext | null>();
    return ctx?.role ?? 'dono';
}

const navItems: { label: string; path: string; icon: LucideIcon; area: Area }[] = [
    { label: 'Painel', path: '/', icon: LayoutDashboard, area: 'painel' },
    { label: 'Vendas', path: '/vendas', icon: ShoppingCart, area: 'vendas' },
    { label: 'Clientes', path: '/clientes', icon: Users, area: 'clientes' },
    { label: 'Produtos', path: '/produtos', icon: Package, area: 'produtos' },
    { label: 'Categorias', path: '/categorias', icon: Tags, area: 'categorias' },
    { label: 'Fornecedores', path: '/fornecedores', icon: Truck, area: 'fornecedores' },
    { label: 'Movimentações', path: '/movimentacoes', icon: ArrowLeftRight, area: 'movimentacoes' },
    { label: 'Contagem', path: '/contagem', icon: ClipboardCheck, area: 'contagem' },
    { label: 'Locais', path: '/locais', icon: MapPin, area: 'locais' },
    { label: 'Relatórios', path: '/relatorios', icon: BarChart3, area: 'relatorios' },
    { label: 'Configurações', path: '/configuracoes', icon: Settings, area: 'configuracoes' },
];

const pageTitles: Record<string, string> = {
    '/': 'Painel de Controle',
    '/vendas': 'Ponto de Venda',
    '/clientes': 'Clientes',
    '/produtos': 'Produtos',
    '/categorias': 'Categorias',
    '/fornecedores': 'Fornecedores',
    '/movimentacoes': 'Movimentações de Estoque',
    '/contagem': 'Contagem de Estoque',
    '/locais': 'Locais de Estoque',
    '/relatorios': 'Relatórios',
    '/configuracoes': 'Configurações',
};

function parseRole(value: unknown): Role {
    return value === 'dono' || value === 'gerente' || value === 'caixa' ? value : 'dono';
}

export function Layout() {
    const location = useLocation();
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
    const title = pageTitles[normalizedPath] || 'Inventário';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
    const [showLowStock, setShowLowStock] = useState(false);
    const [role, setRole] = useState<Role | null>(null);
    const [teamVersion, setTeamVersion] = useState(0);
    const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
    const [inviteBusy, setInviteBusy] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [leavingTeam, setLeavingTeam] = useState(false);
    const [leaveTeamError, setLeaveTeamError] = useState<string | null>(null);
    const hasCheckedInitialAlertsRef = useRef(false);

    useEffect(() => {
        let active = true;
        supabase.auth.getUser()
            .then(({ data }) => {
                if (active) setEmail(data.user?.email ?? null);
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    // Carrega o papel uma vez ao entrar; se falhar (ex.: conta antiga ou RPC
    // indisponível), assume dono para não bloquear o acesso existente.
    useEffect(() => {
        let active = true;
        getMyAccess()
            .then((access) => {
                if (active) setRole(parseRole(access?.role));
            })
            .catch(() => {
                if (active) setRole('dono');
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getPendingInvite()
            .then((invite) => {
                if (active) setPendingInvite(invite);
            })
            .catch(() => {
                if (active) setPendingInvite(null);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getAll<SettingsType>('settings')
            .then(([s]) => {
                if (active) setCompanyName(s?.companyName || null);
            })
            .catch(() => {});
        return () => { active = false; };
    }, [teamVersion]);

    // Layout monta uma vez por sessão válida (login novo ou restaurada ao
    // reabrir o app) — é o ponto natural para checar estoque baixo "ao entrar
    // no sistema", sem distinguir os dois casos. Nas navegações e edições
    // seguintes, atualiza apenas o contador da barra lateral.
    // Para o papel caixa, não busca nem abre o modal (contém dados de fornecedores).
    useEffect(() => {
        if (role === null || role === 'caixa') {
            setLowStockAlerts([]);
            setShowLowStock(false);
            return;
        }
        let cancelled = false;
        const refreshAlerts = () => {
            getLowStockAlerts()
                .then((alerts) => {
                    if (cancelled) return;
                    setLowStockAlerts(alerts);
                    if (!hasCheckedInitialAlertsRef.current) {
                        hasCheckedInitialAlertsRef.current = true;
                        if (alerts.length > 0) setShowLowStock(true);
                    }
                })
                .catch(() => {
                    if (!cancelled) setLowStockAlerts([]);
                });
        };
        refreshAlerts();
        window.addEventListener('empacota:stock-changed', refreshAlerts);
        return () => {
            cancelled = true;
            window.removeEventListener('empacota:stock-changed', refreshAlerts);
        };
    }, [role, normalizedPath]);

    async function handleAcceptInvite() {
        if (inviteBusy) return;
        setInviteBusy(true);
        setInviteError(null);
        try {
            await acceptInvite();
            setPendingInvite(null);
            const access = await getMyAccess();
            hasCheckedInitialAlertsRef.current = false;
            setRole(parseRole(access?.role));
            setTeamVersion((v) => v + 1);
        } catch (err) {
            setInviteError(err instanceof Error ? translateDbError(err.message) : 'Erro ao aceitar convite.');
        } finally {
            setInviteBusy(false);
        }
    }

    async function handleDeclineInvite() {
        if (inviteBusy) return;
        setInviteBusy(true);
        setInviteError(null);
        try {
            await leaveTeam();
            setPendingInvite(null);
        } catch (err) {
            setInviteError(err instanceof Error ? translateDbError(err.message) : 'Erro ao recusar convite.');
        } finally {
            setInviteBusy(false);
        }
    }

    async function handleConfirmLeaveTeam() {
        if (leavingTeam) return;
        setLeavingTeam(true);
        setLeaveTeamError(null);
        try {
            await leaveTeam();
            setLeaveConfirmOpen(false);
            const access = await getMyAccess().catch(() => ({ role: 'dono' as Role, ownerId: '' }));
            hasCheckedInitialAlertsRef.current = false;
            setRole(parseRole(access?.role));
            setTeamVersion((v) => v + 1);
        } catch (err) {
            setLeaveConfirmOpen(false);
            setLeaveTeamError(err instanceof Error ? translateDbError(err.message) : 'Erro ao sair da equipe.');
        } finally {
            setLeavingTeam(false);
        }
    }

    if (role === null) {
        return null;
    }

    const canSeeLowStock = role === 'dono' || role === 'gerente';
    const isTeamMember = role !== 'dono';
    const visibleNavItems = navItems.filter((item) => canAccess(role, item.area));
    const currentItem = navItems.find((item) => item.path === normalizedPath);
    if (!currentItem || !canAccess(role, currentItem.area)) {
        const fallbackPath = visibleNavItems[0]?.path ?? '/vendas';
        if (normalizedPath !== fallbackPath) {
            return <Navigate to={fallbackPath} replace />;
        }
    }

    const inviterLabel = pendingInvite
        ? (pendingInvite.ownerName?.trim() || pendingInvite.ownerEmail)
        : '';

    return (
        <div className="app-layout">
            {/* Hamburger toggle (visible only on small screens via CSS) */}
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay backdrop */}
            <div
                className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">
                            <BoxesIcon size={20} />
                        </div>
                        <div className="sidebar-logo-text">
                            <h1>Empacota</h1>
                            <span>Sistema de Gestão</span>
                        </div>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">Menu Principal</div>
                    {visibleNavItems.map((item) => {
                        const showProductsBadge = canSeeLowStock && item.path === '/produtos' && lowStockAlerts.length > 0;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) =>
                                    `sidebar-link${isActive ? ' active' : ''}`
                                }
                                onClick={() => setSidebarOpen(false)}
                                title={showProductsBadge ? `${item.label} (${lowStockAlerts.length} com estoque baixo)` : item.label}
                            >
                                <item.icon />
                                <span className="sidebar-link-label">{item.label}</span>
                                {showProductsBadge && (
                                    <span className="badge badge-warning sidebar-badge">{lowStockAlerts.length}</span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>
                {canSeeLowStock && (
                    <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
                        <button
                            className="sidebar-link"
                            onClick={() => setShowLowStock(true)}
                            title="Produtos com estoque baixo"
                        >
                            <Bell />
                            <span className="sidebar-link-label">Estoque baixo</span>
                            {lowStockAlerts.length > 0 && (
                                <span className="badge badge-warning sidebar-badge">{lowStockAlerts.length}</span>
                            )}
                        </button>
                    </div>
                )}
                <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
                    <div className="sidebar-user-meta">
                        <div style={{ fontSize: '11px', maxWidth: '100%' }} className="text-muted truncate">
                            {email}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="badge badge-purple">{roleLabel(role)}</span>
                            {isTeamMember && (
                                <button
                                    type="button"
                                    className="sidebar-leave-team-btn"
                                    onClick={() => setLeaveConfirmOpen(true)}
                                >
                                    Sair da equipe
                                </button>
                            )}
                        </div>
                    </div>
                    <button
                        className="sidebar-link"
                        style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
                        onClick={() => { logout(); }}
                    >
                        <LogOut />
                        <span className="sidebar-link-label">Sair</span>
                    </button>
                </div>
            </aside>
            <div className="main-content">
                <header className="page-header">
                    <h2>{title}</h2>
                    {companyName && <span className="page-header-company">{companyName}</span>}
                </header>
                {pendingInvite && (
                    <div className="pending-invite-banner" role="region" aria-label="Convite de equipe pendente">
                        <div className="pending-invite-content">
                            <UserPlus size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <div>
                                <div className="pending-invite-text">
                                    <strong>{inviterLabel}</strong> convidou você para a equipe como{' '}
                                    <strong>{roleLabel(pendingInvite.role)}</strong>.
                                </div>
                                {inviteError && (
                                    <div className="pending-invite-error">⚠️ {inviteError}</div>
                                )}
                            </div>
                        </div>
                        <div className="pending-invite-actions">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleDeclineInvite}
                                disabled={inviteBusy}
                            >
                                Recusar
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={handleAcceptInvite}
                                disabled={inviteBusy}
                            >
                                {inviteBusy ? 'Processando...' : 'Aceitar'}
                            </button>
                        </div>
                    </div>
                )}
                {leaveTeamError && (
                    <div className="pending-invite-banner pending-invite-banner-error" role="alert">
                        <span>⚠️ {leaveTeamError}</span>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setLeaveTeamError(null)}
                            aria-label="Fechar aviso"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="page-body">
                    <Outlet key={teamVersion} context={{ role } satisfies LayoutContext} />
                </div>
            </div>

            {canSeeLowStock && showLowStock && (
                <LowStockModal alerts={lowStockAlerts} onClose={() => setShowLowStock(false)} />
            )}

            {leaveConfirmOpen && (
                <ConfirmDialog
                    title="Sair da equipe"
                    message="Tem certeza que deseja sair desta equipe? Você perderá o acesso aos dados da loja."
                    confirmLabel={leavingTeam ? 'Saindo...' : 'Sair da equipe'}
                    onConfirm={handleConfirmLeaveTeam}
                    onCancel={() => { if (!leavingTeam) setLeaveConfirmOpen(false); }}
                />
            )}
        </div>
    );
}

