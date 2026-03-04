export interface Category {
    id?: number;
    name: string;
    description: string;
    color: string;
    createdAt: Date;
}

export interface Supplier {
    id?: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    createdAt: Date;
}

export interface Product {
    id?: number;
    name: string;
    sku: string;
    description: string;
    categoryId: number;
    supplierId: number | null;
    price: number;
    costPrice: number;
    quantity: number;
    minStock: number;
    unit: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Movement {
    id?: number;
    productId: number;
    type: 'entrada' | 'saida';
    quantity: number;
    reason: string;
    notes: string;
    locationId: number | null;
    date: Date;
    createdAt: Date;
}

export interface Settings {
    id?: number;
    companyName: string;
    cnpj: string;
    lowStockThreshold: number;
}

export interface PriceHistory {
    id?: number;
    productId: number;
    oldPrice: number;
    newPrice: number;
    oldCostPrice: number;
    newCostPrice: number;
    changedAt: Date;
}

export interface Location {
    id?: number;
    name: string;
    address: string;
    description: string;
    createdAt: Date;
}

export interface ProductStock {
    id?: number;
    productId: number;
    locationId: number;
    quantity: number;
}
