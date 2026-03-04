import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { db } from '../database/db';
import type { Supplier } from '../database/types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';

const emptyForm = { name: '', email: '', phone: '', address: '', notes: '' };

export function Suppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Supplier | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

    const loadData = useCallback(async () => {
        setSuppliers(await db.suppliers.toArray());
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = suppliers.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    function openNew() {
        setEditing(null);
        setForm({ ...emptyForm });
        setModalOpen(true);
    }

    function openEdit(s: Supplier) {
        setEditing(s);
        setForm({ name: s.name, email: s.email, phone: s.phone, address: s.address, notes: s.notes });
        setModalOpen(true);
    }

    async function handleSave() {
        if (editing?.id) {
            await db.suppliers.update(editing.id, { ...form });
        } else {
            await db.suppliers.add({ ...form, createdAt: new Date() } as Supplier);
        }
        setModalOpen(false);
        loadData();
    }

    async function handleDelete() {
        if (deleteTarget?.id) {
            await db.suppliers.delete(deleteTarget.id);
            // Set supplierId to null on products that used this supplier
            const prods = await db.products.where('supplierId').equals(deleteTarget.id).toArray();
            for (const p of prods) {
                await db.products.update(p.id!, { supplierId: null });
            }
        }
        setDeleteTarget(null);
        loadData();
    }

    return (
        <>
            <div className="toolbar">
                <div className="toolbar-left">
                    <SearchBar value={search} onChange={setSearch} placeholder="Buscar fornecedor..." />
                </div>
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Fornecedor</button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon={Truck} title="Nenhum fornecedor" description={search ? 'Tente outra busca.' : 'Adicione seus fornecedores.'} action={!search ? <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Fornecedor</button> : undefined} />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>E-mail</th>
                                <th>Telefone</th>
                                <th>Endereço</th>
                                <th style={{ width: '100px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                                    <td className="text-muted">{s.email || '-'}</td>
                                    <td className="text-muted">{s.phone || '-'}</td>
                                    <td className="text-muted truncate" style={{ maxWidth: '250px' }} title={s.address}>{s.address || '-'}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(s)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <Modal
                    title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    onClose={() => setModalOpen(false)}
                    footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.name}>Salvar</button></>}
                >
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do fornecedor" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">E-mail</label>
                            <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefone</label>
                            <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Endereço</label>
                        <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Endereço completo" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações sobre o fornecedor" />
                    </div>
                </Modal>
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Excluir Fornecedor"
                    message={`Tem certeza que deseja excluir "${deleteTarget.name}"?`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </>
    );
}
