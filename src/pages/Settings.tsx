import { useState, useEffect, useRef } from 'react';
import { Save, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { getAll, insert, updateById, clearTable } from '../database/sql-wrapper';
import type { Settings as SettingsType } from '../database/types';
import { exportDatabase, importDatabase } from '../utils/backup';

// Todas as tabelas do banco (electron/database.ts), usado só pelo botão
// "Limpar Todos os Dados" abaixo.
const ALL_TABLES = [
    'movements', 'priceHistory', 'productStock', 'products',
    'categories', 'suppliers', 'locations', 'settings',
];

export function Settings() {
    const [settings, setSettings] = useState<SettingsType>({
        companyName: '',
        cnpj: '',
        lowStockThreshold: 10,
    });
    const [saved, setSaved] = useState(false);
    const [importMsg, setImportMsg] = useState<{ success: boolean; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function load() {
            const [s] = await getAll<SettingsType & { id: number }>('settings');
            if (s) setSettings(s);
        }
        load();
    }, []);

    async function handleSave() {
        const [existing] = await getAll<SettingsType & { id: number }>('settings');
        if (existing?.id) {
            await updateById('settings', existing.id, {
                companyName: settings.companyName,
                cnpj: settings.cnpj,
                lowStockThreshold: settings.lowStockThreshold,
            });
        } else {
            await insert('settings', settings);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!window.confirm('⚠️ Isto irá substituir TODOS os dados atuais. Deseja continuar?')) {
            e.target.value = '';
            return;
        }
        const result = await importDatabase(file);
        setImportMsg(result);
        e.target.value = '';
        if (result.success) {
            const [s] = await getAll<SettingsType & { id: number }>('settings');
            if (s) setSettings(s);
        }
        setTimeout(() => setImportMsg(null), 5000);
    }

    return (
        <div style={{ maxWidth: '600px' }}>
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>Dados da Empresa</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label">Nome da Empresa</label>
                        <input className="form-input" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} placeholder="Nome da sua empresa" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">CNPJ</label>
                        <input className="form-input" value={settings.cnpj} onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>Estoque</div>
                <div className="form-group">
                    <label className="form-label">Limite padrão de estoque baixo</label>
                    <input className="form-input" type="number" min="1" value={settings.lowStockThreshold} onChange={(e) => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })} />
                    <span style={{ fontSize: '12px' }} className="text-muted">
                        Produtos com quantidade igual ou menor a este valor serão marcados como "estoque baixo".
                    </span>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>
                    <Download size={16} /> Backup e Restauração
                </div>
                <p style={{ fontSize: '13px', marginBottom: '16px' }} className="text-muted">
                    Exporte os dados do sistema como arquivo JSON para backup, ou importe um backup anterior.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={exportDatabase}>
                        <Download size={16} /> Exportar Backup
                    </button>
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} /> Importar Backup
                    </button>
                    <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                </div>
                {importMsg && (
                    <div style={{
                        marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: importMsg.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: importMsg.success ? 'var(--success)' : 'var(--danger)',
                    }}>
                        {importMsg.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {importMsg.message}
                    </div>
                )}
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>Banco de Dados</div>
                <p style={{ fontSize: '13px', marginBottom: '12px' }} className="text-muted">
                    Os dados são salvos localmente no seu computador em um arquivo SQLite.
                </p>
                <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                        if (window.confirm('⚠️ Isto irá apagar TODOS os dados. Tem certeza?')) {
                            for (const table of ALL_TABLES) {
                                await clearTable(table);
                            }
                            window.location.reload();
                        }
                    }}
                >
                    Limpar Todos os Dados
                </button>
            </div>

            <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%' }}>
                <Save size={16} />
                {saved ? '✓ Salvo com sucesso!' : 'Salvar Configurações'}
            </button>
        </div>
    );
}
