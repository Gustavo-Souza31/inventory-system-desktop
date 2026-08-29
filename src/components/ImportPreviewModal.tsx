import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import { Modal } from './Modal';
import type { ImportRow } from '../utils/import';

interface ImportPreviewModalProps {
    rows: ImportRow[];
    importing: boolean;
    onCancel: () => void;
    onConfirm: (overwriteDuplicates: boolean) => void;
}

export function ImportPreviewModal({ rows, importing, onCancel, onConfirm }: ImportPreviewModalProps) {
    const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);

    const errorCount = rows.filter((r) => r.errors.length > 0).length;
    const duplicateCount = rows.filter((r) => r.errors.length === 0 && r.isDuplicate).length;
    const newCount = rows.length - errorCount - duplicateCount;

    function rowStatus(row: ImportRow): { label: string; className: string } {
        if (row.errors.length > 0) return { label: row.errors.join(', '), className: 'badge badge-danger' };
        if (row.isDuplicate) return { label: 'SKU já existe', className: 'badge badge-warning' };
        return { label: 'Novo produto', className: 'badge badge-success' };
    }

    return (
        <Modal
            title="Prévia da importação"
            onClose={onCancel}
            className="modal-wide"
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onCancel} disabled={importing}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => onConfirm(overwriteDuplicates)} disabled={importing || newCount + duplicateCount === 0}>
                        {importing ? 'Importando...' : 'Confirmar importação'}
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span className="badge badge-success">{newCount} novo(s)</span>
                <span className="badge badge-warning">{duplicateCount} duplicado(s)</span>
                <span className="badge badge-danger">{errorCount} com erro</span>
            </div>

            {duplicateCount > 0 && (
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Copy size={14} /> SKUs duplicados ({duplicateCount}) — o que fazer?
                    </label>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input type="radio" name="dup-strategy" checked={!overwriteDuplicates} onChange={() => setOverwriteDuplicates(false)} />
                            Pular todos os duplicados
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input type="radio" name="dup-strategy" checked={overwriteDuplicates} onChange={() => setOverwriteDuplicates(true)} />
                            Sobrescrever todos os duplicados
                        </label>
                    </div>
                </div>
            )}

            <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Linha</th>
                            <th>Nome</th>
                            <th>SKU</th>
                            <th>Categoria</th>
                            <th style={{ textAlign: 'right' }}>Preço</th>
                            <th style={{ textAlign: 'right' }}>Qtd</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const status = rowStatus(row);
                            return (
                                <tr key={row.rowNumber}>
                                    <td className="text-muted">{row.rowNumber}</td>
                                    <td>{row.data.name || '-'}</td>
                                    <td><span className="font-mono">{row.data.sku || '-'}</span></td>
                                    <td className="text-muted">{row.data.categoryName || '-'}</td>
                                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                                        {Number.isFinite(row.data.price) ? row.data.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                    </td>
                                    <td style={{ textAlign: 'right' }} className="tabular-nums">{Number.isFinite(row.data.quantity) ? row.data.quantity : '-'}</td>
                                    <td><span className={status.className} title={status.label}>{status.label}</span></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {newCount + duplicateCount === 0 ? (
                <p style={{ color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> Nenhuma linha válida para importar.
                </p>
            ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} /> Linhas com erro serão ignoradas automaticamente.
                </p>
            )}
        </Modal>
    );
}
