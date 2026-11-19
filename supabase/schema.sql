-- ============================================================================
-- Schema multiusuário (multi-tenant) do Inventory System Desktop
--
-- Baseado no schema original desenhado no commit 4d2fab6 (FKs ON DELETE
-- RESTRICT/SET NULL/CASCADE conforme cada tela já fazia manualmente, CHECKs
-- de price/costPrice/quantity >= 0), adaptado para Postgres + Supabase Auth:
--   - toda tabela ganha "user_id", preenchido sozinho com auth.uid() no INSERT
--   - Row Level Security (RLS) restringe cada linha ao dono (user_id = auth.uid())
--   - sku deixa de ser único globalmente e passa a ser único por usuário
--     (dois usuários podem, cada um, ter um produto "PRD-001")
--
-- Cole este script inteiro no SQL Editor do painel do Supabase e rode de
-- uma vez. É seguro rodar mais de uma vez (usa IF NOT EXISTS / DROP POLICY
-- IF EXISTS antes de recriar).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "categories" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(50),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_owner" ON "categories";
CREATE POLICY "categories_owner" ON "categories"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- suppliers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_owner" ON "suppliers";
CREATE POLICY "suppliers_owner" ON "suppliers"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- locations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "locations" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locations_owner" ON "locations";
CREATE POLICY "locations_owner" ON "locations"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "products" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "name" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "categoryId" BIGINT REFERENCES "categories"("id") ON DELETE RESTRICT,
    "supplierId" BIGINT REFERENCES "suppliers"("id") ON DELETE SET NULL,
    "price" DECIMAL(10,2) NOT NULL CHECK ("price" >= 0),
    "costPrice" DECIMAL(10,2) NOT NULL CHECK ("costPrice" >= 0),
    "quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("quantity" >= 0),
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("user_id", "sku")
);

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_owner" ON "products";
CREATE POLICY "products_owner" ON "products"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- movements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "movements" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "productId" BIGINT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "type" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "reason" TEXT,
    "notes" TEXT,
    "locationId" BIGINT REFERENCES "locations"("id") ON DELETE SET NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "movements" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movements_owner" ON "movements";
CREATE POLICY "movements_owner" ON "movements"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- priceHistory
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "priceHistory" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "productId" BIGINT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "oldPrice" DECIMAL(10,2) NOT NULL,
    "newPrice" DECIMAL(10,2) NOT NULL,
    "oldCostPrice" DECIMAL(10,2) NOT NULL,
    "newCostPrice" DECIMAL(10,2) NOT NULL,
    "changedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "priceHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "priceHistory_owner" ON "priceHistory";
CREATE POLICY "priceHistory_owner" ON "priceHistory"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- productStock
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "productStock" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "productId" BIGINT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "locationId" BIGINT NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 0 CHECK ("quantity" >= 0),
    UNIQUE ("productId", "locationId")
);

