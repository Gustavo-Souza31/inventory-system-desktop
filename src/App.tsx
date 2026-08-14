import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { isAuthenticated } from './database/auth';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Suppliers } from './pages/Suppliers';
import { Movements } from './pages/Movements';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Locations } from './pages/Locations';
import { Sales } from './pages/Sales';

function App() {
  const [authed, setAuthed] = useState(isAuthenticated());

  useEffect(() => {
    function handleUnauthorized() {
      setAuthed(false);
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
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
