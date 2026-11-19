export interface ReceiptItem {
    name: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    subtotal: number;
}

export interface ReceiptData {
    saleId?: string | number;
    companyName?: string;
    cnpj?: string;
    date: Date | string;
    items: ReceiptItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    amountPaid?: number;
    change?: number;
}

interface ReceiptProps {
    data: ReceiptData;
}

function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

export function Receipt({ data }: ReceiptProps) {
    const company = data.companyName?.trim() || 'Empacota';
    const cnpj = data.cnpj?.trim();
    const amountPaid = data.amountPaid;
    const hasCashPaid = amountPaid !== undefined && amountPaid > 0;
    const changeAmount = hasCashPaid
        ? Math.max(0, data.change ?? (amountPaid - data.total))
        : Math.max(0, data.change ?? 0);

    return (
        <div className="receipt" role="document" aria-label="Cupom não fiscal">
            <div className="receipt-header">
                <div className="receipt-company">{company}</div>
                {cnpj && <div className="receipt-cnpj">CNPJ: {cnpj}</div>}
                <div className="receipt-non-fiscal">Documento sem valor fiscal</div>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-meta">
                {data.saleId !== undefined && data.saleId !== '' && (
                    <div className="receipt-row">
                        <span>Venda:</span>
                        <span>#{data.saleId}</span>
                    </div>
                )}
                <div className="receipt-row">
                    <span>Data/Hora:</span>
                    <span>{formatDateTime(data.date)}</span>
                </div>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-items">
                <div className="receipt-items-head">
                    <span>Qtd / Item</span>
                    <span>Subtotal</span>
                </div>
                {data.items.map((item, idx) => (
                    <div key={`${item.name}-${idx}`} className="receipt-item">
                        <div className="receipt-item-name">
                            {item.quantity}x {item.name}
                        </div>
                        <div className="receipt-row receipt-item-values">
                            <span>
                                {formatCurrency(item.unitPrice)} un.
                                {item.discountPercent && item.discountPercent > 0
                                    ? ` (-${item.discountPercent}%)`
                                    : ''}
                            </span>
                            <span>{formatCurrency(item.subtotal)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="receipt-divider" />

            <div className="receipt-totals">
                <div className="receipt-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(data.subtotal)}</span>
                </div>
                <div className="receipt-row">
                    <span>Desconto</span>
                    <span>{data.discount > 0 ? `- ${formatCurrency(data.discount)}` : formatCurrency(0)}</span>
                </div>
                <div className="receipt-row receipt-total">
                    <span>Total</span>
                    <span>{formatCurrency(data.total)}</span>
                </div>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-payment">
                <div className="receipt-row">
                    <span>Pagamento</span>
                    <span>{data.paymentMethod}</span>
                </div>
                {hasCashPaid && (
                    <div className="receipt-row">
                        <span>Valor pago</span>
                        <span>{formatCurrency(amountPaid)}</span>
                    </div>
                )}
                {(hasCashPaid || data.paymentMethod === 'Dinheiro') && (
                    <div className="receipt-row">
                        <span>Troco</span>
                        <span>{formatCurrency(changeAmount)}</span>
                    </div>
                )}
            </div>

            <div className="receipt-divider" />

            <div className="receipt-footer">
                <div className="receipt-non-fiscal-footer">Documento sem valor fiscal</div>
                <div>Obrigado pela preferência!</div>
            </div>
        </div>
    );
}
