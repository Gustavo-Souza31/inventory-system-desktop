// Gera o próximo SKU sequencial (PRD-001, PRD-002, ...) olhando pros SKUs já
// existentes do usuário logado (a lista já vem filtrada por RLS, então a
// sequência é naturalmente por usuário). SKUs fora do padrão são ignorados
// no cálculo, mas não impedem a geração.
export function getNextProductSku(existingSkus: string[]): string {
    let maxNumber = 0;
    for (const sku of existingSkus) {
        const match = sku.match(/^PRD-(\d+)$/);
        if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxNumber) maxNumber = n;
        }
    }
    return `PRD-${String(maxNumber + 1).padStart(3, '0')}`;
}
