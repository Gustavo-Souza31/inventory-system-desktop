import { useState, useEffect } from 'react';
import { Package, DollarSign, AlertTriangle, ArrowLeftRight, TrendingDown, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { db } from '../database/db';
import type { Product, Movement, Category } from '../database/types';
import { StatsCard } from '../components/StatsCard';

export function Dashboard() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [movements, setMovements] = useState<(Movement & { productName?: string })[]>([]);
    const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
    const [totalValue, setTotalValue] = useState(0);
    const [monthMovements, setMonthMovements] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const allProducts = await db.products.toArray();
        const allCategories = await db.categories.toArray();
        setProducts(allProducts);
        setCategories(allCategories);

        // Low stock items
        const lowStock = allProducts.filter((p) => p.quantity <= p.minStock);
        setLowStockItems(lowStock);

        // Total inventory value
        const value = allProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
        setTotalValue(value);

        // This month's movements
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const allMovements = await db.movements
            .where('date')
            .aboveOrEqual(firstOfMonth)
            .toArray();
        setMonthMovements(allMovements.length);

        // Recent movements (last 10)
        const recent = await db.movements.orderBy('date').reverse().limit(10).toArray();
        const enriched = await Promise.all(
            recent.map(async (m) => {
                const product = await db.products.get(m.productId);
                return { ...m, productName: product?.name || 'Produto removido' };
            })
        );
        setMovements(enriched);
    }

    function getCategoryName(categoryId: number) {
        return categories.find((c) => c.id === categoryId)?.name || '-';
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

    return (
        <>
            <div className="stats-grid">
                <StatsCard icon={Package} label="Total de Produtos" value={products.length} color="purple" />
                <StatsCard icon={DollarSign} label="Valor do Estoque" value={formatCurrency(totalValue)} color="green" />
                <StatsCard icon={AlertTriangle} label="Estoque Baixo" value={lowStockItems.length} color="yellow" />
                <StatsCard icon={ArrowLeftRight} label="Movimentações (mês)" value={monthMovements} color="blue" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Low Stock Alerts */}
                <div className="card">
                    <div className="section-title">
                        <TrendingDown size={16} />
                        Alertas de Estoque Baixo
                    </div>
                    {lowStockItems.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: '13px', padding: '12px 0' }}>
                            Nenhum produto com estoque baixo 🎉
                        </p>
                    ) : (
                        <div className="table-container" style={{ border: 'none' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th>Categoria</th>
                                        <th style={{ textAlign: 'right' }}>Qtd</th>
                                        <th style={{ textAlign: 'right' }}>Mín</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockItems.map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {p.quantity === 0 ? (
                                                        <span className="badge badge-danger">Sem estoque</span>
                                                    ) : (
                                                        <span className="badge badge-warning">Baixo</span>
                                                    )}
                                                    <span className="truncate">{p.name}</span>
                                                </div>
                                            </td>
                                            <td className="text-muted">{getCategoryName(p.categoryId)}</td>
                                            <td style={{ textAlign: 'right' }} className={p.quantity === 0 ? 'text-danger' : 'text-warning'}>
                                                {p.quantity}
                                            </td>
                                            <td style={{ textAlign: 'right' }} className="text-muted">{p.minStock}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                                        <div style={{ fontSize: '13px', fontWeight: 600 }} className={m.type === 'entrada' ? 'text-success' : 'text-danger'}>
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
