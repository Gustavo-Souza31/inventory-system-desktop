import { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
    ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle, X, Printer, DollarSign, Package, History, Eye, User, UserPlus,
} from 'lucide-react';
import { getAll, getById, findWhere, insert, updateById } from '../database/sql-wrapper';
import type { Product, Location, ProductStock, Movement, Settings } from '../database/types';
import { getCustomerBalances, registerFiado, type CustomerBalance } from '../utils/customerBalance';
import { formatPhoneBR } from '../utils/phone';
import { translateDbError } from '../utils/dbErrors';
import { Receipt, type ReceiptData, type ReceiptItem } from '../components/Receipt';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';

interface CartItem {
    product: Product;
    quantity: number;
    discount: number; // 0, 10, or 20
}

interface StoredSale {
    saleId: string;
    date: Date;
    items: ReceiptItem[];
    itemsSummary: string;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    amountPaid?: number;
    change?: number;
}

function fmt(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(date: Date | string) {
    return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function parseSaleNotes(notes: string | null | undefined, fallbackUnitPrice: number) {
    const raw = notes || '';
    const paymentMatch = raw.match(/Pagamento:\s*([^|]+)/);
    const discountMatch = raw.match(/Desconto:\s*(\d+(?:\.\d+)?)%/);
    const priceMatch = raw.match(/Preço:\s*(\d+(?:\.\d+)?)/);
    const paidMatch = raw.match(/Pago:\s*(\d+(?:\.\d+)?)/);

    return {
        paymentMethod: paymentMatch ? paymentMatch[1].trim() : 'Dinheiro',
        discountPercent: discountMatch ? Number(discountMatch[1]) : 0,
        unitPrice: priceMatch ? Number(priceMatch[1]) : fallbackUnitPrice,
        amountPaid: paidMatch ? Number(paidMatch[1]) : undefined,
    };
}

function buildSalesHistory(movements: Movement[], products: Product[]): StoredSale[] {
    const productById = new Map<number, Product>();
    for (const p of products) {
        if (p.id !== undefined) productById.set(p.id, p);
    }

    const grouped = new Map<string, Movement[]>();
    for (const m of movements) {
        if (m.type !== 'saida') continue;
        const match = m.reason?.match(/^Venda #(.+)$/);
        if (!match) continue;
        const saleId = match[1].trim();
        const existing = grouped.get(saleId);
        if (existing) {
            existing.push(m);
        } else {
            grouped.set(saleId, [m]);
        }
    }

    const sales: StoredSale[] = [];
    for (const [saleId, saleMovements] of grouped.entries()) {
        let paymentMethod = 'Dinheiro';
        let amountPaid: number | undefined;
        let subtotal = 0;
        let total = 0;

        const items: ReceiptItem[] = saleMovements.map((m) => {
            const product = productById.get(m.productId);
            const parsed = parseSaleNotes(m.notes, product?.price ?? 0);
            paymentMethod = parsed.paymentMethod;
            if (parsed.amountPaid !== undefined) {
                amountPaid = parsed.amountPaid;
            }
            const lineOriginal = parsed.unitPrice * m.quantity;
            const lineSubtotal = parsed.unitPrice * (1 - parsed.discountPercent / 100) * m.quantity;
            subtotal += lineOriginal;
            total += lineSubtotal;

            return {
                name: product?.name || 'Produto removido',
                quantity: m.quantity,
                unitPrice: parsed.unitPrice,
                discountPercent: parsed.discountPercent,
                subtotal: lineSubtotal,
            };
        });

        const discount = Math.max(0, subtotal - total);
        const change = amountPaid !== undefined ? Math.max(0, amountPaid - total) : undefined;

        sales.push({
            saleId,
            date: new Date(saleMovements[0].date),
            items,
            itemsSummary: items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
            subtotal,
            discount,
            total,
            paymentMethod,
            amountPaid,
            change,
        });
    }

    return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function Sales() {
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [companySettings, setCompanySettings] = useState<Settings | null>(null);
    const [customerBalances, setCustomerBalances] = useState<CustomerBalance[]>([]);
    const [customersLoadError, setCustomersLoadError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
    const [search, setSearch] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);
    const [lastSaleFiado, setLastSaleFiado] = useState<{ customerName: string; balance: number } | null>(null);
    const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
    const [previewReceipt, setPreviewReceipt] = useState<ReceiptData | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
    const [amountPaid, setAmountPaid] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', notes: '' });
    const [newCustomerError, setNewCustomerError] = useState<string | null>(null);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [saleError, setSaleError] = useState<string | null>(null);
    const [finalizing, setFinalizing] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const [prods, locs, movs, settingsList, balancesResult] = await Promise.all([
            getAll<Product>('products'),
            getAll<Location>('locations'),
            getAll<Movement>('movements'),
            getAll<Settings>('settings'),
            getCustomerBalances()
                .then((data) => ({ ok: true as const, data }))
                .catch((err: unknown) => ({ ok: false as const, err })),
        ]);
        setProducts(prods);
        setLocations(locs);
        setMovements(movs);
        setCompanySettings(settingsList[0] ?? null);

        if (balancesResult.ok) {
            setCustomerBalances(
                [...balancesResult.data].sort((a, b) => a.customer.name.localeCompare(b.customer.name, 'pt-BR'))
            );
            setCustomersLoadError(null);
        } else {
            console.error('Erro ao carregar clientes:', balancesResult.err);
            setCustomerBalances([]);
            setCustomersLoadError(
                balancesResult.err instanceof Error
                    ? translateDbError(balancesResult.err.message)
                    : 'Não foi possível carregar a lista de clientes.'
            );
        }
    }

    const salesHistory = useMemo(
        () => buildSalesHistory(movements, products),
        [movements, products]
    );

    const filteredSales = useMemo(() => {
        const q = historySearch.trim().toLowerCase();
        if (!q) return salesHistory;
        return salesHistory.filter((s) =>
            s.saleId.toLowerCase().includes(q) ||
            s.paymentMethod.toLowerCase().includes(q) ||
            s.items.some((i) => i.name.toLowerCase().includes(q))
        );
    }, [salesHistory, historySearch]);

    const filtered = search.length >= 1
        ? products.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 8)
        : [];

    function addToCart(product: Product) {
        setSaleError(null);
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

    const selectedCustomerEntry = selectedCustomerId !== null
        ? customerBalances.find((c) => c.customer.id === selectedCustomerId) ?? null
        : null;

    const customerSearchLower = customerSearch.trim().toLowerCase();
    const customerSearchDigits = customerSearch.replace(/\D/g, '');
    const filteredCustomers = customerBalances.filter(({ customer }) => {
        if (!customerSearchLower) return true;
        const matchesName = customer.name.toLowerCase().includes(customerSearchLower);
        const matchesPhone = (customer.phone ?? '').toLowerCase().includes(customerSearchLower);
        const matchesDigits = customerSearchDigits.length > 0
            && (customer.phone ?? '').replace(/\D/g, '').includes(customerSearchDigits);
        return matchesName || matchesPhone || matchesDigits;
    });

    function openNewCustomerModal() {
        const trimmed = customerSearch.trim();
        const initialName = /\d/.test(trimmed) ? '' : trimmed;
        setNewCustomerForm({ name: initialName, phone: '', notes: '' });
        setNewCustomerError(null);
        setNewCustomerModalOpen(true);
    }

    async function handleCreateCustomer() {
        if (!newCustomerForm.name.trim()) {
            setNewCustomerError('Nome é obrigatório.');
            return;
        }
        setSavingCustomer(true);
        setNewCustomerError(null);
        try {
            const newId = await insert('customers', {
                name: newCustomerForm.name.trim(),
                phone: newCustomerForm.phone.trim(),
                notes: newCustomerForm.notes.trim(),
                createdAt: new Date(),
            });
            const updatedBalances = await getCustomerBalances();
            setCustomerBalances(
                [...updatedBalances].sort((a, b) => a.customer.name.localeCompare(b.customer.name, 'pt-BR'))
            );
            setCustomersLoadError(null);
            setSelectedCustomerId(newId);
            setCustomerSearch('');
            setSaleError(null);
            setNewCustomerModalOpen(false);
        } catch (err) {
            setNewCustomerError(err instanceof Error ? translateDbError(err.message) : 'Erro ao cadastrar cliente.');
        } finally {
            setSavingCustomer(false);
        }
    }

    function toReceiptData(sale: StoredSale): ReceiptData {
        return {
            saleId: sale.saleId,
            companyName: companySettings?.companyName,
            cnpj: companySettings?.cnpj,
            date: sale.date,
            items: sale.items,
            subtotal: sale.subtotal,
            discount: sale.discount,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
            amountPaid: sale.amountPaid,
            change: sale.change,
        };
    }

    async function finalizeSale() {
        if (cart.length === 0) return;

        if (paymentMethod === 'Fiado') {
            if (selectedCustomerId === null) {
                setSaleError('Selecione o cliente para vender fiado.');
                return;
            }
            if (Math.round(cartTotal * 100) <= 0) {
                setSaleError('O valor da venda fiado deve ser maior que zero.');
                return;
            }
        }

        setSaleError(null);
        setFinalizing(true);
        try {
            // Fase 1 — validação prévia: soma a quantidade pedida por produto
            // (o carrinho pode ter duas linhas do mesmo produto com descontos
            // diferentes) e compara com a quantidade atual e fresca de cada
            // um (não o snapshot que ficou salvo no carrinho, que pode estar
            // desatualizado). Nada é gravado se qualquer produto não tiver
            // estoque suficiente para o total pedido.
            const requestedByProduct = new Map<number, number>();
            for (const item of cart) {
                const id = item.product.id!;
                requestedByProduct.set(id, (requestedByProduct.get(id) || 0) + item.quantity);
            }

            const freshProducts = await Promise.all(
                [...requestedByProduct.keys()].map((id) => getById<Product>('products', id))
            );
            const freshById = new Map<number, Product>();
            for (const p of freshProducts) {
                if (p) freshById.set(p.id!, p);
            }

            for (const [productId, requested] of requestedByProduct) {
                const fresh = freshById.get(productId);
                if (!fresh) {
                    setSaleError('Um dos produtos do carrinho não foi encontrado. Atualize a página e tente novamente.');
                    return;
                }
                if (requested > fresh.quantity) {
                    setSaleError(
                        `Estoque insuficiente para "${fresh.name}". Disponível: ${fresh.quantity} ${fresh.unit}, solicitado: ${requested} ${fresh.unit}.`
                    );
                    return;
                }
            }

            // Fase 2 — commit: só chega aqui se todos os produtos passaram
            // na validação acima.
            const saleId = Date.now();
            const now = new Date();

            for (const item of cart) {
                // Create a movement (saida) for each item
                const noteParts = [`Pagamento: ${paymentMethod}`];
                if (item.discount > 0) noteParts.push(`Desconto: ${item.discount}%`);
                noteParts.push(`Preço: ${item.product.price.toFixed(2)}`);
                if (paymentMethod === 'Dinheiro' && paidNum > 0) {
                    noteParts.push(`Pago: ${paidNum.toFixed(2)}`);
                }

                await insert('movements', {
                    productId: item.product.id!,
                    type: 'saida',
                    quantity: item.quantity,
                    reason: `Venda #${saleId}`,
                    notes: noteParts.join(' | '),
                    locationId: selectedLocation,
                    date: now,
                    createdAt: now,
                });

                // Update product quantity — usa o valor fresco (com os
                // decrementos já aplicados por linhas anteriores do mesmo
                // produto), não o snapshot antigo do carrinho.
                const currentFresh = freshById.get(item.product.id!)!;
                const updatedQty = currentFresh.quantity - item.quantity;
                freshById.set(item.product.id!, { ...currentFresh, quantity: updatedQty });
                await updateById('products', item.product.id!, {
                    quantity: updatedQty,
                    updatedAt: now,
                });

                // Update location stock if applicable
                if (selectedLocation) {
                    const [stock] = await findWhere<ProductStock>('productStock', {
                        productId: item.product.id!,
                        locationId: selectedLocation,
                    });
                    if (stock) {
                        await updateById('productStock', stock.id!, {
                            quantity: Math.max(0, stock.quantity - item.quantity),
                        });
                    }
                }
            }

            window.dispatchEvent(new Event('empacota:stock-changed'));

            const saleTotal = Math.round(cartTotal * 100) / 100;
            let fiadoInfo: { customerName: string; balance: number } | null = null;
            if (paymentMethod === 'Fiado') {
                const itemsSummary = cart.map((i) => `${i.quantity}x ${i.product.name}`).join(', ');
                const resumo = `Venda #${saleId}: ${itemsSummary}`;
                try {
                    const entryResult = await registerFiado(selectedCustomerId, saleTotal, resumo);
                    fiadoInfo = {
                        customerName: selectedCustomerEntry?.customer.name ?? 'Cliente',
                        balance: entryResult.balance,
                    };
                } catch (fiadoErr) {
                    console.error('Erro ao lançar fiado após baixa de estoque:', fiadoErr);
                    // Limpa o carrinho e fecha o fluxo de pagamento para impedir clique
                    // repetido que baixaria o estoque em dobro.
                    setCart([]);
                    setAmountPaid('');
                    setSearch('');
                    setSelectedCustomerId(null);
                    setCustomerSearch('');
                    setPaymentMethod('Dinheiro');
                    setSaleError(
                        'A venda foi registrada e o estoque baixou, mas o lançamento do fiado falhou. Lance o valor manualmente em Clientes (se você é caixa, avise o gerente ou o dono para lançar) antes de continuar.'
                    );
                    await loadData().catch(() => {});
                    return;
                }
            }

            const receiptSnapshot: ReceiptData = {
                saleId,
                companyName: companySettings?.companyName,
                cnpj: companySettings?.cnpj,
                date: now,
                items: cart.map((item) => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                    discountPercent: item.discount,
                    subtotal: getItemTotal(item),
                })),
                subtotal: cartOriginalTotal,
                discount: totalDiscount,
                total: saleTotal,
                paymentMethod,
                amountPaid: paymentMethod === 'Dinheiro' && paidNum > 0 ? paidNum : undefined,
                change: paymentMethod === 'Dinheiro' && paidNum > 0 ? Math.max(0, change) : undefined,
            };

            setActiveReceipt(receiptSnapshot);
            setLastSaleTotal(saleTotal);
            setLastSaleFiado(fiadoInfo);
            setShowSuccess(true);
            setCart([]);
            setAmountPaid('');
            setSearch('');
            setSelectedCustomerId(null);
            setCustomerSearch('');
            await loadData();
        } catch (err) {
            console.error('Erro ao finalizar venda:', err);
            const base = err instanceof Error
                ? translateDbError(err.message)
                : 'Erro desconhecido ao finalizar a venda.';
            setSaleError(`${base} A venda pode ter sido parcialmente registrada — confira o histórico de movimentações antes de tentar novamente.`);
        } finally {
            setFinalizing(false);
        }
    }

    function handleNewSale() {
        setShowSuccess(false);
        setPaymentMethod('Dinheiro');
        setSelectedCustomerId(null);
        setCustomerSearch('');
        setLastSaleFiado(null);
        setSaleError(null);
        searchRef.current?.focus();
    }

    function printReceipt(receipt: ReceiptData | null) {
        if (!receipt) return;
        // flushSync garante que o cupom selecionado esteja renderizado no DOM
        // antes de abrir o diálogo de impressão do sistema.
        flushSync(() => {
            setActiveReceipt(receipt);
        });
        window.print();
    }

    return (
        <>
            <div className="no-print">
                {/* Tabs: PDV / Lista de Vendas */}
                <div className="sales-tabs">
                    <button
                        className="btn btn-ghost"
                        onClick={() => setActiveTab('pos')}
                        style={{
                            borderRadius: '8px 8px 0 0',
                            borderBottom: activeTab === 'pos' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === 'pos' ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'pos' ? 600 : 400,
                        }}
                    >
                        <ShoppingCart size={15} /> Ponto de Venda
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setActiveTab('history')}
                        style={{
                            borderRadius: '8px 8px 0 0',
                            borderBottom: activeTab === 'history' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === 'history' ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'history' ? 600 : 400,
                        }}
                    >
                        <History size={15} /> Vendas Realizadas ({salesHistory.length})
                    </button>
                </div>

                {activeTab === 'pos' ? (
                    <div className="sales-layout">
                        {/* Left: Product Search & Selection */}
                        <div className="sales-products-panel">
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
                                        borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-lg)',
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
                            <div className="sales-stats-grid">
                                <div className="stat-card">
                                    <div className="stat-card-icon purple">
                                        <ShoppingCart size={18} />
                                    </div>
                                    <div className="stat-card-info">
                                        <div className="stat-card-label">Itens no Carrinho</div>
                                        <div className="stat-card-value tabular-nums">{cart.reduce((s, i) => s + i.quantity, 0)}</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-icon green">
                                        <DollarSign size={18} />
                                    </div>
                                    <div className="stat-card-info">
                                        <div className="stat-card-label">Desconto Total</div>
                                        <div className="stat-card-value tabular-nums" style={{ color: totalDiscount > 0 ? 'var(--success)' : undefined }}>
                                            {totalDiscount > 0 ? `- ${fmt(totalDiscount)}` : fmt(0)}
                                        </div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-icon yellow">
                                        <Package size={18} />
                                    </div>
                                    <div className="stat-card-info">
                                        <div className="stat-card-label">Produtos Cadastrados</div>
                                        <div className="stat-card-value tabular-nums">{products.length}</div>
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
                                                    background: 'var(--success-bg)', color: 'var(--success)',
                                                }}>-10%: {fmt(p.price * 0.9)}</span>
                                                <span style={{
                                                    padding: '2px 6px', borderRadius: '4px',
                                                    background: 'var(--warning-bg)', color: 'var(--warning)',
                                                }}>-20%: {fmt(p.price * 0.8)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Cart */}
                        <div className="card sales-cart-panel">
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

                            {saleError && (
                                <div style={{
                                    margin: '10px 20px 0',
                                    padding: '10px 12px',
                                    borderRadius: 'var(--border-radius-sm)',
                                    background: 'var(--danger-bg)',
                                    color: 'var(--danger)',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    flexShrink: 0,
                                }}>
                                    <span>⚠️ {saleError}</span>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setSaleError(null)}
                                        aria-label="Fechar aviso"
                                        style={{ padding: '2px', color: 'var(--danger)', flexShrink: 0 }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

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
                                                    <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent)' }}>{fmt(getItemTotal(item))}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Payment section */}
                            {cart.length > 0 && (
                                <div className="sales-payment-section">
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
                                        <span className="tabular-nums" style={{ color: 'var(--accent)' }}>{fmt(cartTotal)}</span>
                                    </div>

                                    {/* Payment method */}
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block' }} className="text-muted">Forma de Pagamento</label>
                                        <div className="sales-payment-methods">
                                            {['Dinheiro', 'Cartão', 'PIX', 'Fiado'].map((m) => (
                                                <button
                                                    key={m}
                                                    className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-ghost'}`}
                                                    onClick={() => {
                                                        setPaymentMethod(m);
                                                        setSaleError(null);
                                                    }}
                                                    style={{ fontSize: '12px', padding: '6px 8px' }}
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
                                                    <span className="tabular-nums" style={{ fontWeight: 700, color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                        {fmt(Math.max(0, change))}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Fiado: seletor de cliente com busca e cadastro rápido */}
                                    {paymentMethod === 'Fiado' && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <label style={{ fontSize: '11px' }} className="text-muted">Cliente *</label>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={openNewCustomerModal}
                                                    style={{ fontSize: '11.5px', padding: '2px 8px', color: 'var(--accent)' }}
                                                >
                                                    <UserPlus size={13} /> Novo cliente
                                                </button>
                                            </div>

                                            {customersLoadError && (
                                                <p style={{ fontSize: '11.5px', color: 'var(--warning)', marginBottom: '6px' }}>
                                                    Não foi possível carregar clientes ({customersLoadError}).
                                                </p>
                                            )}

                                            {selectedCustomerEntry ? (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                                                    padding: '10px 12px', background: 'var(--accent-light)',
                                                    border: '1px solid var(--accent)', borderRadius: 'var(--border-radius-sm)',
                                                }}>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} className="truncate">
                                                            <User size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                            <span className="truncate">{selectedCustomerEntry.customer.name}</span>
                                                        </div>
                                                        <div style={{ fontSize: '11px', marginTop: '2px' }} className="text-muted">
                                                            {selectedCustomerEntry.customer.phone ? `${selectedCustomerEntry.customer.phone} • ` : ''}
                                                            Saldo atual: <strong className="tabular-nums">{fmt(selectedCustomerEntry.balance)}</strong>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => setSelectedCustomerId(null)}
                                                        title="Trocar cliente"
                                                        style={{ padding: '4px 6px' }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div className="search-bar" style={{ maxWidth: 'none' }}>
                                                        <Search size={14} />
                                                        <input
                                                            type="text"
                                                            placeholder="Buscar cliente por nome ou telefone..."
                                                            value={customerSearch}
                                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                                            style={{ fontSize: '12.5px', padding: '7px 10px 7px 32px' }}
                                                        />
                                                    </div>
                                                    <div style={{
                                                        maxHeight: '140px', overflowY: 'auto',
                                                        border: '1px solid var(--border)', borderRadius: 'var(--border-radius-sm)',
                                                        background: 'var(--bg-input)',
                                                    }}>
                                                        {filteredCustomers.length === 0 ? (
                                                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px' }} className="text-muted">
                                                                {customerBalances.length === 0
                                                                    ? 'Nenhum cliente cadastrado.'
                                                                    : 'Nenhum cliente encontrado.'}
                                                            </div>
                                                        ) : (
                                                            filteredCustomers.map(({ customer, balance }) => (
                                                                <button
                                                                    key={customer.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedCustomerId(customer.id!);
                                                                        setSaleError(null);
                                                                    }}
                                                                    style={{
                                                                        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                        gap: '8px', padding: '8px 10px', border: 'none', borderBottom: '1px solid var(--border)',
                                                                        background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                                                                    }}
                                                                >
                                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                                        <div style={{ fontSize: '12.5px', fontWeight: 500 }} className="truncate">{customer.name}</div>
                                                                        {customer.phone && (
                                                                            <div style={{ fontSize: '11px' }} className="text-muted tabular-nums">{customer.phone}</div>
                                                                        )}
                                                                    </div>
                                                                    {balance > 0 && (
                                                                        <span className="badge badge-warning tabular-nums" style={{ fontSize: '10.5px' }}>
                                                                            {fmt(balance)}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        className="btn btn-primary"
                                        onClick={finalizeSale}
                                        disabled={finalizing || cart.length === 0 || (paymentMethod === 'Dinheiro' && paidNum > 0 && paidNum < cartTotal)}
                                        style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 700 }}
                                    >
                                        <CheckCircle size={18} /> {finalizing ? 'Finalizando...' : 'Finalizar Venda'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Sales History & Reprint */
                    <div>
                        <div className="toolbar">
                            <div className="toolbar-left">
                                <SearchBar
                                    value={historySearch}
                                    onChange={setHistorySearch}
                                    placeholder="Buscar por venda, produto ou pagamento..."
                                />
                            </div>
                        </div>

                        {filteredSales.length === 0 ? (
                            <EmptyState
                                icon={History}
                                title="Nenhuma venda registrada"
                                description={historySearch ? 'Tente outros termos de busca.' : 'Finalize uma venda no PDV para visualizar e reimprimir o cupom.'}
                                action={!historySearch ? (
                                    <button className="btn btn-primary" onClick={() => setActiveTab('pos')}>
                                        <ShoppingCart size={16} /> Ir para o PDV
                                    </button>
                                ) : undefined}
                            />
                        ) : (
                            <>
                                {/* Desktop table */}
                                <div className="table-container sales-table-desktop">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Venda</th>
                                                <th>Data / Hora</th>
                                                <th>Itens</th>
                                                <th>Pagamento</th>
                                                <th style={{ textAlign: 'right' }}>Total</th>
                                                <th style={{ textAlign: 'right' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSales.map((sale) => {
                                                const receipt = toReceiptData(sale);
                                                return (
                                                    <tr key={sale.saleId}>
                                                        <td className="font-mono">#{sale.saleId}</td>
                                                        <td className="text-muted">{formatDateTime(sale.date)}</td>
                                                        <td className="truncate" style={{ maxWidth: '280px' }} title={sale.itemsSummary}>
                                                            {sale.itemsSummary}
                                                        </td>
                                                        <td>
                                                            <span className="badge badge-purple">{sale.paymentMethod}</span>
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }} className="tabular-nums">
                                                            {fmt(sale.total)}
                                                        </td>
                                                        <td>
                                                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                                <button
                                                                    className="btn btn-ghost btn-sm"
                                                                    onClick={() => setPreviewReceipt(receipt)}
                                                                    title="Visualizar cupom"
                                                                >
                                                                    <Eye size={14} /> Cupom
                                                                </button>
                                                                <button
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={() => printReceipt(receipt)}
                                                                >
                                                                    <Printer size={14} /> Reimprimir
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile cards (evita rolagem horizontal para alcançar o botão no celular) */}
                                <div className="sales-history-cards">
                                    {filteredSales.map((sale) => {
                                        const receipt = toReceiptData(sale);
                                        return (
                                            <div key={sale.saleId} className="card" style={{ padding: '14px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                                                    <span className="font-mono" style={{ fontWeight: 600 }}>#{sale.saleId}</span>
                                                    <span className="badge badge-purple">{sale.paymentMethod}</span>
                                                </div>
                                                <div style={{ fontSize: '12px', marginBottom: '6px' }} className="text-muted">
                                                    {formatDateTime(sale.date)}
                                                </div>
                                                <div style={{ fontSize: '13px', marginBottom: '10px' }} className="truncate">
                                                    {sale.itemsSummary}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>
                                                        {fmt(sale.total)}
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => setPreviewReceipt(receipt)}
                                                        >
                                                            <Eye size={14} /> Cupom
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => printReceipt(receipt)}
                                                        >
                                                            <Printer size={14} /> Reimprimir
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

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
                                {lastSaleFiado && (
                                    <p style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--warning)' }}>
                                        Fiado registrado para <strong>{lastSaleFiado.customerName}</strong> — Saldo atualizado:{' '}
                                        <strong className="tabular-nums">{fmt(lastSaleFiado.balance)}</strong>
                                    </p>
                                )}
                                <div style={{
                                    fontSize: '28px', fontWeight: 800, color: 'var(--accent)',
                                    padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)',
                                    marginBottom: '20px',
                                }}>
                                    {fmt(lastSaleTotal)}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => printReceipt(activeReceipt)}
                                        style={{ flex: 1, minWidth: '140px' }}
                                    >
                                        <Printer size={16} /> Imprimir cupom
                                    </button>
                                    <button className="btn btn-primary" onClick={handleNewSale} style={{ flex: 1, minWidth: '140px' }}>
                                        <Plus size={16} /> Nova Venda
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de cadastro rápido de cliente */}
                {newCustomerModalOpen && (
                    <Modal
                        title="Novo Cliente"
                        onClose={() => setNewCustomerModalOpen(false)}
                        footer={
                            <>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setNewCustomerModalOpen(false)}
                                    disabled={savingCustomer}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateCustomer}
                                    disabled={savingCustomer}
                                >
                                    {savingCustomer ? 'Salvando...' : 'Salvar'}
                                </button>
                            </>
                        }
                    >
                        <div className="form-group">
                            <label className="form-label">Nome *</label>
                            <input
                                className="form-input"
                                value={newCustomerForm.name}
                                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                                placeholder="Nome completo do cliente"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefone</label>
                            <input
                                className="form-input"
                                value={newCustomerForm.phone}
                                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: formatPhoneBR(e.target.value) })}
                                placeholder="(11) 99999-9999"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Observações</label>
                            <textarea
                                className="form-textarea"
                                value={newCustomerForm.notes}
                                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                                placeholder="Endereço, apelido ou observações"
                            />
                        </div>
                        {newCustomerError && (
                            <div style={{
                                background: 'var(--danger-bg)', color: 'var(--danger)',
                                padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
                            }}>
                                ⚠️ {newCustomerError}
                            </div>
                        )}
                    </Modal>
                )}

                {/* Receipt Preview Modal */}
                {previewReceipt && (
                    <Modal
                        title={`Cupom — Venda #${previewReceipt.saleId}`}
                        onClose={() => setPreviewReceipt(null)}
                        footer={(
                            <>
                                <button className="btn btn-secondary" onClick={() => setPreviewReceipt(null)}>
                                    Fechar
                                </button>
                                <button className="btn btn-primary" onClick={() => printReceipt(previewReceipt)}>
                                    <Printer size={16} /> Imprimir cupom
                                </button>
                            </>
                        )}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Receipt data={previewReceipt} />
                        </div>
                    </Modal>
                )}
            </div>

            {/* Área exclusiva de impressão (visível apenas no @media print) */}
            {activeReceipt && (
                <div className="receipt-print-area">
                    <Receipt data={activeReceipt} />
                </div>
            )}
        </>
    );
}
