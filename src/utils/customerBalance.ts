import { getAll, rpc } from '../database/sql-wrapper';
import type { Customer, CustomerEntry } from '../database/types';

export interface CustomerBalance {
    customer: Customer;
    balance: number;
}

// Valores monetários vêm do banco como DECIMAL; somar em centavos inteiros
// evita erros de ponto flutuante (0.1 + 0.2) no saldo.
function toCents(value: number): number {
    return Math.round(Number(value) * 100);
}

// Saldo devedor = soma dos fiados menos a soma dos pagamentos.
export function computeBalance(entries: Pick<CustomerEntry, 'type' | 'amount'>[]): number {
    const cents = entries.reduce(
        (sum, e) => sum + (e.type === 'fiado' ? toCents(e.amount) : -toCents(e.amount)),
        0
    );
    return cents / 100;
}

export async function getCustomerEntries(customerId: number): Promise<CustomerEntry[]> {
    const all = await getAll<CustomerEntry>('customerEntries');
    return all
        .filter((e) => e.customerId === customerId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCustomerBalances(): Promise<CustomerBalance[]> {
    const [customers, entries] = await Promise.all([
        getAll<Customer>('customers'),
        getAll<CustomerEntry>('customerEntries'),
    ]);
    const byCustomer = new Map<number, CustomerEntry[]>();
    for (const e of entries) {
        const list = byCustomer.get(e.customerId) ?? [];
        list.push(e);
        byCustomer.set(e.customerId, list);
    }
    return customers.map((customer) => ({
        customer,
        balance: computeBalance(byCustomer.get(customer.id!) ?? []),
    }));
}

export interface EntryResult {
    entryId: number;
    balance: number;
}

// A venda fiado exige cliente: sem ele a função recusa antes de chamar o banco
// (o banco também recusa, mas a mensagem aqui é a que o usuário vê).
export async function registerFiado(
    customerId: number | null,
    amount: number,
    description = ''
): Promise<EntryResult> {
    if (customerId === null) throw new Error('Selecione o cliente para vender fiado.');
    return rpc<EntryResult>('add_customer_entry', {
        p_customer_id: customerId,
        p_type: 'fiado',
        p_amount: amount,
        p_description: description,
    });
}

export async function registerPayment(
    customerId: number,
    amount: number,
    description = ''
): Promise<EntryResult> {
    return rpc<EntryResult>('add_customer_entry', {
        p_customer_id: customerId,
        p_type: 'pagamento',
        p_amount: amount,
        p_description: description,
    });
}
