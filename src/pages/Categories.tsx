import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { db } from '../database/db';
import type { Category } from '../database/types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';

const COLORS = ['#6c5ce7', '#00c9a7', '#ffc53d', '#ff6b6b', '#4ea8de', '#a78bfa', '#f97316', '#ec4899'];

export function Categories() {
    const [categories, setCategories] = useState<(Category & { productCount: number })[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

    const loadData = useCallback(async () => {
        const cats = await db.categories.toArray();
        const enriched = await Promise.all(
            cats.map(async (c) => {
                const count = await db.products.where('categoryId').equals(c.id!).count();
                return { ...c, productCount: count };
            })
        );
        setCategories(enriched);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    function openNew() {
        setEditing(null);
        setForm({ name: '', description: '', color: COLORS[Math.floor(Math.random() * COLORS.length)] });
        setModalOpen(true);
    }

    function openEdit(c: Category) {
        setEditing(c);
        setForm({ name: c.name, description: c.description, color: c.color });
        setModalOpen(true);
    }

    async function handleSave() {
        if (editing?.id) {
            await db.categories.update(editing.id, { ...form });
        } else {
            await db.categories.add({ ...form, createdAt: new Date() } as Category);
        }
        setModalOpen(false);
        loadData();
    }

    async function handleDelete() {
        if (deleteTarget?.id) {
            const count = await db.products.where('categoryId').equals(deleteTarget.id).count();
            if (count > 0) {
                alert(`Não é possível excluir: existem ${count} produto(s) nesta categoria.`);
                setDeleteTarget(null);
                return;
            }
            await db.categories.delete(deleteTarget.id);
        }
        setDeleteTarget(null);
        loadData();
    }

    return (
        <>
            <div className="toolbar">
                <div className="toolbar-left" />
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nova Categoria</button>
                </div>
            </div>

            {categories.length === 0 ? (
                <EmptyState icon={Tags} title="Nenhuma categoria" description="Crie categorias para organizar seus produtos." action={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nova Categoria</button>} />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {categories.map((c) => (
                        <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Tags size={18} style={{ color: c.color }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.name}</div>
                                <div style={{ fontSize: '12px' }} className="text-muted">{c.productCount} produto(s)</div>
                            </div>
                            <div className="table-actions">
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(c)}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <Modal
                    title={editing ? 'Editar Categoria' : 'Nova Categoria'}
                    onClose={() => setModalOpen(false)}
                    footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.name}>Salvar</button></>}
                >
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da categoria" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descrição</label>
                        <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição da categoria" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Cor</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {COLORS.map((color) => (
                                <div key={color} onClick={() => setForm({ ...form, color })} style={{ width: '32px', height: '32px', borderRadius: '8px', background: color, cursor: 'pointer', border: form.color === color ? '3px solid white' : '3px solid transparent', transition: 'border var(--transition-fast)' }} />
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Excluir Categoria"
                    message={`Tem certeza que deseja excluir "${deleteTarget.name}"?`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </>
    );
}