ALTER TABLE "productStock" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "productStock_owner" ON "productStock";
CREATE POLICY "productStock_owner" ON "productStock"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- profiles (dados de cadastro do usuário: nome completo e telefone)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "profiles" (
    "user_id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "fullName" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_owner" ON "profiles";
CREATE POLICY "profiles_owner" ON "profiles"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Preenche "profiles" automaticamente quando um usuário é criado. Necessário
-- porque, com confirmação por e-mail habilitada, signUp() não retorna uma
-- sessão autenticada (auth.uid() seria nulo), então o client não consegue
-- inserir direto em "profiles" por causa do RLS acima. nome/telefone chegam
-- via options.data do signUp() e ficam em auth.users.raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles ("user_id", "fullName", "phone")
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS "on_auth_user_created" ON auth.users;
CREATE TRIGGER "on_auth_user_created"
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- settings (uma linha por usuário)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "settings" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "companyName" VARCHAR(255),
    "cnpj" VARCHAR(50),
    "lowStockThreshold" INTEGER DEFAULT 10,
    UNIQUE ("user_id")
);

ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_owner" ON "settings";
CREATE POLICY "settings_owner" ON "settings"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- restore_backup: restaura um backup JSON completo (o mesmo formato gerado
-- por exportDatabase() em src/utils/backup.ts) dentro de UMA transação
-- atômica.
--
-- Por que via RPC e não múltiplas chamadas do client: o PostgREST não
-- oferece transação multi-tabela pro client. Uma função chamada via
-- supabase.rpc() roda inteira dentro de uma única transação por
-- requisição — se qualquer parte falhar (RAISE EXCEPTION abaixo, ou um
-- erro nativo do Postgres como violação de constraint), TUDO é revertido
-- automaticamente, incluindo os DELETEs já feitos. Não há BEGIN/COMMIT
-- explícito aqui: uma FUNCTION comum do Postgres nem permite controle de
-- transação — a propagação de uma exceção não tratada já É o mecanismo
-- de rollback.
--
-- Remapeamento de IDs: como as PKs são identity columns e o Postgres não
-- reinicia a sequência com DELETE (só com TRUNCATE ... RESTART IDENTITY),
-- os registros recriados recebem IDs novos, diferentes dos do backup.
-- A tabela temporária _id_map guarda "id antigo -> id novo" por tabela,
-- populada à medida que cada linha é inserida, e consultada para
-- reescrever categoryId/supplierId/productId/locationId nas tabelas
-- dependentes antes delas serem inseridas. Uma referência do backup que
-- não é encontrada em _id_map (arquivo corrompido/editado à mão) aborta
-- a restauração inteira via RAISE EXCEPTION, em vez de gravar uma FK
-- nula ou apontando pro registro errado.
--
-- SECURITY INVOKER (não DEFINER): a função roda com o mesmo papel e o
-- mesmo auth.uid() de quem chamou, então as policies de RLS já existentes
-- em cada tabela acima continuam valendo normalmente — a função não pode
-- ver nem tocar dados de outro usuário, sem precisar reimplementar RLS
-- manualmente aqui dentro. Mesmo assim, todo DELETE/INSERT abaixo
-- filtra/seta user_id explicitamente, sem depender só do RLS.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.restore_backup(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    -- Dono da loja (não o próprio auth.uid()): os dados da loja pertencem ao dono.
    v_user_id uuid := public.current_owner_id();
    v_elem jsonb;
    v_new_id bigint;
    v_old_category_id bigint;
    v_new_category_id bigint;
    v_old_supplier_id bigint;
    v_new_supplier_id bigint;
    v_old_product_id bigint;
    v_new_product_id bigint;
    v_old_location_id bigint;
    v_new_location_id bigint;
    v_categories_count int := 0;
    v_suppliers_count int := 0;
    v_locations_count int := 0;
    v_settings_count int := 0;
    v_products_count int := 0;
    v_price_history_count int := 0;
    v_movements_count int := 0;
    v_product_stock_count int := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'restore_backup: usuário não autenticado.';
    END IF;
    IF public.current_role_name() <> 'dono' THEN
        RAISE EXCEPTION 'restore_backup: só o dono da loja pode restaurar um backup.';
    END IF;

    DROP TABLE IF EXISTS _id_map;
    CREATE TEMP TABLE _id_map (
        entity text NOT NULL,
        old_id bigint NOT NULL,
        new_id bigint NOT NULL,
        PRIMARY KEY (entity, old_id)
    ) ON COMMIT DROP;

    -- Fase 1: apaga os dados atuais do usuário (filhos antes dos pais,
    -- mesma ordem que importDatabase() já usava no frontend).
    DELETE FROM public.movements WHERE user_id = v_user_id;
    DELETE FROM public."priceHistory" WHERE user_id = v_user_id;
    DELETE FROM public."productStock" WHERE user_id = v_user_id;
    DELETE FROM public.products WHERE user_id = v_user_id;
    DELETE FROM public.categories WHERE user_id = v_user_id;
    DELETE FROM public.suppliers WHERE user_id = v_user_id;
    DELETE FROM public.locations WHERE user_id = v_user_id;
    DELETE FROM public.settings WHERE user_id = v_user_id;

    -- Fase 2: reinsere com remapeamento de IDs (pais antes dos filhos).

    -- categories
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'categories', '[]'::jsonb))
    LOOP
        INSERT INTO public.categories (user_id, name, description, color, "createdAt")
        VALUES (
            v_user_id,
            v_elem->>'name',
            v_elem->>'description',
            v_elem->>'color',
            COALESCE((v_elem->>'createdAt')::timestamptz, now())
        )
        RETURNING id INTO v_new_id;

        IF v_elem ? 'id' THEN
            INSERT INTO _id_map (entity, old_id, new_id) VALUES ('categories', (v_elem->>'id')::bigint, v_new_id);
        END IF;
        v_categories_count := v_categories_count + 1;
    END LOOP;

    -- suppliers
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'suppliers', '[]'::jsonb))
    LOOP
        INSERT INTO public.suppliers (user_id, name, email, phone, address, notes, "createdAt")
        VALUES (
            v_user_id,
            v_elem->>'name',
            v_elem->>'email',
            v_elem->>'phone',
            v_elem->>'address',
            v_elem->>'notes',
            COALESCE((v_elem->>'createdAt')::timestamptz, now())
        )
        RETURNING id INTO v_new_id;

        IF v_elem ? 'id' THEN
            INSERT INTO _id_map (entity, old_id, new_id) VALUES ('suppliers', (v_elem->>'id')::bigint, v_new_id);
        END IF;
        v_suppliers_count := v_suppliers_count + 1;
    END LOOP;

    -- locations
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'locations', '[]'::jsonb))
    LOOP
        INSERT INTO public.locations (user_id, name, address, description, "createdAt")
        VALUES (
            v_user_id,
            v_elem->>'name',
            v_elem->>'address',
            v_elem->>'description',
            COALESCE((v_elem->>'createdAt')::timestamptz, now())
        )
        RETURNING id INTO v_new_id;

        IF v_elem ? 'id' THEN
            INSERT INTO _id_map (entity, old_id, new_id) VALUES ('locations', (v_elem->>'id')::bigint, v_new_id);
        END IF;
        v_locations_count := v_locations_count + 1;
    END LOOP;

    -- settings (sem FK de referência, sem remapeamento)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'settings', '[]'::jsonb))
    LOOP
        INSERT INTO public.settings (user_id, "companyName", "cnpj", "lowStockThreshold")
        VALUES (
            v_user_id,
            v_elem->>'companyName',
            v_elem->>'cnpj',
            COALESCE((v_elem->>'lowStockThreshold')::int, 10)
        );
        v_settings_count := v_settings_count + 1;
    END LOOP;

    -- products (referencia categories/suppliers)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'products', '[]'::jsonb))
    LOOP
        v_new_category_id := NULL;
        v_old_category_id := (v_elem->>'categoryId')::bigint;
        IF v_old_category_id IS NOT NULL THEN
            SELECT new_id INTO v_new_category_id FROM _id_map WHERE entity = 'categories' AND old_id = v_old_category_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'products: categoria de origem % não encontrada no backup (produto "%")', v_old_category_id, v_elem->>'name';
            END IF;
        END IF;

        v_new_supplier_id := NULL;
        v_old_supplier_id := (v_elem->>'supplierId')::bigint;
        IF v_old_supplier_id IS NOT NULL THEN
            SELECT new_id INTO v_new_supplier_id FROM _id_map WHERE entity = 'suppliers' AND old_id = v_old_supplier_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'products: fornecedor de origem % não encontrado no backup (produto "%")', v_old_supplier_id, v_elem->>'name';
            END IF;
        END IF;

        INSERT INTO public.products (
            user_id, name, sku, description, "categoryId", "supplierId",
            price, "costPrice", quantity, "minStock", unit, "createdAt", "updatedAt"
        )
        VALUES (
            v_user_id,
            v_elem->>'name',
            v_elem->>'sku',
            v_elem->>'description',
            v_new_category_id,
            v_new_supplier_id,
            (v_elem->>'price')::numeric,
            (v_elem->>'costPrice')::numeric,
            (v_elem->>'quantity')::int,
            COALESCE((v_elem->>'minStock')::int, 0),
            v_elem->>'unit',
            COALESCE((v_elem->>'createdAt')::timestamptz, now()),
            COALESCE((v_elem->>'updatedAt')::timestamptz, now())
        )
        RETURNING id INTO v_new_id;

        IF v_elem ? 'id' THEN
            INSERT INTO _id_map (entity, old_id, new_id) VALUES ('products', (v_elem->>'id')::bigint, v_new_id);
        END IF;
        v_products_count := v_products_count + 1;
    END LOOP;

    -- priceHistory (referencia products)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'priceHistory', '[]'::jsonb))
    LOOP
        v_old_product_id := (v_elem->>'productId')::bigint;
        SELECT new_id INTO v_new_product_id FROM _id_map WHERE entity = 'products' AND old_id = v_old_product_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'priceHistory: produto de origem % não encontrado no backup', v_old_product_id;
        END IF;

        INSERT INTO public."priceHistory" (user_id, "productId", "oldPrice", "newPrice", "oldCostPrice", "newCostPrice", "changedAt")
        VALUES (
            v_user_id,
            v_new_product_id,
            (v_elem->>'oldPrice')::numeric,
            (v_elem->>'newPrice')::numeric,
            (v_elem->>'oldCostPrice')::numeric,
            (v_elem->>'newCostPrice')::numeric,
            COALESCE((v_elem->>'changedAt')::timestamptz, now())
        );
        v_price_history_count := v_price_history_count + 1;
    END LOOP;

    -- movements (referencia products e, opcionalmente, locations)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'movements', '[]'::jsonb))
    LOOP
        v_old_product_id := (v_elem->>'productId')::bigint;
        SELECT new_id INTO v_new_product_id FROM _id_map WHERE entity = 'products' AND old_id = v_old_product_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'movements: produto de origem % não encontrado no backup', v_old_product_id;
        END IF;

        v_new_location_id := NULL;
        v_old_location_id := (v_elem->>'locationId')::bigint;
        IF v_old_location_id IS NOT NULL THEN
            SELECT new_id INTO v_new_location_id FROM _id_map WHERE entity = 'locations' AND old_id = v_old_location_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'movements: local de origem % não encontrado no backup', v_old_location_id;
            END IF;
        END IF;

        INSERT INTO public.movements (user_id, "productId", type, quantity, reason, notes, "locationId", date, "createdAt")
        VALUES (
            v_user_id,
            v_new_product_id,
            v_elem->>'type',
            (v_elem->>'quantity')::int,
            v_elem->>'reason',
            v_elem->>'notes',
            v_new_location_id,
            COALESCE((v_elem->>'date')::timestamptz, now()),
            COALESCE((v_elem->>'createdAt')::timestamptz, now())
        );
        v_movements_count := v_movements_count + 1;
    END LOOP;

    -- productStock (referencia products e locations, ambos obrigatórios)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'productStock', '[]'::jsonb))
    LOOP
        v_old_product_id := (v_elem->>'productId')::bigint;
        SELECT new_id INTO v_new_product_id FROM _id_map WHERE entity = 'products' AND old_id = v_old_product_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'productStock: produto de origem % não encontrado no backup', v_old_product_id;
        END IF;

        v_old_location_id := (v_elem->>'locationId')::bigint;
        SELECT new_id INTO v_new_location_id FROM _id_map WHERE entity = 'locations' AND old_id = v_old_location_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'productStock: local de origem % não encontrado no backup', v_old_location_id;
        END IF;

        INSERT INTO public."productStock" (user_id, "productId", "locationId", quantity)
        VALUES (v_user_id, v_new_product_id, v_new_location_id, (v_elem->>'quantity')::int);
        v_product_stock_count := v_product_stock_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'categories', v_categories_count,
        'suppliers', v_suppliers_count,
        'locations', v_locations_count,
        'settings', v_settings_count,
        'products', v_products_count,
        'priceHistory', v_price_history_count,
        'movements', v_movements_count,
        'productStock', v_product_stock_count
    );
