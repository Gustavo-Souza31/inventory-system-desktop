import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Download } from 'lucide-react';
import { db } from '../database/db';
import type { Product, Movement, Location } from '../database/types';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { SearchBar } from '../components/SearchBar';
import { exportToCsv } from '../utils/export';

export function Movements() {
    const [movements, setMovements] = useState<(Movement & { productName?: string; locationName?: string })[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'' | 'entrada' | 'saida'>('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        productId: 0,
        type: 'entrada' as 'entrada' | 'saida',
        quantity: 1,
        reason: '',
        notes: '',
        locationId: null as number | null,
    });

    const loadData = useCallback(async () => {
        const prods = await db.products.toArray();
        const locs = await db.locations.toArray();
        setProducts(prods);
        setLocations(locs);
        const movs = await db.movements.orderBy('date').reverse().toArray();
        const enriched = movs.map((m) => ({
            ...m,
            productName: prods.find((p) => p.id === m.productId)?.name || 'Produto removido',
            locationName: m.locationId ? locs.find((l) => l.id === m.locationId)?.name || '-' : '-',
        }));
        setMovements(enriched);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = movements.filter((m) => {
        const matchSearch = (m.productName || '').toLowerCase().includes(search.toLowerCase()) ||
            m.reason.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === '' || m.type === filterType;
        return matchSearch && matchType;
    });

    function openNew() {
        setForm({
            productId: products[0]?.id || 0,
            type: 'entrada',
            quantity: 1,
            reason: '',
            notes: '',
            locationId: locations[0]?.id || null,
        });
        setModalOpen(true);
    }

    async function handleSave() {
        const now = new Date();
        await db.movements.add({
            productId: form.productId,
            type: form.type,
            quantity: form.quantity,
            reason: form.reason,
            notes: form.notes,
            locationId: form.locationId,
            date: now,
            createdAt: now,
        });

        // Update product quantity
        const product = await db.products.get(form.productId);
        if (product) {
            const newQty = form.type === 'entrada'
                ? product.quantity + form.quantity
                : Math.max(0, product.quantity - form.quantity);
            await db.products.update(product.id!, { quantity: newQty, updatedAt: now });
        }

        // Update location stock if location is specified
        if (form.locationId) {
            const existing = await db.productStock
                .where('[productId+locationId]')
                .equals([form.productId, form.locationId])
                .first();

            if (existing) {
                const newQty = form.type === 'entrada'
                    ? existing.quantity + form.quantity
                    : Math.max(0, existing.quantity - form.quantity);
                await db.productStock.update(existing.id!, { quantity: newQty });
            } else if (form.type === 'entrada') {
                await db.productStock.add({
                    productId: form.productId,
                    locationId: form.locationId,
                    quantity: form.quantity,
                });
            }
        }

        setModalOpen(false);
        loadData();
    }

    function handleExportCsv() {
        const headers = ['Data', 'Produto', 'Tipo', 'Quantidade', 'Motivo', 'Local', 'Observações'];
        const rows = filtered.map((m) => [
            new Date(m.date).toLocaleDateString('pt-BR'),
            m.productName || '', m.type === 'entrada' ? 'Entrada' : 'Saída',
            String(m.quantity), m.reason, m.locationName || '', m.notes,
        ]);
        exportToCsv('movimentacoes', headers, rows);
    }

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }

    return (
        <>
            <div className="toolbar">
                <div className="toolbar-left">
                    <SearchBar value={search} onChange={setSearch} placeholder="Buscar por produto ou motivo..." />
                    <select className="form-select" style={{ width: '160px' }} value={filterType} onChange={(e) => setFilterType(e.target.value as '' | 'entrada' | 'saida')}>
                        <option value="">Todos os tipos</option>
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                    </select>
                </div>
                <div className="toolbar-right">
                    <button className="btn btn-secondary" onClick={handleExportCsv}><Download size={16} /> CSV</button>
                    <button className="btn btn-primary" onClick={openNew} disabled={products.length === 0}><Plus size={16} /> Nova Movimentação</button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="Nenhuma movimentação" description={search || filterType ? 'Tente outros filtros.' : 'Registre entradas e saídas de estoque.'} action={!search && !filterType && products.length > 0 ? <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nova Movimentação</button> : undefined} />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Produto</th>
                                <th>Tipo</th>
                                <th style={{ textAlign: 'right' }}>Quantidade</th>
                                <th>Motivo</th>
                                <th>Local</th>
                                <th>Observações</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((m) => (
                                <tr key={m.id}>
                                    <td>
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: m.type === 'entrada' ? 'var(--success-bg)' : 'var(--danger-bg)',
                                            color: m.type === 'entrada' ? 'var(--success)' : 'var(--danger)',
                                        }}>
                                            {m.type === 'entrada' ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{m.productName}</td>
                                    <td>
                                        <span className={`badge ${m.type === 'entrada' ? 'badge-success' : 'badge-danger'}`}>
                                            {m.type === 'entrada' ? 'Entrada' : 'Saída'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }} className={m.type === 'entrada' ? 'text-success' : 'text-danger'}>
                                        {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                                    </td>
                                    <td className="text-muted">{m.reason || '-'}</td>
                                    <td className="text-muted">{m.locationName}</td>
                                    <td className="text-muted truncate" style={{ maxWidth: '180px' }}>{m.notes || '-'}</td>
                                    <td className="text-muted">{formatDate(m.date)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <Modal
                    title="Nova Movimentação"
                    onClose={() => setModalOpen(false)}
                    footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.productId || form.quantity <= 0}>Registrar</button></>}
                >
                    <div className="form-group">
                        <label className="form-label">Produto *</label>
                        <select className="form-select" value={form.productId} onChange={(e) => setForm({ ...form, productId: Number(e.target.value) })}>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Estoque: {p.quantity})</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Tipo *</label>
                            <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'entrada' | 'saida' })}>
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quantidade *</label>
                            <input className="form-input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Local</label>
                        <select className="form-select" value={form.locationId || ''} onChange={(e) => setForm({ ...form, locationId: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">Nenhum (geral)</option>
                            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Motivo</label>
                        <select className="form-select" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                            <option value="">Selecionar...</option>
                            <option value="Compra de fornecedor">Compra de fornecedor</option>
                            <option value="Venda">Venda</option>
                            <option value="Devolução">Devolução</option>
                            <option value="Ajuste de inventário">Ajuste de inventário</option>
                            <option value="Perda/Avaria">Perda/Avaria</option>
                            <option value="Transferência">Transferência</option>
                            <option value="Reposição">Reposição</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais (NF, pedido, etc.)" />
                    </div>
                </Modal>
            )}
        </>
    );
}
