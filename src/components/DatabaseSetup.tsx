import { useState } from 'react';
import { Database, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface Props {
    error?: string;
    onConnect: () => void;
}

export function DatabaseSetup({ error, onConnect }: Props) {
    const existingConfig = localStorage.getItem('dbConfig')
        ? JSON.parse(localStorage.getItem('dbConfig')!)
        : { host: 'localhost', port: 5432, user: 'postgres', password: '', database: 'inventory_system' };

    const [config, setConfig] = useState(existingConfig);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

    async function handleConnect(e: React.FormEvent) {
        e.preventDefault();
        setTesting(true);
        setTestResult(null);
        try {
            const res = await (window as any).electronAPI.invoke('db:connect', config);
            if (res.success) {
                localStorage.setItem('dbConfig', JSON.stringify(config));
                setTestResult({ success: true, msg: 'Conexão estabelecida com sucesso!' });
                setTimeout(() => {
                    onConnect();
                }, 1000);
            } else {
                setTestResult({ success: false, msg: res.error || 'Erro ao conectar no banco' });
            }
        } catch (err: any) {
            setTestResult({ success: false, msg: err.message || 'Erro de conexão' });
        } finally {
            setTesting(false);
        }
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: 'var(--bg-primary)', padding: '20px'
        }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                    }}>
                        <Database size={32} style={{ color: 'var(--accent)' }} />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Setup do Banco de Dados</h2>
                    <p className="text-muted" style={{ fontSize: '13px' }}>
                        Para usar o sistema com sincronização, configure sua conexão PostgreSQL.
                    </p>
                </div>

                {error && !testResult && (
                    <div style={{
                        background: 'var(--danger-bg)', color: 'var(--danger)',
                        padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px',
                        display: 'flex', gap: '8px', alignItems: 'flex-start'
                    }}>
                        <AlertCircle size={16} />
                        <div style={{ flex: 1 }}>{error}</div>
                    </div>
                )}

                <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Host</label>
                        <input required className="form-input" value={config.host} onChange={e => setConfig({ ...config, host: e.target.value })} placeholder="localhost ou IP" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Database</label>
                            <input required className="form-input" value={config.database} onChange={e => setConfig({ ...config, database: e.target.value })} placeholder="inventory_system" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Porta</label>
                            <input required type="number" className="form-input" value={config.port} onChange={e => setConfig({ ...config, port: Number(e.target.value) })} placeholder="5432" />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Usuário</label>
                        <input required className="form-input" value={config.user} onChange={e => setConfig({ ...config, user: e.target.value })} placeholder="postgres" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Senha</label>
                        <input type="password" className="form-input" value={config.password} onChange={e => setConfig({ ...config, password: e.target.value })} placeholder="******" />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, marginTop: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={config.ssl}
                                onChange={e => setConfig({ ...config, ssl: e.target.checked })}
                                style={{ width: '16px', height: '16px' }}
                            />
                            <span className="text-muted">Usar SSL (Bancos em Nuvem)</span>
                        </label>
                    </div>

                    {testResult && (
                        <div style={{
                            background: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: testResult.success ? 'var(--success)' : 'var(--danger)',
                            padding: '12px', borderRadius: '8px', fontSize: '13px', marginTop: '8px',
                            display: 'flex', gap: '8px', alignItems: 'center'
                        }}>
                            {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            <div style={{ flex: 1 }}>{testResult.msg}</div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                        disabled={testing || !!testResult?.success}
                    >
                        {testing ? (
                            <><RefreshCw size={16} className="spin" /> Conectando...</>
                        ) : testResult?.success ? (
                            'Redirecionando...'
                        ) : (
                            'Conectar e Iniciar'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
