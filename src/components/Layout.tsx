import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Navigate, useOutletContext } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Tags,
    Truck,
    ArrowLeftRight,
    BarChart3,
    Settings,
    BoxesIcon,
    MapPin,
    ShoppingCart,
    Menu,
    X,
    LogOut,
    Bell,
    type LucideIcon,
} from 'lucide-react';
import { logout } from '../database/auth';
import { getMyAccess, type Role } from '../database/access';
import { supabase } from '../database/supabaseClient';
import { getAll } from '../database/sql-wrapper';
import { getLowStockAlerts, type LowStockAlert } from '../utils/lowStock';
import { canAccess, roleLabel, type Area } from '../utils/permissions';
import { LowStockModal } from './LowStockModal';
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
    { label: 'Produtos', path: '/produtos', icon: Package, area: 'produtos' },
    { label: 'Categorias', path: '/categorias', icon: Tags, area: 'categorias' },
    { label: 'Fornecedores', path: '/fornecedores', icon: Truck, area: 'fornecedores' },
    { label: 'Movimentações', path: '/movimentacoes', icon: ArrowLeftRight, area: 'movimentacoes' },
    { label: 'Locais', path: '/locais', icon: MapPin, area: 'locais' },
    { label: 'Relatórios', path: '/relatorios', icon: BarChart3, area: 'relatorios' },
    { label: 'Configurações', path: '/configuracoes', icon: Settings, area: 'configuracoes' },
];

const pageTitles: Record<string, string> = {
    '/': 'Painel de Controle',
    '/vendas': 'Ponto de Venda',
    '/produtos': 'Produtos',
    '/categorias': 'Categorias',
    '/fornecedores': 'Fornecedores',
    '/movimentacoes': 'Movimentações de Estoque',
    '/locais': 'Locais de Estoque',
    '/relatorios': 'Relatórios',
    '/configuracoes': 'Configurações',
};

export function Layout() {
    const location = useLocation();
    const title = pageTitles[location.pathname] || 'Inventário';
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
    const [showLowStock, setShowLowStock] = useState(false);
    const [role, setRole] = useState<Role | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    }, []);

    // Carrega o papel uma vez ao entrar; se falhar (ex.: conta antiga ou RPC
    // indisponível), assume dono para não bloquear o acesso existente.
    useEffect(() => {
        let active = true;
        getMyAccess()
            .then((access) => {
                if (!active) return;
                const r = access?.role;
                setRole(r === 'dono' || r === 'gerente' || r === 'caixa' ? r : 'dono');
            })
            .catch(() => {
                if (active) setRole('dono');
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        getAll<SettingsType>('settings').then(([s]) => {
            if (s?.companyName) setCompanyName(s.companyName);
        });
    }, []);

    // Layout monta uma vez por sessão válida (login novo ou restaurada ao
    // reabrir o app) — é o ponto natural para checar estoque baixo "ao entrar
    // no sistema", sem distinguir os dois casos.
    useEffect(() => {
        getLowStockAlerts().then((alerts) => {
            setLowStockAlerts(alerts);
            if (alerts.length > 0) setShowLowStock(true);
        });
    }, []);

    if (role === null) {
        return null;
    }

    const visibleNavItems = navItems.filter((item) => canAccess(role, item.area));
    const currentItem = navItems.find((item) => item.path === location.pathname);
    if (currentItem && !canAccess(role, currentItem.area)) {
        const fallbackPath = visibleNavItems[0]?.path ?? '/vendas';
        return <Navigate to={fallbackPath} replace />;
    }

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
                    {visibleNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `sidebar-link${isActive ? ' active' : ''}`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
                    <button
                        className="sidebar-link"
                        style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', justifyContent: 'space-between' }}
                        onClick={() => setShowLowStock(true)}
                        title="Produtos com estoque baixo"
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Bell />
                            Estoque baixo
                        </span>
                        {lowStockAlerts.length > 0 && (
                            <span className="badge badge-warning">{lowStockAlerts.length}</span>
                        )}
                    </button>
                </div>
                <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
                    <div className="sidebar-user-meta">
                        <div style={{ fontSize: '11px', maxWidth: '100%' }} className="text-muted truncate">
                            {email}
                        </div>
                        <span className="badge badge-purple">{roleLabel(role)}</span>
                    </div>
                    <button
                        className="sidebar-link"
                        style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
                        onClick={() => { logout(); }}
                    >
                        <LogOut />
                        Sair
                    </button>
                </div>
            </aside>
            <div className="main-content">
                <header className="page-header">
                    <h2>{title}</h2>
                    {companyName && <span className="page-header-company">{companyName}</span>}
                </header>
                <div className="page-body">
                    <Outlet context={{ role } satisfies LayoutContext} />
                </div>
            </div>

            {showLowStock && (
                <LowStockModal alerts={lowStockAlerts} onClose={() => setShowLowStock(false)} />
            )}
        </div>
    );
}

