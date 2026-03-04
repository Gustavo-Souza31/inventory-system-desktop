import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Excluir', onConfirm, onCancel }: ConfirmDialogProps) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="modal-body">
                    <div className="confirm-dialog-icon danger">
                        <AlertTriangle size={24} />
                    </div>
                    <h3>{title}</h3>
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}
