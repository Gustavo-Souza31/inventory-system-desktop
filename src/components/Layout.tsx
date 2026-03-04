import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

const navItems = [
    { label: 'Painel', path: '/', icon: LayoutDashboard },
    { label: 'Vendas', path: '/vendas', icon: ShoppingCart },
    { label: 'Produtos', path: '/produtos', icon: Package },
    { label: 'Categorias', path: '/categorias', icon: Tags },
    { label: 'Fornecedores', path: '/fornecedores', icon: Truck },
    { label: 'Movimentações', path: '/movimentacoes', icon: ArrowLeftRight },
    { label: 'Locais', path: '/locais', icon: MapPin },
    { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
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

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">
                            <BoxesIcon size={20} />
                        </div>
                        <div className="sidebar-logo-text">
                            <h1>Inventário</h1>
                            <span>Sistema de Gestão</span>
                        </div>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">Menu Principal</div>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `sidebar-link${isActive ? ' active' : ''}`
                            }
                        >
                            <item.icon />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            <div className="main-content">
                <header className="page-header">
                    <h2>{title}</h2>
                </header>
                <div className="page-body">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
