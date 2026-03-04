import { db } from './db';

export async function seedDatabase() {
    const count = await db.categories.count();
    if (count > 0) return;

    // Categories
    const catIds: number[] = [];
    catIds.push(await db.categories.add({ name: 'Eletrônicos', description: 'Dispositivos e componentes eletrônicos', color: '#6c5ce7', createdAt: new Date() }));
    catIds.push(await db.categories.add({ name: 'Acessórios', description: 'Acessórios diversos para produtos', color: '#00c9a7', createdAt: new Date() }));
    catIds.push(await db.categories.add({ name: 'Cabos', description: 'Cabos e conectores', color: '#ffc53d', createdAt: new Date() }));
    catIds.push(await db.categories.add({ name: 'Periféricos', description: 'Mouse, teclado e outros periféricos', color: '#4ea8de', createdAt: new Date() }));
    catIds.push(await db.categories.add({ name: 'Armazenamento', description: 'HDs, SSDs e pen drives', color: '#ff6b6b', createdAt: new Date() }));

    // Suppliers
    const supIds: number[] = [];
    supIds.push(await db.suppliers.add({ name: 'TechDistribuidora LTDA', email: 'contato@techdist.com.br', phone: '(11) 98765-4321', address: 'Rua das Tecnologias, 100 - São Paulo, SP', notes: 'Fornecedor principal de eletrônicos', createdAt: new Date() }));
    supIds.push(await db.suppliers.add({ name: 'CaboMaster', email: 'vendas@cabomaster.com.br', phone: '(21) 91234-5678', address: 'Av. dos Cabos, 500 - Rio de Janeiro, RJ', notes: 'Especialista em cabos e conectores', createdAt: new Date() }));
    supIds.push(await db.suppliers.add({ name: 'InfoParts Brasil', email: 'compras@infoparts.com.br', phone: '(31) 99876-5432', address: 'Rua da Informática, 250 - Belo Horizonte, MG', notes: '', createdAt: new Date() }));

    // Locations
    const locIds: number[] = [];
    locIds.push(await db.locations.add({ name: 'Depósito Principal', address: 'Rua do Estoque, 100', description: 'Depósito central', createdAt: new Date() }));
    locIds.push(await db.locations.add({ name: 'Loja Centro', address: 'Av. Principal, 500', description: 'Loja física no centro', createdAt: new Date() }));
    locIds.push(await db.locations.add({ name: 'Escritório', address: 'Rua Comercial, 200', description: 'Estoque do escritório', createdAt: new Date() }));

    // Products
    const now = new Date();
    const products = [
        { name: 'Mouse Gamer RGB', sku: 'MOU-001', description: 'Mouse gamer com RGB e 7 botões programáveis', categoryId: catIds[3], supplierId: supIds[0], price: 149.90, costPrice: 85.00, quantity: 45, minStock: 10, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'Teclado Mecânico', sku: 'TEC-001', description: 'Teclado mecânico switch blue, layout ABNT2', categoryId: catIds[3], supplierId: supIds[0], price: 299.90, costPrice: 170.00, quantity: 22, minStock: 5, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'Cabo HDMI 2.1 2m', sku: 'CAB-001', description: 'Cabo HDMI 2.1 de 2 metros, 8K 60Hz', categoryId: catIds[2], supplierId: supIds[1], price: 49.90, costPrice: 22.00, quantity: 120, minStock: 20, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'Cabo USB-C 1m', sku: 'CAB-002', description: 'Cabo USB Type-C 3.1 de 1 metro', categoryId: catIds[2], supplierId: supIds[1], price: 29.90, costPrice: 12.00, quantity: 3, minStock: 30, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'SSD NVMe 1TB', sku: 'ARM-001', description: 'SSD NVMe M.2 1TB, leitura 3500MB/s', categoryId: catIds[4], supplierId: supIds[2], price: 449.90, costPrice: 280.00, quantity: 15, minStock: 5, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'Pen Drive 64GB', sku: 'ARM-002', description: 'Pen Drive USB 3.0 de 64GB', categoryId: catIds[4], supplierId: supIds[2], price: 39.90, costPrice: 18.00, quantity: 8, minStock: 15, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'Webcam Full HD', sku: 'ELE-001', description: 'Webcam 1080p com microfone integrado', categoryId: catIds[0], supplierId: supIds[0], price: 199.90, costPrice: 110.00, quantity: 30, minStock: 8, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'Capa para Notebook 15.6"', sku: 'ACE-001', description: 'Capa protetora acolchoada para notebook', categoryId: catIds[1], supplierId: supIds[2], price: 69.90, costPrice: 30.00, quantity: 55, minStock: 10, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'Headset Bluetooth', sku: 'ELE-002', description: 'Headset sem fio com cancelamento de ruído', categoryId: catIds[0], supplierId: supIds[0], price: 349.90, costPrice: 200.00, quantity: 0, minStock: 5, unit: 'un', createdAt: now, updatedAt: now },
        { name: 'Hub USB 4 Portas', sku: 'ACE-002', description: 'Hub USB 3.0 com 4 portas', categoryId: catIds[1], supplierId: supIds[2], price: 79.90, costPrice: 35.00, quantity: 40, minStock: 10, unit: 'un', createdAt: now, updatedAt: now },
    ];

    const productIds: number[] = [];
    for (const p of products) {
        productIds.push(await db.products.add(p));
    }

    // Product stock distribution across locations
    const stockDistribution = [
        { productId: productIds[0], locationId: locIds[0], quantity: 30 },
        { productId: productIds[0], locationId: locIds[1], quantity: 15 },
        { productId: productIds[1], locationId: locIds[0], quantity: 15 },
        { productId: productIds[1], locationId: locIds[1], quantity: 7 },
        { productId: productIds[2], locationId: locIds[0], quantity: 80 },
        { productId: productIds[2], locationId: locIds[1], quantity: 40 },
        { productId: productIds[3], locationId: locIds[1], quantity: 3 },
        { productId: productIds[4], locationId: locIds[0], quantity: 15 },
        { productId: productIds[5], locationId: locIds[0], quantity: 5 },
        { productId: productIds[5], locationId: locIds[2], quantity: 3 },
        { productId: productIds[6], locationId: locIds[0], quantity: 20 },
        { productId: productIds[6], locationId: locIds[1], quantity: 10 },
        { productId: productIds[7], locationId: locIds[0], quantity: 35 },
        { productId: productIds[7], locationId: locIds[1], quantity: 20 },
        { productId: productIds[9], locationId: locIds[0], quantity: 25 },
        { productId: productIds[9], locationId: locIds[1], quantity: 15 },
    ];
    await db.productStock.bulkAdd(stockDistribution);

    // Movements
    const movements = [
        { productId: productIds[0], type: 'entrada' as const, quantity: 50, reason: 'Compra de fornecedor', notes: 'NF 12345', locationId: locIds[0], date: daysAgo(10), createdAt: daysAgo(10) },
        { productId: productIds[0], type: 'saida' as const, quantity: 5, reason: 'Venda', notes: 'Pedido #001', locationId: locIds[1], date: daysAgo(7), createdAt: daysAgo(7) },
        { productId: productIds[1], type: 'entrada' as const, quantity: 25, reason: 'Compra de fornecedor', notes: 'NF 12346', locationId: locIds[0], date: daysAgo(8), createdAt: daysAgo(8) },
        { productId: productIds[1], type: 'saida' as const, quantity: 3, reason: 'Venda', notes: 'Pedido #002', locationId: locIds[1], date: daysAgo(3), createdAt: daysAgo(3) },
        { productId: productIds[2], type: 'entrada' as const, quantity: 150, reason: 'Compra de fornecedor', notes: 'NF 12347', locationId: locIds[0], date: daysAgo(15), createdAt: daysAgo(15) },
        { productId: productIds[2], type: 'saida' as const, quantity: 30, reason: 'Venda', notes: '', locationId: locIds[1], date: daysAgo(2), createdAt: daysAgo(2) },
        { productId: productIds[4], type: 'entrada' as const, quantity: 20, reason: 'Compra de fornecedor', notes: 'NF 12348', locationId: locIds[0], date: daysAgo(5), createdAt: daysAgo(5) },
        { productId: productIds[4], type: 'saida' as const, quantity: 5, reason: 'Venda', notes: 'Pedido #003', locationId: locIds[0], date: daysAgo(1), createdAt: daysAgo(1) },
        { productId: productIds[8], type: 'saida' as const, quantity: 10, reason: 'Venda', notes: 'Pedido #004', locationId: null, date: daysAgo(4), createdAt: daysAgo(4) },
        { productId: productIds[6], type: 'entrada' as const, quantity: 30, reason: 'Reposição', notes: '', locationId: locIds[0], date: daysAgo(6), createdAt: daysAgo(6) },
    ];
    await db.movements.bulkAdd(movements);

    // Settings
    await db.settings.add({
        companyName: 'Minha Empresa LTDA',
        cnpj: '12.345.678/0001-90',
        lowStockThreshold: 10,
    });

    // Price history seed
    await db.priceHistory.bulkAdd([
        { productId: productIds[0], oldPrice: 129.90, newPrice: 149.90, oldCostPrice: 80.00, newCostPrice: 85.00, changedAt: daysAgo(30) },
        { productId: productIds[4], oldPrice: 399.90, newPrice: 449.90, oldCostPrice: 250.00, newCostPrice: 280.00, changedAt: daysAgo(20) },
        { productId: productIds[8], oldPrice: 299.90, newPrice: 349.90, oldCostPrice: 180.00, newCostPrice: 200.00, changedAt: daysAgo(15) },
    ]);
}

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}
