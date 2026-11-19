#!/usr/bin/env bash
# Faz um ping no Supabase para o projeto (plano gratuito) não ser pausado por
# inatividade. Usado pelo workflow keep-alive.yml.
#
# Recebe SUPABASE_URL e SUPABASE_ANON_KEY por variável de ambiente e tolera os
# erros comuns de copiar e colar segredos no GitHub: espaços, quebras de linha,
# aspas, o prefixo "NOME=" do .env e barra no final da URL.
set -uo pipefail

# Limpa um valor colado: tira \r, espaços nas pontas, aspas e o prefixo "ALGO=".
clean() {
    local v="$1"
    v="${v//$'\r'/}"
    v="${v//$'\n'/}"
    v="$(printf '%s' "$v" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    v="$(printf '%s' "$v" | sed -E 's/^[A-Za-z_][A-Za-z0-9_]*=//')"
    v="$(printf '%s' "$v" | sed -E "s/^[\"']+//; s/[\"']+$//")"
    printf '%s' "$v"
}

url="$(clean "${SUPABASE_URL:-}")"
key="$(clean "${SUPABASE_ANON_KEY:-}")"
url="${url%/}"
# Aceita o endereço sem o esquema (ex.: "abc.supabase.co").
[[ -n "$url" && "$url" != http*://* ]] && url="https://$url"

# A chave já limpa pode não bater com a máscara automática do GitHub; mascara de novo.
[ -n "${GITHUB_ACTIONS:-}" ] && [ -n "$key" ] && echo "::add-mask::$key"

fail() { echo "::error::$1"; exit 1; }

[ -n "$url" ] || fail "O segredo SUPABASE_URL está vazio ou não existe. Crie em Settings → Secrets and variables → Actions."
[ -n "$key" ] || fail "O segredo SUPABASE_ANON_KEY está vazio ou não existe. Crie em Settings → Secrets and variables → Actions."
[[ "$url" =~ ^https://[a-z0-9-]+\.supabase\.co$ ]] || fail "SUPABASE_URL não está no formato https://<projeto>.supabase.co (depois da limpeza ficou com ${#url} caracteres, começando por '${url:0:12}')."

echo "Projeto: ${url#https://}"

# Até 3 tentativas: logo depois de reativado, o projeto pode demorar a responder.
for attempt in 1 2 3; do
    code="$(curl -s -o /dev/null -m 30 -w '%{http_code}' \
        "${url}/rest/v1/products?select=id&limit=1" \
        -H "apikey: ${key}" \
        -H "Authorization: Bearer ${key}")"
    rc=$?
    if [ "$rc" -ne 0 ]; then
        echo "Tentativa $attempt: curl falhou (código $rc)."
    else
        echo "Tentativa $attempt: Supabase respondeu HTTP $code"
        case "$code" in
            2??) echo "✅ Supabase respondeu normalmente, projeto continua ativo."; exit 0 ;;
            401|403) fail "Supabase recusou a chave (HTTP $code). Confira o segredo SUPABASE_ANON_KEY." ;;
            404) fail "Tabela products não encontrada (HTTP 404). Confira se SUPABASE_URL aponta para o projeto certo." ;;
        esac
    fi
    [ "$attempt" -lt 3 ] && sleep 20
done

fail "Supabase não respondeu depois de 3 tentativas. O projeto pode estar pausado: confira no painel do Supabase."