END;
$$;

-- Por padrão o Postgres concede EXECUTE em funções novas pra PUBLIC
-- automaticamente — revoga isso e libera só pra usuários autenticados.
-- Este projeto Supabase também tem ALTER DEFAULT PRIVILEGES no schema
-- "public" concedendo EXECUTE pra anon/authenticated/service_role em toda
-- função nova (padrão de bootstrap do próprio Supabase) — REVOKE FROM
-- PUBLIC não desfaz esses grants por role, por isso o REVOKE FROM anon
-- explícito abaixo também é necessário (verificado com
-- has_function_privilege('anon', ..., 'EXECUTE') = false depois de rodar).
REVOKE EXECUTE ON FUNCTION public.restore_backup(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_backup(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_backup(jsonb) TO authenticated;

-- ============================================================================
-- Perfis de usuário (dono / gerente / caixa) — tarefa 009
--
-- Modelo: a "loja" é o usuário DONO. Todas as linhas já têm user_id = dono,
-- então os dados atuais continuam valendo sem migração. Um membro (gerente ou
-- caixa) é uma conta que aponta para o dono em "members"; a partir daí as
-- políticas passam a usar current_owner_id() no lugar de auth.uid(), e o
-- papel (current_role_name()) decide o que cada um pode fazer.
--
--   dono    : tudo, inclusive configurações, equipe e restaurar backup
--   gerente : tudo, menos configurações, equipe e restaurar backup
--   caixa   : vender (ler produtos/estoque/clientes, registrar movimentações e
--             fiado, baixar estoque). Não cadastra nem apaga nada.
--
-- LIMITAÇÃO CONHECIDA: o caixa precisa ler "products" para vender (a baixa de
-- estoque do PDV acontece no cliente), então o preço de custo é ocultado só na
-- interface, não no banco. Fechar isso exige mover a venda para uma RPC e dar
-- ao caixa apenas uma view sem custo. Fica como tarefa futura.
--
-- Um usuário pertence a UMA loja. Uma conta que já tem dados próprios não pode
-- ser adicionada como membro (os dados dela ficariam invisíveis).
-- ============================================================================
CREATE TABLE IF NOT EXISTS "members" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "ownerId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "memberId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('gerente', 'caixa')),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("memberId"),
    CHECK ("ownerId" <> "memberId")
);

ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_select" ON "members";
-- Só leitura direta; inserir/alterar/remover passa pelas RPCs abaixo.
CREATE POLICY "members_select" ON "members"
    FOR SELECT USING ("ownerId" = auth.uid() OR "memberId" = auth.uid());

