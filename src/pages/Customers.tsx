import { useState, useEffect, useCallback } from 'react';
import {
    Plus, Pencil, Trash2, Users, Phone, DollarSign, Wallet, FileText, CheckCircle,
} from 'lucide-react';
import { useCrud } from '../hooks/useCrud';
import type { Customer, CustomerEntry } from '../database/types';
import { getCustomerBalances, getCustomerEntries, registerPayment } from '../utils/customerBalance';
import { formatPhoneBR } from '../utils/phone';
import { translateDbError } from '../utils/dbErrors';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';
import { StatsCard } from '../components/StatsCard';

type CustomerForm = { name: string; phone: string; notes: string };
const emptyForm: CustomerForm = { name: '', phone: '', notes: '' };

function fmt(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDateTime(value: Date | string) {
    return new Date(value).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

export function Customers() {
    const [search, setSearch] = useState('');
    const [onlyDebtors, setOnlyDebtors] = useState(false);
    const [balancesById, setBalancesById] = useState<Record<number, number>>({});
    const [balanceError, setBalanceError] = useState<string | null>(null);

    // Estado do modal de detalhes / histórico / pagamento
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
    const [entries, setEntries] = useState<CustomerEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [entriesError, setEntriesError] = useState<string | null>(null);

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
    const [savingPayment, setSavingPayment] = useState(false);

    const {
        items: customers, modalOpen, setModalOpen, editing, form, setForm,
        deleteTarget, setDeleteTarget, fieldErrors, saveError, openNew, openEdit, handleSave, handleDelete,
    } = useCrud<Customer, CustomerForm>({
        table: 'customers',
        emptyForm,
        toForm: (c) => ({ name: c.name, phone: c.phone ?? '', notes: c.notes ?? '' }),
        toRecord: (f, isNew) => {
            const base = {
                name: f.name.trim(),
                phone: f.phone.trim(),
                notes: f.notes.trim(),
            };
            return isNew ? { ...base, createdAt: new Date() } : base;
        },
        validate: (f) => (!f.name.trim() ? { name: 'Nome é obrigatório.' } : null),
        // A FK customerEntries.customerId tem ON DELETE RESTRICT no banco;
        // checar antes evita erro não tratado ao tentar excluir cliente com histórico.
        beforeDelete: async (customer) => {
            if (!customer.id) return null;
            const customerEntries = await getCustomerEntries(customer.id);
            if (customerEntries.length > 0) {
                return `Não é possível excluir "${customer.name}" porque há ${customerEntries.length} lançamento(s) no histórico desse cliente.`;
            }
            return null;
        },
    });

    const loadBalances = useCallback(async () => {
        try {
            setBalanceError(null);
            const list = await getCustomerBalances();
            const map: Record<number, number> = {};
            for (const item of list) {
                if (item.customer.id !== undefined) {
                    map[item.customer.id] = item.balance;
                }
            }
            setBalancesById(map);
        } catch (err) {
            setBalanceError(err instanceof Error ? translateDbError(err.message) : 'Erro ao carregar saldos.');
        }
    }, []);

    useEffect(() => {
        loadBalances();
    }, [customers, loadBalances]);

    const loadEntries = useCallback(async (customerId: number) => {
        setLoadingEntries(true);
        setEntriesError(null);
        try {
            const list = await getCustomerEntries(customerId);
            setEntries(list);
        } catch (err) {
            setEntriesError(err instanceof Error ? translateDbError(err.message) : 'Erro ao carregar histórico.');
        } finally {
            setLoadingEntries(false);
        }
    }, []);

    function openDetail(customer: Customer) {
        setDetailCustomer(customer);
        setEntries([]);
        setEntriesError(null);
        setPaymentOpen(false);
        setPaymentAmount('');
        setPaymentDescription('');
        setPaymentError(null);
        setPaymentSuccess(null);
        if (customer.id !== undefined) {
            loadEntries(customer.id);
        }
    }

    function closeDetail() {
        setDetailCustomer(null);
        setPaymentOpen(false);
        setPaymentError(null);
        setPaymentSuccess(null);
    }

    function openPaymentForm() {
        setPaymentAmount('');
        setPaymentDescription('');
        setPaymentError(null);
        setPaymentSuccess(null);
        setPaymentOpen(true);
    }

    async function handleRegisterPayment() {
        if (!detailCustomer?.id) return;
        const currentBalance = balancesById[detailCustomer.id] ?? 0;
        const parsed = Number(paymentAmount.trim().replace(',', '.'));

        if (!paymentAmount.trim() || !Number.isFinite(parsed) || parsed <= 0) {
            setPaymentError('Informe um valor maior que zero.');
            return;
        }
        // Comparação em centavos evita rejeições falsas por imprecisão de ponto flutuante.
        if (Math.round(parsed * 100) > Math.round(currentBalance * 100)) {
            setPaymentError(`O pagamento não pode ser maior que o saldo devedor (${fmt(currentBalance)}).`);
            return;
        }

        setSavingPayment(true);
        setPaymentError(null);
        try {
            const roundedAmount = Math.round(parsed * 100) / 100;
            await registerPayment(detailCustomer.id, roundedAmount, paymentDescription.trim());
            await Promise.all([loadBalances(), loadEntries(detailCustomer.id)]);
            setPaymentOpen(false);
            setPaymentAmount('');
            setPaymentDescription('');
            setPaymentSuccess(`Pagamento de ${fmt(roundedAmount)} registrado.`);
        } catch (err) {
            setPaymentError(err instanceof Error ? translateDbError(err.message) : 'Erro ao registrar pagamento.');
        } finally {
            setSavingPayment(false);
        }
    }

    const getBalance = (customer: Customer) => (customer.id !== undefined ? (balancesById[customer.id] ?? 0) : 0);

    const debtorsCount = customers.filter((c) => getBalance(c) > 0).length;
    const totalReceivable = customers.reduce((sum, c) => {
        const bal = getBalance(c);
        return sum + (bal > 0 ? bal : 0);
    }, 0);

    const searchLower = search.trim().toLowerCase();
    const searchDigits = search.replace(/\D/g, '');

    const filtered = [...customers]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .filter((c) => {
            if (onlyDebtors && getBalance(c) <= 0) return false;
            if (!searchLower) return true;
            const matchesName = c.name.toLowerCase().includes(searchLower);
            const matchesPhoneText = (c.phone ?? '').toLowerCase().includes(searchLower);
            const matchesPhoneDigits = searchDigits.length > 0 && (c.phone ?? '').replace(/\D/g, '').includes(searchDigits);
            return matchesName || matchesPhoneText || matchesPhoneDigits;
        });

    const detailBalance = detailCustomer ? getBalance(detailCustomer) : 0;

    return (
        <>
            <div className="stats-grid">
                <StatsCard icon={Users} label="Clientes Cadastrados" value={customers.length} color="purple" />
                <StatsCard icon={Wallet} label="Com Saldo Devedor" value={debtorsCount} color="yellow" />
                <StatsCard icon={DollarSign} label="Total a Receber" value={fmt(totalReceivable)} color={totalReceivable > 0 ? 'red' : 'green'} />
            </div>

            <div className="toolbar">
                <div className="toolbar-left" style={{ flexWrap: 'wrap' }}>
                    <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente ou telefone..." />
                    <button
                        className={`btn ${onlyDebtors ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setOnlyDebtors((prev) => !prev)}
                    >
                        Com saldo devedor ({debtorsCount})
                    </button>
                </div>
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={openNew}>
                        <Plus size={16} /> Novo Cliente
                    </button>
                </div>
            </div>

            {balanceError && (
                <div style={{
                    background: 'var(--danger-bg)', color: 'var(--danger)',
                    padding: '10px 14px', borderRadius: 'var(--border-radius-sm)', fontSize: '13px', marginBottom: '16px',
                }}>
                    ⚠️ {balanceError}
                </div>
            )}

            {filtered.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Nenhum cliente encontrado"
                    description={
                        search || onlyDebtors
                            ? 'Tente ajustar a busca ou o filtro.'
                            : 'Cadastre seus clientes para vender no fiado e controlar recebimentos.'
                    }
                    action={
                        !search && !onlyDebtors ? (
                            <button className="btn btn-primary" onClick={openNew}>
                                <Plus size={16} /> Novo Cliente
                            </button>
                        ) : undefined
                    }
                />
            ) : (
                <>
                    {/* Tabela para desktop e telas médias */}
                    <div className="table-container customers-desktop-table">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Telefone</th>
                                    <th style={{ textAlign: 'right' }}>Saldo Devedor</th>
                                    <th style={{ width: '170px', textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c) => {
                                    const bal = getBalance(c);
                                    return (
                                        <tr
                                            key={c.id}
                                            onClick={() => openDetail(c)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{c.name}</div>
                                                {c.notes && (
                                                    <div className="text-muted truncate" style={{ fontSize: '11.5px', maxWidth: '320px' }}>
                                                        {c.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-muted tabular-nums">{c.phone || '-'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className={`badge tabular-nums ${bal > 0 ? 'badge-warning' : 'badge-success'}`}>
                                                    {fmt(bal)}
                                                </span>
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => openDetail(c)}
                                                        title="Ver histórico e pagamentos"
                                                    >
                                                        <FileText size={14} /> Detalhes
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-icon btn-sm"
                                                        onClick={() => openEdit(c)}
                                                        title="Editar cliente"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-icon btn-sm"
                                                        onClick={() => setDeleteTarget(c)}
                                                        title="Excluir cliente"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Lista em cartões para largura de celular */}
                    <div className="customers-mobile-list">
                        {filtered.map((c) => {
                            const bal = getBalance(c);
                            return (
                                <div
                                    key={c.id}
                                    className="card"
                                    onClick={() => openDetail(c)}
                                    style={{ padding: '14px 16px', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '14.5px' }} className="truncate">{c.name}</div>
                                            <div className="text-muted tabular-nums" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                                <Phone size={12} /> {c.phone || 'Sem telefone'}
                                            </div>
                                        </div>
                                        <span className={`badge tabular-nums ${bal > 0 ? 'badge-warning' : 'badge-success'}`}>
                                            {fmt(bal)}
                                        </span>
                                    </div>
                                    <div
                                        style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button className="btn btn-secondary btn-sm" onClick={() => openDetail(c)} style={{ flex: 1 }}>
                                            <FileText size={14} /> Detalhes
                                        </button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)} title="Editar cliente">
                                            <Pencil size={14} />
                                        </button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(c)} title="Excluir cliente">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Modal de Cadastro / Edição */}
            {modalOpen && (
                <Modal
                    title={editing ? 'Editar Cliente' : 'Novo Cliente'}
                    onClose={() => setModalOpen(false)}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
                        </>
                    }
                >
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input
                            className="form-input"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Nome completo do cliente"
                            autoFocus
                        />
                        {fieldErrors.name && (
                            <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '2px' }}>{fieldErrors.name}</p>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Telefone</label>
                        <input
                            className="form-input"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: formatPhoneBR(e.target.value) })}
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea
                            className="form-textarea"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Endereço, apelido ou observações"
                        />
                    </div>
                    {saveError && (
                        <div style={{
                            background: 'var(--danger-bg)', color: 'var(--danger)',
                            padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
                        }}>
                            ⚠️ {saveError}
                        </div>
                    )}
                </Modal>
            )}

            {/* Modal de Detalhes do Cliente e Histórico */}
            {detailCustomer && (
                <Modal
                    title={detailCustomer.name}
                    className="modal-wide"
                    onClose={closeDetail}
                    footer={
                        <button className="btn btn-secondary" onClick={closeDetail}>Fechar</button>
                    }
                >
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
                        gap: '12px', padding: '14px 16px', background: 'var(--bg-card)',
                        border: '1px solid var(--border)', borderRadius: 'var(--border-radius)',
                    }}>
                        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                            <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>
                                Telefone: <span className="tabular-nums">{detailCustomer.phone || 'Não informado'}</span>
                            </div>
                            {detailCustomer.notes && (
                                <div className="text-muted" style={{ fontSize: '12px', marginBottom: '6px' }}>
                                    {detailCustomer.notes}
                                </div>
                            )}
                            <div style={{ fontSize: '12px' }} className="text-muted">Saldo devedor atual</div>
                            <div
                                className="tabular-nums"
                                style={{
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: detailBalance > 0 ? 'var(--warning)' : 'var(--success)',
                                }}
                            >
                                {fmt(detailBalance)}
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={openPaymentForm}
                            disabled={detailBalance <= 0 || paymentOpen}
                            title={detailBalance <= 0 ? 'Cliente não possui saldo devedor' : 'Registrar recebimento'}
                        >
                            <DollarSign size={16} /> Registrar pagamento
                        </button>
                    </div>

                    {paymentSuccess && (
                        <div style={{
                            background: 'var(--success-bg)', color: 'var(--success)',
                            padding: '10px 12px', borderRadius: 'var(--border-radius-sm)',
                            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <CheckCircle size={16} /> {paymentSuccess}
                        </div>
                    )}

                    {paymentOpen && (
                        <div style={{
                            padding: '16px', background: 'var(--bg-card)',
                            border: '1px solid var(--accent)', borderRadius: 'var(--border-radius)',
                            display: 'flex', flexDirection: 'column', gap: '12px',
                        }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>Registrar pagamento</div>
                            <div className="form-group">
                                <label className="form-label">Valor pago (R$) *</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <input
                                        className="form-input"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={detailBalance}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder={detailBalance.toFixed(2)}
                                        style={{ flex: '1 1 160px' }}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setPaymentAmount(detailBalance.toFixed(2))}
                                    >
                                        Quitar tudo ({fmt(detailBalance)})
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Observação (opcional)</label>
                                <input
                                    className="form-input"
                                    value={paymentDescription}
                                    onChange={(e) => setPaymentDescription(e.target.value)}
                                    placeholder="Ex.: Pagamento em dinheiro, PIX..."
                                />
                            </div>
                            {paymentError && (
                                <p style={{ color: 'var(--danger)', fontSize: '12.5px' }}>⚠️ {paymentError}</p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => { setPaymentOpen(false); setPaymentError(null); }}
                                    disabled={savingPayment}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={handleRegisterPayment}
                                    disabled={savingPayment}
                                >
                                    {savingPayment ? 'Salvando...' : 'Confirmar pagamento'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="section-title" style={{ marginBottom: '10px' }}>
                            Histórico de lançamentos
                        </div>

                        {entriesError && (
                            <div style={{
                                background: 'var(--danger-bg)', color: 'var(--danger)',
                                padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', fontSize: '13px', marginBottom: '10px',
                            }}>
                                ⚠️ {entriesError}
                            </div>
                        )}

                        {loadingEntries ? (
                            <p className="text-muted" style={{ fontSize: '13px', padding: '12px 0' }}>Carregando histórico...</p>
                        ) : entries.length === 0 ? (
                            <div style={{
                                padding: '24px 16px', textAlign: 'center', background: 'var(--bg-card)',
                                border: '1px solid var(--border)', borderRadius: 'var(--border-radius)',
                            }}>
                                <p className="text-muted" style={{ fontSize: '13px' }}>
                                    Nenhum lançamento registrado para este cliente.
                                </p>
                            </div>
                        ) : (
                            <div style={{
                                border: '1px solid var(--border)', borderRadius: 'var(--border-radius)',
                                background: 'var(--bg-card)', overflow: 'hidden',
                            }}>
                                {entries.map((entry) => {
                                    const isFiado = entry.type === 'fiado';
                                    return (
                                        <div key={entry.id} className="list-item" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                                    <span className={`badge ${isFiado ? 'badge-warning' : 'badge-success'}`}>
                                                        {isFiado ? 'Fiado' : 'Pagamento'}
                                                    </span>
                                                    <span className="text-muted" style={{ fontSize: '11.5px' }}>
                                                        {fmtDateTime(entry.createdAt)}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '13px', wordBreak: 'break-word' }}>
                                                    {entry.description || (isFiado ? 'Venda fiado' : 'Pagamento registrado')}
                                                </div>
                                            </div>
                                            <div
                                                className="tabular-nums"
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '14px',
                                                    flexShrink: 0,
                                                    color: isFiado ? 'var(--warning)' : 'var(--success)',
                                                }}
                                            >
                                                {isFiado ? '+' : '-'} {fmt(Number(entry.amount))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Excluir Cliente"
                    message={`Tem certeza que deseja excluir "${deleteTarget.name}"?`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </>
    );
}
