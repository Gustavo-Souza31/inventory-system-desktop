import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { findWhere } from '../database/sql-wrapper';
import { useCrud } from '../hooks/useCrud';
import type { Category, Product } from '../database/types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';

const COLORS = ['#6c5ce7', '#00c9a7', '#ffc53d', '#ff6b6b', '#4ea8de', '#a78bfa', '#f97316', '#ec4899'];

type EnrichedCategory = Category & { productCount: number };
type CategoryForm = { name: string; description: string; color: string };

export function Categories() {
    const {
        items: categories, modalOpen, setModalOpen, editing, form, setForm,
        deleteTarget, setDeleteTarget, openNew: openNewBase, openEdit, handleSave, handleDelete,
    } = useCrud<EnrichedCategory, CategoryForm>({
        table: 'categories',
        emptyForm: { name: '', description: '', color: COLORS[0] },
        toForm: (c) => ({ name: c.name, description: c.description, color: c.color }),
        toRecord: (form, isNew) => (isNew ? { ...form, createdAt: new Date() } : { ...form }),
        transform: async (cats) => {
            return Promise.all(
                cats.map(async (c) => {
                    const prods = await findWhere<Product>('products', { categoryId: c.id });
                    return { ...c, productCount: prods.length };
                })
            );
        },
        beforeDelete: async (c) => {
            const prods = await findWhere<Product>('products', { categoryId: c.id });
            if (prods.length > 0) {
                return `Não é possível excluir: existem ${prods.length} produto(s) nesta categoria.`;
            }
            return null;
        },
    });

    function openNew() {
        openNewBase();
        setForm((f) => ({ ...f, color: COLORS[Math.floor(Math.random() * COLORS.length)] }));
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
