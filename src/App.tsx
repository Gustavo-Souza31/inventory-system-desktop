import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Suppliers } from './pages/Suppliers';
import { Movements } from './pages/Movements';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Locations } from './pages/Locations';
import { Sales } from './pages/Sales';
import { DatabaseSetup } from './components/DatabaseSetup';

function App() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error' | 'setup'>('loading');
  const [dbError, setDbError] = useState('');

  useEffect(() => {
    connectDb();
  }, []);

  async function connectDb() {
    if (!(window as any).electronAPI) {
      setDbError("Para usar o banco de dados em rede, você precisa rodar o App no modo Desktop (Electron). Se estiver desenvolvendo, rode: npm run electron:dev");
      setDbStatus('error');
      return;
    }

    const configStr = localStorage.getItem('dbConfig');
    if (!configStr) {
      setDbStatus('setup');
      return;
    }
    try {
      setDbStatus('loading');
      const config = JSON.parse(configStr);
      const res = await (window as any).electronAPI.invoke('db:connect', config);
      if (res.success) {
        setDbStatus('connected');
      } else {
        setDbError(res.error || 'Erro ao conectar');
        setDbStatus('error');
      }
    } catch (e: any) {
      setDbError(e.message || String(e));
      setDbStatus('error');
    }
  }

  if (dbStatus === 'setup' || dbStatus === 'error') {
    return <DatabaseSetup error={dbError} onConnect={connectDb} />;
  }

  if (dbStatus === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Conectando ao banco de dados...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vendas" element={<Sales />} />
        <Route path="/produtos" element={<Products />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/fornecedores" element={<Suppliers />} />
        <Route path="/movimentacoes" element={<Movements />} />
        <Route path="/locais" element={<Locations />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
