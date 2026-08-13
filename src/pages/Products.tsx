import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Package, Download, Barcode, History } from 'lucide-react';
import { getAll, insert, updateById } from '../database/sql-wrapper';
import { useCrud } from '../hooks/useCrud';
import type { Product, Category, Supplier } from '../database/types';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';
import { BarcodeLabel } from '../components/BarcodeLabel';
import { PriceHistoryModal } from '../components/PriceHistoryModal';
import { exportToCsv } from '../utils/export';

type ProductForm = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

const emptyProduct: ProductForm = {
    name: '', sku: '', description: '', categoryId: 0, supplierId: null,
    price: 0, costPrice: 0, quantity: 0, minStock: 10, unit: 'un',
};

function validateProduct(p: ProductForm): string[] {
    const errors: string[] = [];
    if (p.price <= 0) errors.push('O preço de venda deve ser maior que zero.');
    if (p.quantity < 0) errors.push('A quantidade em estoque não pode ser negativa.');
    if (p.costPrice < 0) errors.push('O preço de custo não pode ser negativo.');
    return errors;
}

export function Products() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState(0);
    const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
    const [priceHistoryProduct, setPriceHistoryProduct] = useState<Product | null>(null);
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [formWarning, setFormWarning] = useState<string | null>(null);

    const {
        items: products, modalOpen, setModalOpen, editing: editingProduct, form, setForm,
        deleteTarget, setDeleteTarget, openNew: openNewBase, openEdit: openEditBase, handleDelete, loadData,
    } = useCrud<Product, ProductForm>({
        table: 'products',
        emptyForm: emptyProduct,
        toForm: (p) => ({
            name: p.name, sku: p.sku, description: p.description,
            categoryId: p.categoryId, supplierId: p.supplierId,
            price: p.price, costPrice: p.costPrice,
            quantity: p.quantity, minStock: p.minStock, unit: p.unit,
        }),
        // handleSave é totalmente customizado abaixo (validação + histórico
        // de preço), então não usamos toRecord aqui.
        // handleDelete não precisa mais limpar movements/priceHistory/
        // productStock manualmente: todas têm ON DELETE CASCADE em
        // productId (electron/database.ts), o banco já cuida disso.
    });

    useEffect(() => {
        Promise.all([getAll<Category>('categories'), getAll<Supplier>('suppliers')])
            .then(([cats, sups]) => {
                setCategories(cats);
                setSuppliers(sups);
            });
    }, []);

    const filtered = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCategory === 0 || p.categoryId === filterCategory;
        return matchSearch && matchCat;
    });

    function openNew() {
        openNewBase();
        setForm((f) => ({ ...f, categoryId: categories[0]?.id || 0 }));
        setFormErrors([]);
        setFormWarning(null);
    }

    function openEdit(p: Product) {
        openEditBase(p);
        setFormErrors([]);
        setFormWarning(null);
    }

    async function handleSave() {
        const errors = validateProduct(form);
        setFormErrors(errors);
        if (errors.length > 0) return;

        setFormWarning(
            form.costPrice > form.price
                ? 'Atenção: o preço de custo é maior que o preço de venda. O produto será salvo mesmo assim.'
                : null
        );

        const now = new Date();
        if (editingProduct?.id) {
            // Track price changes
            if (editingProduct.price !== form.price || editingProduct.costPrice !== form.costPrice) {
                await insert('priceHistory', {
                    productId: editingProduct.id,
                    oldPrice: editingProduct.price,
                    newPrice: form.price,
                    oldCostPrice: editingProduct.costPrice,
                    newCostPrice: form.costPrice,
                    changedAt: now,
                });
            }
            await updateById('products', editingProduct.id, { ...form, updatedAt: now });
        } else {
            await insert('products', { ...form, createdAt: now, updatedAt: now });
        }
        setModalOpen(false);
        await loadData();
    }

    function handleExportCsv() {
        const headers = ['Nome', 'SKU', 'Categoria', 'Preço', 'Custo', 'Quantidade', 'Mínimo', 'Unidade'];
        const rows = filtered.map((p) => [
            p.name, p.sku, getCategoryName(p.categoryId),
            p.price.toFixed(2), p.costPrice.toFixed(2),
            String(p.quantity), String(p.minStock), p.unit,
        ]);
        exportToCsv('produtos', headers, rows);
    }

    function getStockBadge(p: Product) {
        if (p.quantity === 0) return <span className="badge badge-danger">Sem estoque</span>;
        if (p.quantity <= p.minStock) return <span className="badge badge-warning">Estoque baixo</span>;
        return <span className="badge badge-success">Em estoque</span>;
    }

    function getCategoryName(id: number) {
        return categories.find((c) => c.id === id)?.name || '-';
    }

    function formatCurrency(val: number) {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    return (
        <>
            <div className="toolbar">
                <div className="toolbar-left">
                    <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome ou SKU..." />
                    <select className="form-select" style={{ width: '180px' }} value={filterCategory} onChange={(e) => setFilterCategory(Number(e.target.value))}>
                        <option value={0}>Todas categorias</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="toolbar-right">
                    <button className="btn btn-secondary" onClick={handleExportCsv} title="Exportar CSV"><Download size={16} /> CSV</button>
                    <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Produto</button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon={Package} title="Nenhum produto encontrado" description={search ? 'Tente outra busca.' : 'Adicione seu primeiro produto para começar.'} action={!search ? <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Produto</button> : undefined} />
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>SKU</th>
                                <th>Categoria</th>
                                <th style={{ textAlign: 'right' }}>Preço</th>
                                <th style={{ textAlign: 'right' }}>Custo</th>
                                <th style={{ textAlign: 'right' }}>Quantidade</th>
                                <th>Status</th>
                                <th style={{ width: '140px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="product-thumb"><Package size={16} /></div>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{p.name}</div>
                                                <div style={{ fontSize: '11.5px' }} className="text-muted truncate" title={p.description}>{p.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="font-mono">{p.sku}</span></td>
                                    <td className="text-muted">{getCategoryName(p.categoryId)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(p.price)}</td>
                                    <td style={{ textAlign: 'right' }} className="text-muted">{formatCurrency(p.costPrice)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.quantity} {p.unit}</td>
                                    <td>{getStockBadge(p)}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setBarcodeProduct(p)} title="Etiqueta"><Barcode size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPriceHistoryProduct(p)} title="Histórico de preços"><History size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)} title="Editar"><Pencil size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(p)} title="Excluir"><Trash2 size={14} /></button>
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
                    title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    onClose={() => setModalOpen(false)}
                    footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.name || !form.sku}>Salvar</button></>}
                >
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Nome *</label>
                            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">SKU *</label>
                            <input className="form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex: PRD-001" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descrição</label>
                        <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do produto" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Categoria</label>
                            <select className="form-select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fornecedor</label>
                            <select className="form-select" value={form.supplierId || ''} onChange={(e) => setForm({ ...form, supplierId: e.target.value ? Number(e.target.value) : null })}>
                                <option value="">Nenhum</option>
                                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Preço de venda (R$)</label>
                            <input className="form-input" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Preço de custo (R$)</label>
                            <input className="form-input" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Quantidade em estoque</label>
                            <input className="form-input" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Estoque mínimo</label>
                            <input className="form-input" type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Unidade</label>
                        <select className="form-select" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                            <option value="un">Unidade (un)</option>
                            <option value="kg">Quilograma (kg)</option>
                            <option value="l">Litro (l)</option>
                            <option value="m">Metro (m)</option>
                            <option value="cx">Caixa (cx)</option>
                            <option value="pct">Pacote (pct)</option>
                        </select>
                    </div>
                    {formErrors.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            {formErrors.map((err) => (
                                <p key={err} style={{ color: 'var(--danger)', fontSize: '13px', margin: '4px 0' }}>⚠️ {err}</p>
                            ))}
                        </div>
                    )}
                    {formWarning && (
                        <p style={{ color: 'var(--warning)', fontSize: '13px', marginTop: '8px' }}>⚠️ {formWarning}</p>
                    )}
                </Modal>
            )}

            {deleteTarget && (
                <ConfirmDialog title="Excluir Produto" message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
            )}

            {barcodeProduct && (
                <BarcodeLabel product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />
            )}

            {priceHistoryProduct && (
                <PriceHistoryModal productId={priceHistoryProduct.id!} productName={priceHistoryProduct.name} onClose={() => setPriceHistoryProduct(null)} />
            )}
        </>
    );
}
