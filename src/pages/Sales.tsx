import { useState, useEffect, useRef } from 'react';
import {
    ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle, X, Printer, DollarSign, Package,
} from 'lucide-react';
import { db } from '../database/db';
import type { Product, Location } from '../database/types';

interface CartItem {
    product: Product;
    quantity: number;
    discount: number; // 0, 10, or 20
}

function fmt(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Sales() {
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
    const [amountPaid, setAmountPaid] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setProducts(await db.products.toArray());
        setLocations(await db.locations.toArray());
    }

    const filtered = search.length >= 1
        ? products.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 8)
        : [];

    function addToCart(product: Product) {
        setCart((prev) => {
            const existing = prev.find((i) => i.product.id === product.id && i.discount === 0);
            if (existing) {
                if (existing.quantity >= product.quantity) return prev;
                return prev.map((i) =>
                    i.product.id === product.id && i.discount === 0
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            if (product.quantity <= 0) return prev;
            return [...prev, { product, quantity: 1, discount: 0 }];
        });
        setSearch('');
        searchRef.current?.focus();
    }

    function updateQuantity(index: number, delta: number) {
        setCart((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const newQty = item.quantity + delta;
                if (newQty <= 0 || newQty > item.product.quantity) return item;
                return { ...item, quantity: newQty };
            })
        );
    }

    function setItemDiscount(index: number, discount: number) {
        setCart((prev) =>
            prev.map((item, i) => (i === index ? { ...item, discount } : item))
        );
    }

    function removeItem(index: number) {
        setCart((prev) => prev.filter((_, i) => i !== index));
    }

    function getItemTotal(item: CartItem) {
        const unitPrice = item.product.price * (1 - item.discount / 100);
        return unitPrice * item.quantity;
    }

    const cartTotal = cart.reduce((sum, item) => sum + getItemTotal(item), 0);
    const cartOriginalTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const totalDiscount = cartOriginalTotal - cartTotal;
    const paidNum = parseFloat(amountPaid) || 0;
    const change = paidNum - cartTotal;

    async function finalizeSale() {
        if (cart.length === 0) return;

        const saleId = Date.now();
        const now = new Date();

        for (const item of cart) {
            // Create a movement (saida) for each item
            await db.movements.add({
                productId: item.product.id!,
                type: 'saida',
                quantity: item.quantity,
                reason: `Venda #${saleId}`,
                notes: `Pagamento: ${paymentMethod}${item.discount > 0 ? ` | Desconto: ${item.discount}%` : ''}`,
                locationId: selectedLocation,
                date: now,
                createdAt: now,
            });

            // Update product quantity
            await db.products.update(item.product.id!, {
                quantity: item.product.quantity - item.quantity,
                updatedAt: now,
            });

            // Update location stock if applicable
            if (selectedLocation) {
                const stock = await db.productStock
                    .where({ productId: item.product.id!, locationId: selectedLocation })
                    .first();
                if (stock) {
                    await db.productStock.update(stock.id!, {
                        quantity: Math.max(0, stock.quantity - item.quantity),
                    });
                }
            }
        }

        setLastSaleTotal(cartTotal);
        setShowSuccess(true);
        setCart([]);
        setAmountPaid('');
        setSearch('');
        await loadData();
    }

    function handleNewSale() {
        setShowSuccess(false);
        setPaymentMethod('Dinheiro');
        searchRef.current?.focus();
    }

    function printReceipt() {
        window.print();
    }

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', height: 'calc(100vh - 120px)' }}>
                {/* Left: Product Search & Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <div className="search-bar">
                            <Search size={16} />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Buscar produto por nome ou código..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                            {search && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')} style={{ padding: '4px' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        {/* Dropdown results */}
                        {filtered.length > 0 && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                borderRadius: 'var(--border-radius)', boxShadow: '0 8px 32px rgba(0,0,0,.4)',
                                maxHeight: '320px', overflow: 'auto',
                            }}>
                                {filtered.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => addToCart(p)}
                                        disabled={p.quantity <= 0}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                                            color: 'var(--text-primary)', cursor: p.quantity > 0 ? 'pointer' : 'not-allowed',
                                            borderBottom: '1px solid var(--border)', textAlign: 'left',
                                            opacity: p.quantity <= 0 ? 0.4 : 1,
                                            transition: 'background var(--transition-fast)',
                                        }}
                                        onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                                        onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                                    >
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: 'var(--border-radius-sm)',
                                            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <Package size={16} className="text-muted" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 500, fontSize: '13.5px' }} className="truncate">{p.name}</div>
                                            <div style={{ fontSize: '11px', marginTop: '2px' }} className="text-muted">
                                                SKU: {p.sku} • Estoque: {p.quantity} {p.unit}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '14px' }}>{fmt(p.price)}</div>
                                            <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', marginTop: '2px' }}>
                                                <span style={{ color: 'var(--success)' }}>-10%: {fmt(p.price * 0.9)}</span>
                                                <span style={{ color: 'var(--warning)' }}>-20%: {fmt(p.price * 0.8)}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick info cards */}
                    <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'var(--accent-bg)' }}>
                                <ShoppingCart size={18} style={{ color: 'var(--accent)' }} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Itens no Carrinho</span>
                                <span className="stat-value">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'var(--success-bg)' }}>
                                <DollarSign size={18} style={{ color: 'var(--success)' }} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Desconto Total</span>
                                <span className="stat-value" style={{ color: totalDiscount > 0 ? 'var(--success)' : undefined }}>
                                    {totalDiscount > 0 ? `- ${fmt(totalDiscount)}` : fmt(0)}
                                </span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'var(--warning-bg)' }}>
                                <Package size={18} style={{ color: 'var(--warning)' }} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">Produtos Cadastrados</span>
                                <span className="stat-value">{products.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Product grid for quick access */}
                    <div className="card" style={{ flex: 1, overflow: 'auto' }}>
                        <div className="section-title" style={{ marginBottom: '12px' }}>
                            <Package size={16} /> Produtos Disponíveis
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                            {products.filter((p) => p.quantity > 0).map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => addToCart(p)}
                                    style={{
                                        padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                        borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', textAlign: 'left',
                                        color: 'var(--text-primary)', transition: 'all var(--transition-fast)',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--accent)';
                                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                        e.currentTarget.style.background = 'var(--bg-secondary)';
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }} className="truncate">{p.name}</div>
                                    <div style={{ fontSize: '11px', marginBottom: '6px' }} className="text-muted">{p.sku} • {p.quantity} {p.unit}</div>
                                    <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(p.price)}</div>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', fontSize: '10.5px' }}>
                                        <span style={{
                                            padding: '2px 6px', borderRadius: '4px',
                                            background: 'rgba(74,222,128,0.1)', color: 'var(--success)',
                                        }}>-10%: {fmt(p.price * 0.9)}</span>
                                        <span style={{
                                            padding: '2px 6px', borderRadius: '4px',
                                            background: 'rgba(251,191,36,0.1)', color: 'var(--warning)',
                                        }}>-20%: {fmt(p.price * 0.8)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Cart */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShoppingCart size={18} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>Carrinho de Venda</span>
                        {cart.length > 0 && (
                            <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>{cart.length} itens</span>
                        )}
                    </div>

                    {/* Location select */}
                    <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                        <select
                            className="form-input"
                            value={selectedLocation ?? ''}
                            onChange={(e) => setSelectedLocation(e.target.value ? Number(e.target.value) : null)}
                            style={{ fontSize: '12.5px', padding: '8px 10px' }}
                        >
                            <option value="">Local de venda (opcional)</option>
                            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>

                    {/* Cart Items */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {cart.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 20px', textAlign: 'center' }}>
                                <ShoppingCart size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.3 }} />
                                <p style={{ fontWeight: 500, marginBottom: '4px' }} className="text-muted">Carrinho vazio</p>
                                <p style={{ fontSize: '12px' }} className="text-muted">Busque ou clique em um produto para adicionar.</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => {
                                const unitFinal = item.product.price * (1 - item.discount / 100);
                                return (
                                    <div key={`${item.product.id}-${idx}`} style={{
                                        padding: '12px 20px', borderBottom: '1px solid var(--border)',
                                        animation: 'fadeIn 200ms ease',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '13px' }} className="truncate">{item.product.name}</div>
                                                <div style={{ fontSize: '11px' }} className="text-muted">
                                                    {item.discount > 0 ? (
                                                        <>
                                                            <span style={{ textDecoration: 'line-through' }}>{fmt(item.product.price)}</span>
                                                            {' → '}
                                                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(unitFinal)}</span>
                                                        </>
                                                    ) : (
                                                        <span>{fmt(item.product.price)} / unidade</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={() => removeItem(idx)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--danger)' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Discount buttons */}
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                                            {[0, 10, 20].map((d) => (
                                                <button
                                                    key={d}
                                                    className={`btn btn-sm ${item.discount === d ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => setItemDiscount(idx, d)}
                                                    style={{ fontSize: '11px', padding: '3px 8px' }}
                                                >
                                                    {d === 0 ? 'Sem desc.' : `-${d}%`}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Qty and total */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(idx, -1)} style={{ padding: '4px 6px' }}>
                                                    <Minus size={13} />
                                                </button>
                                                <span style={{ fontWeight: 700, fontSize: '14px', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                                <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(idx, 1)} style={{ padding: '4px 6px' }}>
                                                    <Plus size={13} />
                                                </button>
                                                <span style={{ fontSize: '11px' }} className="text-muted">/ {item.product.quantity} disp.</span>
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent)' }}>{fmt(getItemTotal(item))}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Payment section */}
                    {cart.length > 0 && (
                        <div style={{ borderTop: '2px solid var(--accent)', padding: '16px 20px' }}>
                            {totalDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                                    <span className="text-muted">Subtotal:</span>
                                    <span style={{ textDecoration: 'line-through' }} className="text-muted">{fmt(cartOriginalTotal)}</span>
                                </div>
                            )}
                            {totalDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                                    <span className="text-success">Desconto:</span>
                                    <span className="text-success">- {fmt(totalDiscount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '20px', fontWeight: 800 }}>
                                <span>Total:</span>
                                <span style={{ color: 'var(--accent)' }}>{fmt(cartTotal)}</span>
                            </div>

                            {/* Payment method */}
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block' }} className="text-muted">Forma de Pagamento</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {['Dinheiro', 'Cartão', 'PIX'].map((m) => (
                                        <button
                                            key={m}
                                            className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => setPaymentMethod(m)}
                                            style={{ flex: 1, fontSize: '12px' }}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cash amount */}
                            {paymentMethod === 'Dinheiro' && (
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block' }} className="text-muted">Valor Pago</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="R$ 0,00"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        style={{ fontSize: '14px', padding: '8px 10px' }}
                                    />
                                    {paidNum > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
                                            <span>Troco:</span>
                                            <span style={{ fontWeight: 700, color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                {fmt(Math.max(0, change))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                className="btn btn-primary"
                                onClick={finalizeSale}
                                disabled={cart.length === 0 || (paymentMethod === 'Dinheiro' && paidNum > 0 && paidNum < cartTotal)}
                                style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 700 }}
                            >
                                <CheckCircle size={18} /> Finalizar Venda
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="modal-overlay" onClick={handleNewSale}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ padding: '32px 24px' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px',
                                background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CheckCircle size={32} style={{ color: 'var(--success)' }} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Venda Finalizada!</h3>
                            <p style={{ fontSize: '13px', marginBottom: '16px' }} className="text-muted">
                                O estoque foi atualizado automaticamente.
                            </p>
                            <div style={{
                                fontSize: '28px', fontWeight: 800, color: 'var(--accent)',
                                padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)',
                                marginBottom: '20px',
                            }}>
                                {fmt(lastSaleTotal)}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-secondary" onClick={printReceipt} style={{ flex: 1 }}>
                                    <Printer size={16} /> Imprimir
                                </button>
                                <button className="btn btn-primary" onClick={handleNewSale} style={{ flex: 1 }}>
                                    <Plus size={16} /> Nova Venda
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
