// Formata progressivamente enquanto o usuário digita: (11) 91234-5678
// (ou (11) 1234-5678 para telefones fixos, 10 dígitos).
export function formatPhoneBR(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 2) return digits.replace(/^(\d*)$/, '($1');
    if (digits.length <= 6) return digits.replace(/^(\d{2})(\d*)$/, '($1) $2');
    if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d*)$/, '($1) $2-$3');
    return digits.replace(/^(\d{2})(\d{5})(\d*)$/, '($1) $2-$3');
}
