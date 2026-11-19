// TODO: usuário define os contatos reais
export const SUPPORT_EMAIL = 'suporte@exemplo.com';

// TODO: usuário define os contatos reais
export const SUPPORT_WHATSAPP_NUMBER = '5500000000000';

export function getWhatsAppSupportUrl(): string {
    // Remove caracteres não numéricos caso o número seja atualizado com máscara
    const digits = SUPPORT_WHATSAPP_NUMBER.replace(/\D/g, '');
    return `https://wa.me/${digits}`;
}

export function getMailtoSupportUrl(): string {
    return `mailto:${SUPPORT_EMAIL}`;
}
