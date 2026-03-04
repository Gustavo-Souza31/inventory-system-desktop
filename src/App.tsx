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

function App() {
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
