import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, MapPin, Package } from 'lucide-react';
import { db } from '../database/db';
import type { Location, ProductStock } from '../database/types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';

const emptyForm = { name: '', address: '', description: '' };

export function Locations() {
    const [locations, setLocations] = useState<(Location & { totalItems: number; productCount: number })[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
    const [locationStock, setLocationStock] = useState<(ProductStock & { productName: string; productSku: string })[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Location | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

    const loadData = useCallback(async () => {
        const locs = await db.locations.toArray();
        const prods = await db.products.toArray();
        const allStock = await db.productStock.toArray();

        const enriched = locs.map((loc) => {
            const stocks = allStock.filter((s) => s.locationId === loc.id);
            return {
                ...loc,
                totalItems: stocks.reduce((sum, s) => sum + s.quantity, 0),
                productCount: stocks.length,
            };
        });
        setLocations(enriched);

        if (selectedLocation) {
            const stocks = allStock.filter((s) => s.locationId === selectedLocation);
            const enrichedStock = stocks.map((s) => {
                const prod = prods.find((p) => p.id === s.productId);
                return { ...s, productName: prod?.name || 'Removido', productSku: prod?.sku || '-' };
            });
            setLocationStock(enrichedStock);
        }
    }, [selectedLocation]);

    useEffect(() => { loadData(); }, [loadData]);

    function openNew() {
        setEditing(null);
        setForm({ ...emptyForm });
        setModalOpen(true);
    }

    function openEdit(loc: Location) {
        setEditing(loc);
        setForm({ name: loc.name, address: loc.address, description: loc.description });
        setModalOpen(true);
    }

    async function handleSave() {
        if (editing?.id) {
            await db.locations.update(editing.id, { ...form });
        } else {
            await db.locations.add({ ...form, createdAt: new Date() } as Location);
        }
        setModalOpen(false);
        loadData();
    }

    async function handleDelete() {
        if (deleteTarget?.id) {
            await db.productStock.where('locationId').equals(deleteTarget.id).delete();
            await db.locations.delete(deleteTarget.id);
        }
        setDeleteTarget(null);
        setSelectedLocation(null);
        loadData();
    }

    return (
        <>
            <div className="toolbar">
                <div className="toolbar-left" />
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Local</button>
                </div>
            </div>

            {locations.length === 0 ? (
                <EmptyState icon={MapPin} title="Nenhum local cadastrado" description="Adicione locais de estoque para controlar a distribuição dos produtos." action={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Local</button>} />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                    {/* Location list */}
                    <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {locations.map((loc) => (
                                <div
                                    key={loc.id}
                                    className="card"
                                    onClick={() => setSelectedLocation(loc.id!)}
                                    style={{
                                        cursor: 'pointer',
                                        borderColor: selectedLocation === loc.id ? 'var(--accent)' : undefined,
                                        background: selectedLocation === loc.id ? 'var(--accent-light)' : undefined,
                                        padding: '14px 16px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <MapPin size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                        <span style={{ fontWeight: 600, fontSize: '14px', flex: 1 }}>{loc.name}</span>
                                        <div className="table-actions">
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(loc); }}><Pencil size={12} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(loc); }}><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px' }} className="text-muted">{loc.address || 'Sem endereço'}</div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11.5px' }}>
                                        <span className="badge badge-purple">{loc.productCount} produtos</span>
                                        <span className="badge badge-info">{loc.totalItems} itens</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stock detail */}
                    <div>
                        {selectedLocation ? (
                            <div className="card">
                                <div className="section-title" style={{ marginBottom: '12px' }}>
                                    <Package size={16} />
                                    Estoque em {locations.find((l) => l.id === selectedLocation)?.name}
                                </div>
                                {locationStock.length === 0 ? (
                                    <p className="text-muted" style={{ fontSize: '13px', padding: '12px 0' }}>Nenhum produto neste local.</p>
                                ) : (
                                    <div className="table-container" style={{ border: 'none' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Produto</th>
                                                    <th>SKU</th>
                                                    <th style={{ textAlign: 'right' }}>Quantidade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {locationStock.map((s) => (
                                                    <tr key={s.id}>
                                                        <td style={{ fontWeight: 500 }}>{s.productName}</td>
                                                        <td className="font-mono text-muted">{s.productSku}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                                <p className="text-muted">Selecione um local para ver o estoque</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {modalOpen && (
                <Modal
                    title={editing ? 'Editar Local' : 'Novo Local'}
                    onClose={() => setModalOpen(false)}
                    footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.name}>Salvar</button></>}
                >
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Depósito Principal" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Endereço</label>
                        <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Endereço do local" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descrição</label>
                        <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do local" />
                    </div>
                </Modal>
            )}

            {deleteTarget && (
                <ConfirmDialog title="Excluir Local" message={`Excluir "${deleteTarget.name}"? O estoque associado será removido.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
            )}
        </>
    );
}
