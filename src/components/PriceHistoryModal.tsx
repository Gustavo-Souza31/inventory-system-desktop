import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { db } from '../database/db';
import type { PriceHistory } from '../database/types';
import { Modal } from './Modal';

interface PriceHistoryModalProps {
    productId: number;
    productName: string;
    onClose: () => void;
}

export function PriceHistoryModal({ productId, productName, onClose }: PriceHistoryModalProps) {
    const [history, setHistory] = useState<PriceHistory[]>([]);

    useEffect(() => {
        db.priceHistory
            .where('productId')
            .equals(productId)
            .reverse()
            .sortBy('changedAt')
            .then(setHistory);
    }, [productId]);

    function formatCurrency(val: number) {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }

    function getPriceIcon(oldPrice: number, newPrice: number) {
        if (newPrice > oldPrice) return <TrendingUp size={14} className="text-danger" />;
        if (newPrice < oldPrice) return <TrendingDown size={14} className="text-success" />;
        return <Minus size={14} className="text-muted" />;
    }

    return (
        <Modal title={`Histórico de Preços — ${productName}`} onClose={onClose}>
            {history.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
                    Nenhuma alteração de preço registrada.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {history.map((h) => (
                        <div key={h.id} className="list-item" style={{ gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                    {getPriceIcon(h.oldPrice, h.newPrice)}
                                    <span style={{ fontSize: '13px' }}>
                                        <strong>Venda:</strong>{' '}
                                        <span className="text-muted" style={{ textDecoration: 'line-through' }}>{formatCurrency(h.oldPrice)}</span>
                                        {' → '}
                                        <span style={{ fontWeight: 600 }}>{formatCurrency(h.newPrice)}</span>
                                    </span>
                                </div>
                                {(h.oldCostPrice !== h.newCostPrice) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {getPriceIcon(h.oldCostPrice, h.newCostPrice)}
                                        <span style={{ fontSize: '12px' }} className="text-muted">
                                            <strong>Custo:</strong>{' '}
                                            {formatCurrency(h.oldCostPrice)} → {formatCurrency(h.newCostPrice)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '11px', flexShrink: 0 }} className="text-muted">
                                {formatDate(h.changedAt)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
