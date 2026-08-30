// Traduz erros crus do Postgres/Supabase (constraints violadas) para
// mensagens que fazem sentido pro usuário, já que o app não tratava
// nenhum erro de salvamento antes (falha ficava completamente silenciosa).
export function translateDbError(message: string): string {
    if (message.includes('duplicate key value violates unique constraint')) {
        return 'Já existe um registro com esses dados (confira campos que precisam ser únicos, como o SKU).';
    }
    if (message.includes('violates foreign key constraint')) {
        return 'Categoria ou fornecedor selecionado é inválido. Escolha outro e tente novamente.';
    }
    if (message.includes('violates not-null constraint')) {
        const match = message.match(/column "(\w+)"/);
        return match ? `O campo "${match[1]}" é obrigatório.` : 'Preencha todos os campos obrigatórios.';
    }
    if (message.includes('violates check constraint')) {
        return 'Um dos valores informados é inválido.';
    }
    return message;
}
