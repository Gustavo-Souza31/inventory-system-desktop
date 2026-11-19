import termsOfUse from './termos-de-uso.md?raw';
import privacyPolicy from './politica-de-privacidade.md?raw';

// Versão única dos dois textos. Ao mudar qualquer um deles de forma relevante,
// troque esta versão: ela é gravada no aceite de cada usuário (tabela
// "consents"), e é assim que se sabe quem aceitou qual texto.
// ATENÇÃO: ainda é rascunho, sem revisão jurídica (ver tarefa 003).
export const LEGAL_VERSION = '2026-01-rascunho';

export { termsOfUse, privacyPolicy };
