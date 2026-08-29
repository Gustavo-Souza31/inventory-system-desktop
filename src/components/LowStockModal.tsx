import { AlertTriangle, Mail, Phone } from 'lucide-react';
import { Modal } from './Modal';
import type { LowStockAlert } from '../utils/lowStock';

interface LowStockModalProps {
    alerts: LowStockAlert[];
    onClose: () => void;
}

export function LowStockModal({ alerts, onClose }: LowStockModalProps) {
    return (
        <Modal
            title="Produtos com estoque baixo"
            onClose={onClose}
            className="modal-wide"
            footer={<button className="btn btn-primary" onClick={onClose}>Fechar</button>}
        >
            {alerts.length === 0 ? (
                <p style={{ fontSize: '13px' }} className="text-muted">Nenhum produto com estoque baixo no momento.</p>
            ) : (
                <>
                    <p style={{ fontSize: '13px' }} className="text-muted">
                        {alerts.length} produto(s) atingiram ou ficaram abaixo do estoque mínimo.
                    </p>
                    <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th style={{ textAlign: 'right' }}>Estoque</th>
                                    <th style={{ textAlign: 'right' }}>Mínimo</th>
                                    <th>Fornecedor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.map(({ product, supplier }) => (
                                    <tr key={product.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{product.name}</div>
                                            <div className="text-muted font-mono" style={{ fontSize: '11.5px' }}>{product.sku}</div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className={`badge ${product.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                                                {product.quantity} {product.unit}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }} className="text-muted tabular-nums">{product.minStock} {product.unit}</td>
                                        <td>
                                            {supplier ? (
                                                <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontWeight: 500 }}>{supplier.name}</span>
                                                    {supplier.phone && (
                                                        <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Phone size={12} /> {supplier.phone}
                                                        </span>
                                                    )}
                                                    {supplier.email && (
                                                        <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Mail size={12} /> {supplier.email}
                                                        </span>
                                                    )}
                                                    {!supplier.phone && !supplier.email && (
                                                        <span className="text-muted">Sem contato cadastrado</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px' }} className="text-muted">
                                                    <AlertTriangle size={12} /> Sem fornecedor cadastrado
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Modal>
    );
}