-- SECURITY DEFINER para ler "members" sem passar pela RLS (as próprias
-- políticas das outras tabelas chamam estas funções; sem isso haveria recursão).
CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE((SELECT "ownerId" FROM public.members WHERE "memberId" = auth.uid()), auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE((SELECT "role" FROM public.members WHERE "memberId" = auth.uid()), 'dono');
$$;

REVOKE EXECUTE ON FUNCTION public.current_owner_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_owner_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_owner_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_role_name() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_role_name() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_role_name() TO authenticated;

-- Papel e dono do usuário logado, para a interface montar o menu.
CREATE OR REPLACE FUNCTION public.my_access()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
    SELECT jsonb_build_object('role', public.current_role_name(), 'ownerId', public.current_owner_id());
$$;

REVOKE EXECUTE ON FUNCTION public.my_access() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_access() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_access() TO authenticated;

-- --- Gestão da equipe (somente o dono) ------------------------------------
CREATE OR REPLACE FUNCTION public.add_member(p_email text, p_role text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner uuid := auth.uid();
    v_target uuid;
BEGIN
    IF v_owner IS NULL OR public.current_role_name() <> 'dono' THEN
        RAISE EXCEPTION 'Somente o dono da loja pode gerenciar a equipe';
    END IF;
    IF p_role NOT IN ('gerente', 'caixa') THEN
        RAISE EXCEPTION 'Papel inválido: %', p_role;
    END IF;

    SELECT id INTO v_target FROM auth.users WHERE lower(email) = lower(trim(p_email));
    IF v_target IS NULL THEN
        RAISE EXCEPTION 'Nenhuma conta encontrada com esse e-mail. A pessoa precisa criar a conta no app primeiro.';
    END IF;
    IF v_target = v_owner THEN
        RAISE EXCEPTION 'Você já é o dono desta loja';
    END IF;
    IF EXISTS (SELECT 1 FROM public.members WHERE "memberId" = v_target) THEN
        RAISE EXCEPTION 'Essa conta já faz parte de uma equipe';
    END IF;
    IF EXISTS (SELECT 1 FROM public.products WHERE user_id = v_target)
       OR EXISTS (SELECT 1 FROM public.movements WHERE user_id = v_target) THEN
        RAISE EXCEPTION 'Essa conta já tem dados próprios no app e ficariam invisíveis. Use uma conta nova.';
    END IF;

    INSERT INTO public.members ("ownerId", "memberId", "role") VALUES (v_owner, v_target, p_role);
    RETURN jsonb_build_object('memberId', v_target, 'role', p_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_member_role(p_member_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR public.current_role_name() <> 'dono' THEN
        RAISE EXCEPTION 'Somente o dono da loja pode gerenciar a equipe';
    END IF;
    IF p_role NOT IN ('gerente', 'caixa') THEN
        RAISE EXCEPTION 'Papel inválido: %', p_role;
    END IF;
    UPDATE public.members SET "role" = p_role WHERE "ownerId" = auth.uid() AND "memberId" = p_member_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membro não encontrado';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR public.current_role_name() <> 'dono' THEN
        RAISE EXCEPTION 'Somente o dono da loja pode gerenciar a equipe';
    END IF;
    DELETE FROM public.members WHERE "ownerId" = auth.uid() AND "memberId" = p_member_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membro não encontrado';
    END IF;
END;
$$;

-- Lista a equipe com e-mail e nome (auth.users não é legível pelo cliente).
CREATE OR REPLACE FUNCTION public.list_members()
RETURNS TABLE ("memberId" uuid, "email" text, "fullName" text, "role" text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR public.current_role_name() <> 'dono' THEN
        RAISE EXCEPTION 'Somente o dono da loja pode gerenciar a equipe';
    END IF;
    RETURN QUERY
        SELECT m."memberId", u.email::text, p."fullName"::text, m."role"::text
        FROM public.members m
        JOIN auth.users u ON u.id = m."memberId"
        LEFT JOIN public.profiles p ON p.user_id = m."memberId"
        WHERE m."ownerId" = auth.uid()
        ORDER BY m."createdAt";
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_member(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_member(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_member(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_member_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_member_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_members() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_members() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_members() TO authenticated;

-- --- Políticas por papel ----------------------------------------------------
-- Gera as políticas de cada tabela a partir de uma matriz. Tabelas que ainda
-- não existem são ignoradas (as das tarefas 007 e 012 só existem depois que
-- aquelas migrações forem aplicadas): rode este bloco de novo depois delas.
--   cs = caixa lê | ci = caixa insere | cu = caixa altera
--   gw = gerente escreve (false = só o dono escreve)
-- Apagar é sempre só dono/gerente. O DEFAULT de user_id passa a ser o dono, para
-- que um membro grave as linhas em nome da loja.
DO $roles$
DECLARE
    v_matrix jsonb := '{
        "categories":       {"cs": true,  "ci": false, "cu": false, "gw": true},
        "suppliers":        {"cs": false, "ci": false, "cu": false, "gw": true},
        "locations":        {"cs": true,  "ci": false, "cu": false, "gw": true},
        "productStock":     {"cs": true,  "ci": true,  "cu": true,  "gw": true},
        "products":         {"cs": true,  "ci": false, "cu": true,  "gw": true},
        "movements":        {"cs": true,  "ci": true,  "cu": false, "gw": true},
        "priceHistory":     {"cs": false, "ci": false, "cu": false, "gw": true},
        "settings":         {"cs": true,  "ci": false, "cu": false, "gw": false},
        "stockCounts":      {"cs": false, "ci": false, "cu": false, "gw": true},
        "stockCountItems":  {"cs": false, "ci": false, "cu": false, "gw": true},
        "customers":        {"cs": true,  "ci": true,  "cu": false, "gw": true},
        "customerEntries":  {"cs": true,  "ci": true,  "cu": false, "gw": true}
    }'::jsonb;
    v_table text;
    v_cfg jsonb;
    v_write text;
    v_read text;
    v_ins text;
    v_upd text;
    v_owner text := 'user_id = public.current_owner_id()';
BEGIN
    FOR v_table, v_cfg IN SELECT key, value FROM jsonb_each(v_matrix) LOOP
        IF to_regclass(format('public.%I', v_table)) IS NULL THEN
            CONTINUE;
        END IF;

        -- escrita total: dono sempre; gerente se gw
        v_write := CASE WHEN (v_cfg->>'gw')::boolean
            THEN 'public.current_role_name() IN (''dono'', ''gerente'')'
            ELSE 'public.current_role_name() = ''dono''' END;
        v_read := format('public.current_role_name() IN (''dono'', ''gerente'')%s',
            CASE WHEN (v_cfg->>'cs')::boolean THEN ' OR public.current_role_name() = ''caixa''' ELSE '' END);
        v_ins := format('(%s)%s', v_write,
            CASE WHEN (v_cfg->>'ci')::boolean THEN ' OR public.current_role_name() = ''caixa''' ELSE '' END);
        v_upd := format('(%s)%s', v_write,
            CASE WHEN (v_cfg->>'cu')::boolean THEN ' OR public.current_role_name() = ''caixa''' ELSE '' END);

        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT public.current_owner_id()', v_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_owner', v_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_select', v_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_insert', v_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_update', v_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_delete', v_table);

        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (%s AND (%s))',
            v_table || '_select', v_table, v_owner, v_read);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s AND (%s))',
            v_table || '_insert', v_table, v_owner, v_ins);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s AND (%s)) WITH CHECK (%s AND (%s))',
            v_table || '_update', v_table, v_owner, v_upd, v_owner, v_upd);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (%s AND (%s))',
            v_table || '_delete', v_table, v_owner, v_write);
    END LOOP;
END
$roles$;

-- O caixa pode alterar produtos (baixa de estoque), mas só a quantidade:
-- preço, custo, nome etc. continuam travados.
CREATE OR REPLACE FUNCTION public.restrict_cashier_product_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF public.current_role_name() = 'caixa'
       AND (to_jsonb(NEW) - 'quantity' - 'updatedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'quantity' - 'updatedAt') THEN
        RAISE EXCEPTION 'O caixa só pode alterar a quantidade em estoque';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "products_restrict_cashier" ON public.products;
CREATE TRIGGER "products_restrict_cashier"
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.restrict_cashier_product_update();
