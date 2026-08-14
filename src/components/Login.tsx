import { useState } from 'react';
import { LogIn, UserPlus, AlertCircle, Boxes } from 'lucide-react';
import { login, register } from '../database/auth';
import { seedDatabase } from '../database/seed';

interface Props {
    onSuccess: () => void;
}

export function Login({ onSuccess }: Props) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await register(email, password);
                // Conta nova: popula com dados de exemplo, igual o app
                // já fazia localmente antes de existir login.
                await seedDatabase();
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Erro ao autenticar.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: 'var(--bg-primary)', padding: '20px',
        }}>
            <div className="card" style={{ maxWidth: '380px', width: '100%', padding: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                    }}>
                        <Boxes size={28} style={{ color: 'var(--accent)' }} />
                    </div>
                    <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '4px' }}>
                        {mode === 'login' ? 'Entrar' : 'Criar conta'}
                    </h2>
                    <p className="text-muted" style={{ fontSize: '12.5px' }}>
                        Seus dados ficam sincronizados entre desktop e celular.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">E-mail</label>
                        <input
                            required type="email" className="form-input"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="voce@exemplo.com" autoFocus
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Senha</label>
                        <input
                            required type="password" className="form-input"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === 'register' ? 'Pelo menos 6 caracteres' : '••••••••'}
                            minLength={mode === 'register' ? 6 : undefined}
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: 'var(--danger-bg)', color: 'var(--danger)',
                            padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
                            display: 'flex', gap: '8px', alignItems: 'flex-start',
                        }}>
                            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '11px', marginTop: '4px' }}>
                        {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                        {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
                    </button>
                </form>

                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
                    style={{ width: '100%', marginTop: '14px' }}
                >
                    {mode === 'login' ? 'Não tem conta? Criar uma agora' : 'Já tem conta? Entrar'}
                </button>
            </div>
        </div>
    );
}
