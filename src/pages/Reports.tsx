import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Package, DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, Download, Calendar } from 'lucide-react';
import { db } from '../database/db';
import type { Product, Category, Movement } from '../database/types';
import { StatsCard } from '../components/StatsCard';
import { exportToCsv } from '../utils/export';

type Period = '7d' | '30d' | 'week' | 'month' | 'all';

const periodLabels: Record<Period, string> = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    'week': 'Esta semana',
    'month': 'Este mês',
    'all': 'Todo o período',
};

function getDateRange(period: Period): Date | null {
    const now = new Date();
    switch (period) {
        case '7d': {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        case '30d': {
            const d = new Date(now);
            d.setDate(d.getDate() - 30);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        case 'week': {
            const d = new Date(now);
            const day = d.getDay();
            const diff = day === 0 ? 6 : day - 1; // Monday as start
            d.setDate(d.getDate() - diff);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        case 'month': {
            return new Date(now.getFullYear(), now.getMonth(), 1);
        }
        case 'all':
            return null;
    }
}

export function Reports() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [allMovements, setAllMovements] = useState<Movement[]>([]);
    const [period, setPeriod] = useState<Period>('30d');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'movements' | 'value'>('dashboard');

    useEffect(() => {
        async function load() {
            setProducts(await db.products.toArray());
            setCategories(await db.categories.toArray());
            setAllMovements(await db.movements.orderBy('date').reverse().toArray());
        }
        load();
    }, []);

    const startDate = getDateRange(period);

    const movements = useMemo(() => {
        if (!startDate) return allMovements;
        return allMovements.filter((m) => new Date(m.date) >= startDate);
    }, [allMovements, period]);

    // === Computed metrics ===
    const entradas = movements.filter((m) => m.type === 'entrada');
    const saidas = movements.filter((m) => m.type === 'saida');
    const totalEntradas = entradas.reduce((sum, m) => sum + m.quantity, 0);
    const totalSaidas = saidas.reduce((sum, m) => sum + m.quantity, 0);

    const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalCostValue = products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);
    const totalSaleValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const potentialProfit = totalSaleValue - totalCostValue;



    // Group movements by reason
    const movementsByReason = useMemo(() => {
        const map = new Map<string, { count: number; qty: number }>();
        movements.forEach((m) => {
            const key = m.reason || 'Sem motivo';
            const curr = map.get(key) || { count: 0, qty: 0 };
            map.set(key, { count: curr.count + 1, qty: curr.qty + m.quantity });
        });
        return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
    }, [movements]);

    // Top products by movement volume
    const topProducts = useMemo(() => {
        const map = new Map<number, { name: string; entradas: number; saidas: number }>();
        movements.forEach((m) => {
            const prod = products.find((p) => p.id === m.productId);
            const key = m.productId;
            const curr = map.get(key) || { name: prod?.name || 'Removido', entradas: 0, saidas: 0 };
            if (m.type === 'entrada') curr.entradas += m.quantity;
            else curr.saidas += m.quantity;
            map.set(key, curr);
        });
        return Array.from(map.entries())
            .map(([id, data]) => ({ id, ...data, total: data.entradas + data.saidas }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);
    }, [movements, products]);

    // Category breakdown
    const categoryValues = useMemo(() => {
        return categories.map((c) => {
            const catProducts = products.filter((p) => p.categoryId === c.id);
            const totalQty = catProducts.reduce((sum, p) => sum + p.quantity, 0);
            const totalVal = catProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
            return { ...c, totalQty, totalVal, productCount: catProducts.length };
        }).sort((a, b) => b.totalVal - a.totalVal);
    }, [products, categories]);

    function formatCurrency(val: number) {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function getCategoryName(id: number) {
        return categories.find((c) => c.id === id)?.name || '-';
    }

    function handleExportCsv() {
        if (activeTab === 'stock') {
            const headers = ['Produto', 'SKU', 'Categoria', 'Quantidade', 'Mínimo', 'Status', 'Valor Total'];
            const rows = products.sort((a, b) => a.quantity - b.quantity).map((p) => [
                p.name, p.sku, getCategoryName(p.categoryId), String(p.quantity), String(p.minStock),
                p.quantity === 0 ? 'Sem estoque' : p.quantity <= p.minStock ? 'Baixo' : 'OK',
                (p.price * p.quantity).toFixed(2),
            ]);
            exportToCsv('relatorio_estoque', headers, rows);
        } else if (activeTab === 'movements') {
            const headers = ['Data', 'Produto', 'Tipo', 'Quantidade', 'Motivo'];
            const rows = movements.map((m) => [
                new Date(m.date).toLocaleDateString('pt-BR'),
                products.find((p) => p.id === m.productId)?.name || 'Removido',
                m.type === 'entrada' ? 'Entrada' : 'Saída',
                String(m.quantity), m.reason,
            ]);
            exportToCsv('relatorio_movimentacoes', headers, rows);
        } else if (activeTab === 'value') {
            const headers = ['Categoria', 'Produtos', 'Itens', 'Valor Total', '% do Inventário'];
            const rows = categoryValues.map((c) => [
                c.name, String(c.productCount), String(c.totalQty), c.totalVal.toFixed(2),
                totalSaleValue > 0 ? ((c.totalVal / totalSaleValue) * 100).toFixed(1) + '%' : '0%',
            ]);
            exportToCsv('relatorio_valor', headers, rows);
        }
    }

    const tabs = [
        { key: 'dashboard' as const, label: 'Visão Geral', icon: BarChart3 },
        { key: 'stock' as const, label: 'Estoque Atual', icon: Package },
        { key: 'movements' as const, label: 'Movimentações', icon: BarChart3 },
        { key: 'value' as const, label: 'Valor do Inventário', icon: DollarSign },
    ];

    return (
        <>
            {/* Period filter bar */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(Object.keys(periodLabels) as Period[]).map((p) => (
                            <button
                                key={p}
                                className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setPeriod(p)}
                            >
                                {periodLabels[p]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="toolbar-right">
                    {activeTab !== 'dashboard' && (
                        <button className="btn btn-secondary btn-sm" onClick={handleExportCsv}><Download size={14} /> CSV</button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <StatsCard icon={Package} label="Itens em Estoque" value={totalItems} color="purple" />
                <StatsCard icon={DollarSign} label="Valor de Venda" value={formatCurrency(totalSaleValue)} color="green" />
                <StatsCard icon={TrendingUp} label="Lucro Potencial" value={formatCurrency(potentialProfit)} color="yellow" />
                <StatsCard icon={ArrowDownCircle} label={`Movimentações (${periodLabels[period].toLowerCase()})`} value={movements.length} color="blue" />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="btn btn-ghost"
                        style={{
                            borderRadius: '8px 8px 0 0',
                            borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.key ? 600 : 400,
                        }}
                    >
                        <tab.icon size={15} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Movement summary */}
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: '16px' }}>
                            <BarChart3 size={16} />
                            Resumo de Movimentações
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-sm)' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700 }}>{movements.length}</div>
                                <div style={{ fontSize: '11px' }} className="text-muted">Total</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'var(--success-bg)', borderRadius: 'var(--border-radius-sm)' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>+{totalEntradas}</div>
                                <div style={{ fontSize: '11px' }} className="text-muted">Entradas</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'var(--danger-bg)', borderRadius: 'var(--border-radius-sm)' }}>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger)' }}>-{totalSaidas}</div>
                                <div style={{ fontSize: '11px' }} className="text-muted">Saídas</div>
                            </div>
                        </div>
                        {/* Visual bar chart - entradas vs saidas */}
                        <div style={{ display: 'flex', gap: '4px', height: '24px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                            {totalEntradas + totalSaidas > 0 && (
                                <>
                                    <div style={{ width: `${(totalEntradas / (totalEntradas + totalSaidas)) * 100}%`, background: 'var(--success)', borderRadius: '6px 0 0 6px', transition: 'width 300ms ease', minWidth: totalEntradas > 0 ? '20px' : 0 }} />
                                    <div style={{ width: `${(totalSaidas / (totalEntradas + totalSaidas)) * 100}%`, background: 'var(--danger)', borderRadius: '0 6px 6px 0', transition: 'width 300ms ease', minWidth: totalSaidas > 0 ? '20px' : 0 }} />
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px' }} className="text-muted">
                            <span>🟢 Entradas {totalEntradas + totalSaidas > 0 ? ((totalEntradas / (totalEntradas + totalSaidas)) * 100).toFixed(0) : 0}%</span>
                            <span>🔴 Saídas {totalEntradas + totalSaidas > 0 ? ((totalSaidas / (totalEntradas + totalSaidas)) * 100).toFixed(0) : 0}%</span>
                        </div>
                    </div>

                    {/* Top products by movement */}
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: '12px' }}>
                            <Package size={16} />
                            Produtos mais Movimentados
                        </div>
                        {topProducts.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '13px', padding: '12px 0' }}>Nenhuma movimentação no período.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {topProducts.map((p) => {
                                    const maxTotal = topProducts[0]?.total || 1;
                                    return (
                                        <div key={p.id} className="list-item" style={{ gap: '10px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 500 }} className="truncate">{p.name}</div>
                                                <div style={{ display: 'flex', gap: '4px', height: '6px', marginTop: '4px', borderRadius: '3px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                                                    <div style={{ width: `${(p.entradas / maxTotal) * 100}%`, background: 'var(--success)', borderRadius: '3px' }} />
                                                    <div style={{ width: `${(p.saidas / maxTotal) * 100}%`, background: 'var(--danger)', borderRadius: '3px' }} />
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0, fontSize: '12px' }}>
                                                <span className="text-success">+{p.entradas}</span>
                                                {' / '}
                                                <span className="text-danger">-{p.saidas}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Movements by reason */}
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: '12px' }}>
                            <BarChart3 size={16} />
                            Por Motivo
                        </div>
                        {movementsByReason.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '13px' }}>Nenhum dado.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {movementsByReason.map(([reason, data]) => (
                                    <div key={reason} className="list-item">
                                        <div style={{ flex: 1, fontSize: '13px' }}>{reason}</div>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', flexShrink: 0 }}>
                                            <span className="badge badge-purple">{data.count}x</span>
                                            <span style={{ fontWeight: 600 }}>{data.qty} un</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Alerts summary */}
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: '12px' }}>
                            <Package size={16} />
                            Status do Estoque
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                                { label: 'Em estoque', count: products.filter((p) => p.quantity > p.minStock).length, color: 'var(--success)', bg: 'var(--success-bg)' },
                                { label: 'Estoque baixo', count: products.filter((p) => p.quantity > 0 && p.quantity <= p.minStock).length, color: 'var(--warning)', bg: 'var(--warning-bg)' },
                                { label: 'Sem estoque', count: products.filter((p) => p.quantity === 0).length, color: 'var(--danger)', bg: 'var(--danger-bg)' },
                            ].map((item) => {
                                const pct = products.length > 0 ? (item.count / products.length) * 100 : 0;
                                return (
                                    <div key={item.label}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                                            <span>{item.label}</span>
                                            <span style={{ fontWeight: 600, color: item.color }}>{item.count} ({pct.toFixed(0)}%)</span>
                                        </div>
                                        <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '4px', transition: 'width 300ms ease' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Tab */}
            {activeTab === 'stock' && (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>SKU</th>
                                <th>Categoria</th>
                                <th style={{ textAlign: 'right' }}>Quantidade</th>
                                <th style={{ textAlign: 'right' }}>Mínimo</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.sort((a, b) => a.quantity - b.quantity).map((p) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                                    <td className="font-mono text-muted">{p.sku}</td>
                                    <td className="text-muted">{getCategoryName(p.categoryId)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.quantity} {p.unit}</td>
                                    <td style={{ textAlign: 'right' }} className="text-muted">{p.minStock}</td>
                                    <td>
                                        {p.quantity === 0 ? <span className="badge badge-danger">Sem estoque</span> :
                                            p.quantity <= p.minStock ? <span className="badge badge-warning">Baixo</span> :
                                                <span className="badge badge-success">OK</span>}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(p.price * p.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Movements Tab */}
            {activeTab === 'movements' && (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '32px' }}></th>
                                <th>Data</th>
                                <th>Produto</th>
                                <th>Tipo</th>
                                <th style={{ textAlign: 'right' }}>Quantidade</th>
                                <th>Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map((m) => {
                                const product = products.find((p) => p.id === m.productId);
                                return (
                                    <tr key={m.id}>
                                        <td>
                                            <div style={{
                                                width: '26px', height: '26px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: m.type === 'entrada' ? 'var(--success-bg)' : 'var(--danger-bg)',
                                                color: m.type === 'entrada' ? 'var(--success)' : 'var(--danger)',
                                            }}>
                                                {m.type === 'entrada' ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                                            </div>
                                        </td>
                                        <td className="text-muted">{new Date(m.date).toLocaleDateString('pt-BR')}</td>
                                        <td style={{ fontWeight: 500 }}>{product?.name || 'Removido'}</td>
                                        <td>
                                            <span className={`badge ${m.type === 'entrada' ? 'badge-success' : 'badge-danger'}`}>
                                                {m.type === 'entrada' ? 'Entrada' : 'Saída'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }} className={m.type === 'entrada' ? 'text-success' : 'text-danger'}>
                                            {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                                        </td>
                                        <td className="text-muted">{m.reason || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Value Tab */}
            {activeTab === 'value' && (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Categoria</th>
                                <th style={{ textAlign: 'right' }}>Produtos</th>
                                <th style={{ textAlign: 'right' }}>Itens</th>
                                <th style={{ textAlign: 'right' }}>Valor Total</th>
                                <th style={{ textAlign: 'right' }}>% do Inventário</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryValues.map((c) => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
                                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{c.productCount}</td>
                                    <td style={{ textAlign: 'right' }}>{c.totalQty}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(c.totalVal)}</td>
                                    <td style={{ textAlign: 'right' }} className="text-muted">
                                        {totalSaleValue > 0 ? ((c.totalVal / totalSaleValue) * 100).toFixed(1) : '0.0'}%
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <td style={{ fontWeight: 700 }}>Total</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{products.length}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totalItems}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(totalSaleValue)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>100%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
