import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, DollarSign, AlertTriangle, ArrowLeftRight, TrendingDown, ArrowDownCircle, ArrowUpCircle, ChevronRight, CheckCircle } from 'lucide-react';
import { getAll } from '../database/sql-wrapper';
import type { Product, Movement } from '../database/types';
import { StatsCard } from '../components/StatsCard';
import { EmptyState } from '../components/EmptyState';
import { isLowStock, getLowStockThreshold } from '../utils/lowStock';

function getEffectiveMin(product: Product, threshold: number): number {
    return product.minStock > 0 ? product.minStock : threshold;
}

// Ordena do mais crítico ao menos crítico: zerados primeiro, depois menor razão atual/mínimo
// e maior déficit absoluto em caso de empate.
function sortWorstLowStock(items: Product[], threshold: number): Product[] {
    return [...items].sort((a, b) => {
        const minA = getEffectiveMin(a, threshold);
        const minB = getEffectiveMin(b, threshold);
        const ratioA = minA > 0 ? a.quantity / minA : (a.quantity === 0 ? 0 : 1);
        const ratioB = minB > 0 ? b.quantity / minB : (b.quantity === 0 ? 0 : 1);
        if (ratioA !== ratioB) return ratioA - ratioB;
        const deficitA = minA - a.quantity;
        const deficitB = minB - b.quantity;
        if (deficitA !== deficitB) return deficitB - deficitA;
        return a.name.localeCompare(b.name, 'pt-BR');
    });
}

export function Dashboard() {
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<(Movement & { productName?: string })[]>([]);
    const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
    const [lowStockThreshold, setLowStockThreshold] = useState(10);
    const [totalValue, setTotalValue] = useState(0);
    const [monthMovements, setMonthMovements] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const allProducts = await getAll<Product>('products');
        setProducts(allProducts);

        // Low stock items (minStock do produto, com o limite padrão das
        // configurações como fallback quando o produto não tem o dele)
        const threshold = await getLowStockThreshold();
        setLowStockThreshold(threshold);
        const lowStock = sortWorstLowStock(
            allProducts.filter((p) => isLowStock(p, threshold)),
            threshold,
        );
        setLowStockItems(lowStock);

        // Total inventory value
        const value = allProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
        setTotalValue(value);

        const allMovements = await getAll<Movement>('movements');

        // This month's movements
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthCount = allMovements.filter((m) => new Date(m.date) >= firstOfMonth).length;
        setMonthMovements(monthCount);

        // Recent movements (last 10)
        const recent = [...allMovements]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map((m) => ({
                ...m,
                productName: allProducts.find((p) => p.id === m.productId)?.name || 'Produto removido',
            }));
        setMovements(recent);
    }

    function formatCurrency(value: number) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    const worstLowStock = lowStockItems.slice(0, 5);
    const hasZeroStock = lowStockItems.some((p) => p.quantity === 0);

    return (
        <>
            <div className="stats-grid">
                <StatsCard icon={Package} label="Total de Produtos" value={products.length} color="purple" />
                <StatsCard icon={DollarSign} label="Valor do Estoque" value={formatCurrency(totalValue)} color="green" />
                <Link to="/produtos?filtro=baixo" className="stat-card-link">
                    <StatsCard icon={AlertTriangle} label="Estoque Baixo" value={lowStockItems.length} color="yellow" />
                </Link>
                <StatsCard icon={ArrowLeftRight} label="Movimentações (mês)" value={monthMovements} color="blue" />
            </div>

            <div className="dashboard-grid">
                {/* Low Stock Alerts */}
                <div
                    className="card"
                    style={lowStockItems.length > 0 ? { borderLeft: '3px solid var(--warning)' } : undefined}
                >
                    <div className="card-header-between">
                        <div className="section-title" style={{ marginBottom: 0 }}>
                            <TrendingDown size={16} />
                            <span>Estoque baixo</span>
                            {lowStockItems.length > 0 && (
                                <span className={`badge ${hasZeroStock ? 'badge-danger' : 'badge-warning'}`}>
                                    {lowStockItems.length}
                                </span>
                            )}
                        </div>
                        {lowStockItems.length > 0 && (
                            <Link to="/produtos?filtro=baixo" className="btn btn-ghost btn-sm">
                                Ver todos
                                <ChevronRight size={14} />
                            </Link>
                        )}
                    </div>
                    {lowStockItems.length === 0 ? (
                        <EmptyState
                            icon={CheckCircle}
                            title="Nenhum produto com estoque baixo"
                            description="Todos os produtos estão acima do estoque mínimo."
                        />
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {worstLowStock.map((p) => {
                                    const effectiveMin = getEffectiveMin(p, lowStockThreshold);
                                    const targetUrl = p.id !== undefined
                                        ? `/produtos?filtro=baixo&produto=${p.id}`
                                        : '/produtos?filtro=baixo';
                                    return (
                                        <Link
                                            key={p.id ?? p.sku}
                                            to={targetUrl}
                                            className={`list-item low-stock-link${p.quantity === 0 ? ' low-stock-zero' : ''}`}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                {p.quantity === 0 ? (
                                                    <span className="badge badge-danger">Sem estoque</span>
                                                ) : (
                                                    <span className="badge badge-warning">Baixo</span>
                                                )}
                                                <span className="truncate" style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }} title="Atual / Mínimo">
                                                    <span className={p.quantity === 0 ? 'text-danger' : 'text-warning'}>{p.quantity}</span>
                                                    <span className="text-muted"> / {effectiveMin} {p.unit}</span>
                                                </span>
                                                <ChevronRight size={14} className="text-muted" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                            {lowStockItems.length > 5 && (
                                <div className="text-muted" style={{ fontSize: '12px', marginTop: '10px', textAlign: 'right' }}>
                                    Exibindo os 5 mais críticos de {lowStockItems.length}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Recent Movements */}
                <div className="card">
                    <div className="section-title">
                        <ArrowLeftRight size={16} />
                        Movimentações Recentes
                    </div>
                    {movements.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: '13px', padding: '12px 0' }}>
                            Nenhuma movimentação registrada ainda.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {movements.map((m) => (
                                <div key={m.id} className="list-item">
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        background: m.type === 'entrada' ? 'var(--success-bg)' : 'var(--danger-bg)',
                                        color: m.type === 'entrada' ? 'var(--success)' : 'var(--danger)',
                                    }}>
                                        {m.type === 'entrada' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 500 }} className="truncate">{m.productName}</div>
                                        <div style={{ fontSize: '11.5px' }} className="text-muted">{m.reason}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }} className={`tabular-nums ${m.type === 'entrada' ? 'text-success' : 'text-danger'}`}>
                                            {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                                        </div>
                                        <div style={{ fontSize: '11px' }} className="text-muted">{formatDate(m.date)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
