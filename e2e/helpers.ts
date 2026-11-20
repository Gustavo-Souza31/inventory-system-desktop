import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/** Mensagem padrão dos testes que precisam de uma conta de teste. */
export const MOTIVO_CREDENCIAIS = 'Defina E2E_EMAIL e E2E_PASSWORD no .env';

/**
 * Os testes que criam dados só rodam com uma conta de teste configurada no
 * .env. Sem as variáveis, eles se auto-ignoram (aparecem como "skipped").
 */
export const hasCredentials = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

/**
 * Faz login com E2E_EMAIL/E2E_PASSWORD e espera o menu lateral aparecer.
 * Use uma conta de teste, nunca a conta real.
 */
export async function login(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(MOTIVO_CREDENCIAIS);
  }

  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  // Só existe depois da sessão válida (src/components/Layout.tsx).
  await expect(page.locator('.sidebar')).toBeVisible();

  // Se a conta tiver produto abaixo do mínimo (sobra de execução anterior, por
  // exemplo), o app abre sozinho o aviso de estoque baixo por cima da tela e
  // bloqueia os cliques. Fecha-o se aparecer.
  const aviso = page.locator('.modal').filter({ hasText: 'Produtos com estoque baixo' });
  try {
    await aviso.waitFor({ state: 'visible', timeout: 2000 });
    await aviso.getByRole('button', { name: 'Fechar', exact: true }).click();
    await expect(aviso).toBeHidden();
  } catch {
    // Sem aviso: segue.
  }
}

export interface DadosProduto {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  minStock?: number;
  costPrice?: number;
  unit?: string;
}

/**
 * Sufixo único por execução. Evita colisão de SKU entre execuções e entre
 * testes rodando em paralelo na mesma conta de teste.
 */
export function sufixoUnico() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Filtra a tabela de produtos pelo SKU e devolve a linha encontrada. */
async function buscarLinhaProduto(page: Page, sku: string) {
  await page.goto('/#/produtos');
  await page.getByPlaceholder('Buscar por nome ou SKU...').fill(sku);

  const linha = page.locator('tbody tr').filter({ hasText: sku });
  await expect(linha).toBeVisible();
  return linha;
}

/**
 * Cadastra um produto pela tela de Produtos (mesmo caminho do lojista) e
 * confere que ele aparece na tabela. Devolve os dados usados, para o teste
 * conseguir vender e depois excluir o produto.
 */
export async function createProduct(page: Page, dados: DadosProduto): Promise<DadosProduto> {
  const produto: Required<DadosProduto> = {
    costPrice: 0,
    minStock: 1,
    unit: 'un',
    ...dados,
  };

  await page.goto('/#/produtos');
  await page.getByRole('button', { name: 'Novo Produto' }).first().click();

  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();

  await modal.getByPlaceholder('Nome do produto').fill(produto.name);
  await modal.getByPlaceholder('Ex: PRD-001').fill(produto.sku);

  // Os inputs numéricos do modal não têm label associado; a ordem é:
  // preço de venda, preço de custo, quantidade em estoque, estoque mínimo.
  const numeros = modal.locator('input[type="number"]');
  await numeros.nth(0).fill(String(produto.price));
  await numeros.nth(1).fill(String(produto.costPrice));
  await numeros.nth(2).fill(String(produto.quantity));
  await numeros.nth(3).fill(String(produto.minStock));

  await modal.getByRole('button', { name: 'Salvar' }).click();
  await expect(modal).toBeHidden();

  await buscarLinhaProduto(page, produto.sku);
  return produto;
}

/** Confere a quantidade mostrada na tabela de produtos para o SKU. */
export async function expectProductStock(page: Page, sku: string, quantidade: number, unidade = 'un') {
  const linha = await buscarLinhaProduto(page, sku);
  // Colunas: Produto, SKU, Categoria, Preço, Custo, Quantidade, Status, Ações.
  await expect(linha.locator('td').nth(5)).toHaveText(`${quantidade} ${unidade}`);
}

/**
 * Exclui o produto pela tela de Produtos. As movimentações e o estoque por
 * local ligados a ele caem junto (ON DELETE CASCADE no schema), então isso
 * também limpa os dados criados pela venda.
 */
export async function deleteProduct(page: Page, sku: string) {
  const linha = await buscarLinhaProduto(page, sku);

  await linha.getByTitle('Excluir').click();
  const confirmacao = page.locator('.confirm-dialog');
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', { name: 'Excluir', exact: true }).click();

  await expect(page.locator('tbody tr').filter({ hasText: sku })).toHaveCount(0);
}

/**
 * Apaga um cliente de teste e o histórico dele pela API do Supabase.
 * Pela tela não dá: o schema impede excluir cliente com lançamentos
 * (ON DELETE RESTRICT), de propósito, para ninguém perder o fiado sem querer.
 * Entra com a própria conta de teste, então a RLS garante que só mexe nos dados dela.
 */
async function clienteSupabaseDeTeste() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!url || !anonKey || !email || !password) {
    throw new Error('Limpeza pela API precisa de VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_EMAIL e E2E_PASSWORD');
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw authError;
  return supabase;
}

/**
 * Apaga as contagens de estoque da conta de teste. Excluir o produto já leva os
 * itens da contagem (CASCADE), mas o cabeçalho da contagem fica; esta limpeza o remove.
 * É seguro: a conta de teste só serve para o E2E e a RLS isola o resto.
 */
export async function deleteStockCounts() {
  const supabase = await clienteSupabaseDeTeste();
  const { error } = await supabase.from('stockCounts').delete().gt('id', 0);
  if (error) throw error;
  await supabase.auth.signOut();
}

export async function deleteCustomerByName(nome: string) {
  const supabase = await clienteSupabaseDeTeste();

  const { data: clientes, error } = await supabase.from('customers').select('id').eq('name', nome);
  if (error) throw error;
  for (const { id } of clientes ?? []) {
    const { error: e1 } = await supabase.from('customerEntries').delete().eq('customerId', id);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from('customers').delete().eq('id', id);
    if (e2) throw e2;
  }
  await supabase.auth.signOut();
}
