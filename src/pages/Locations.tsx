import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, MapPin, Package } from 'lucide-react';
import { getAll } from '../database/sql-wrapper';
import { useCrud } from '../hooks/useCrud';
import type { Location, ProductStock, Product } from '../database/types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';

type LocationForm = { name: string; address: string; description: string };
const emptyForm: LocationForm = { name: '', address: '', description: '' };

export function Locations() {
    const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
    const [allStock, setAllStock] = useState<ProductStock[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const {
        items: rawLocations, modalOpen, setModalOpen, editing, form, setForm,
        deleteTarget, setDeleteTarget, openNew, openEdit, handleSave, handleDelete: handleDeleteBase,
    } = useCrud<Location, LocationForm>({
        table: 'locations',
        emptyForm,
        toForm: (loc) => ({ name: loc.name, address: loc.address, description: loc.description }),
        toRecord: (form, isNew) => (isNew ? { ...form, createdAt: new Date() } : { ...form }),
        // Não precisa apagar o estoque do local manualmente: a FK
        // productStock.locationId tem ON DELETE CASCADE, o banco já
        // remove essas linhas sozinho ao excluir o local.
    });

    // Recarrega estoque/produtos sempre que a lista de locais mudar
    // (ou seja, depois de qualquer criação/edição/exclusão)
    useEffect(() => {
        Promise.all([getAll<ProductStock>('productStock'), getAll<Product>('products')])
            .then(([stock, prods]) => {
                setAllStock(stock);
                setProducts(prods);
            });
    }, [rawLocations]);

    const locations = rawLocations.map((loc) => {
        const stocks = allStock.filter((s) => s.locationId === loc.id);
        return {
            ...loc,
            totalItems: stocks.reduce((sum, s) => sum + s.quantity, 0),
            productCount: stocks.length,
        };
    });

    const locationStock = allStock
        .filter((s) => s.locationId === selectedLocation)
        .map((s) => {
            const prod = products.find((p) => p.id === s.productId);
            return { ...s, productName: prod?.name || 'Removido', productSku: prod?.sku || '-' };
        });

    async function handleDelete() {
        await handleDeleteBase();
        setSelectedLocation(null);
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
