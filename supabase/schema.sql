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

    -- Aceite dos termos e da política de privacidade (tarefa 003): a versão
    -- aceita vem junto do cadastro (a sessão ainda não existe até confirmar o
    -- e-mail, então o client não conseguiria gravar direto na tabela). O app
    -- sempre envia a versão; contas criadas direto no painel do Supabase
    -- (sem esse dado) são aceitas, mas ficam sem registro de aceite.
    IF NULLIF(trim(NEW.raw_user_meta_data->>'accepted_terms_version'), '') IS NOT NULL THEN
        INSERT INTO public.consents ("user_id", "termsVersion")
        VALUES (NEW.id, trim(NEW.raw_user_meta_data->>'accepted_terms_version'));
    END IF;
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
    v_user_id uuid := auth.uid();
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
-- Contagem de estoque (inventário físico) — tarefa 007
--
-- Uma "contagem" guarda o que o lojista contou de cada produto (opcionalmente
-- num local). apply_stock_count() transforma as diferenças em movimentações de
-- ajuste e acerta o estoque, tudo numa transação. Uma contagem só pode ser
-- aplicada uma vez (status 'aplicada'), então chamar a função de novo não
-- duplica nenhum ajuste.
--
-- Observação: restore_backup() não inclui estas tabelas. Ao restaurar, os
-- produtos são recriados com ids novos e os itens das contagens antigas caem
-- em cascata; contagens já aplicadas ficam apenas como histórico.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "stockCounts" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "locationId" BIGINT REFERENCES "locations"("id") ON DELETE SET NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK ("status" IN ('aberta', 'aplicada')),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "appliedAt" TIMESTAMPTZ
);

ALTER TABLE "stockCounts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stockCounts_owner" ON "stockCounts";
CREATE POLICY "stockCounts_owner" ON "stockCounts"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS "stockCountItems" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "countId" BIGINT NOT NULL REFERENCES "stockCounts"("id") ON DELETE CASCADE,
    "productId" BIGINT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "expected" INTEGER NOT NULL CHECK ("expected" >= 0),
    "counted" INTEGER NOT NULL CHECK ("counted" >= 0),
    UNIQUE ("countId", "productId")
);

ALTER TABLE "stockCountItems" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stockCountItems_owner" ON "stockCountItems";
CREATE POLICY "stockCountItems_owner" ON "stockCountItems"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SECURITY INVOKER: roda com o auth.uid() de quem chamou, então a RLS acima
-- continua valendo (mesmo padrão de restore_backup).
CREATE OR REPLACE FUNCTION public.apply_stock_count(p_count_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_count public."stockCounts"%ROWTYPE;
    v_item record;
    v_current int;
    v_base int;
    v_diff int;
    v_new_total int;
    v_adjusted int := 0;
BEGIN
    -- Trava a linha da contagem: duas chamadas simultâneas esperam uma pela outra.
    SELECT * INTO v_count FROM public."stockCounts"
    WHERE id = p_count_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contagem % não encontrada', p_count_id;
    END IF;

    IF v_count.status = 'aplicada' THEN
        RETURN jsonb_build_object('applied', false, 'adjusted', 0, 'reason', 'Contagem já aplicada');
    END IF;

    FOR v_item IN
        SELECT "productId", counted FROM public."stockCountItems"
        WHERE "countId" = p_count_id AND user_id = v_user_id
    LOOP
        SELECT quantity INTO v_current FROM public.products
        WHERE id = v_item."productId" AND user_id = v_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto % não encontrado', v_item."productId";
        END IF;

        IF v_count."locationId" IS NULL THEN
            -- Contagem do estoque total: o valor contado vira o total.
            v_base := v_current;
            v_diff := v_item.counted - v_base;
            v_new_total := v_item.counted;
        ELSE
            -- Contagem de um local: ajusta o local e move o total na mesma diferença.
            SELECT COALESCE(
                (SELECT quantity FROM public."productStock"
                 WHERE "productId" = v_item."productId" AND "locationId" = v_count."locationId" AND user_id = v_user_id),
                0) INTO v_base;
            v_diff := v_item.counted - v_base;
            v_new_total := GREATEST(0, v_current + v_diff);

            INSERT INTO public."productStock" (user_id, "productId", "locationId", quantity)
            VALUES (v_user_id, v_item."productId", v_count."locationId", v_item.counted)
            ON CONFLICT ("productId", "locationId") DO UPDATE SET quantity = EXCLUDED.quantity;
        END IF;

        IF v_diff <> 0 THEN
            INSERT INTO public.movements (user_id, "productId", type, quantity, reason, notes, "locationId", date, "createdAt")
            VALUES (
                v_user_id, v_item."productId",
                CASE WHEN v_diff > 0 THEN 'entrada' ELSE 'saida' END,
                abs(v_diff), 'Ajuste de contagem', COALESCE(v_count.notes, ''),
                v_count."locationId", now(), now()
            );
            UPDATE public.products SET quantity = v_new_total, "updatedAt" = now()
            WHERE id = v_item."productId" AND user_id = v_user_id;
            v_adjusted := v_adjusted + 1;
        END IF;
    END LOOP;

    UPDATE public."stockCounts" SET status = 'aplicada', "appliedAt" = now() WHERE id = p_count_id;

    RETURN jsonb_build_object('applied', true, 'adjusted', v_adjusted);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_stock_count(bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_stock_count(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_stock_count(bigint) TO authenticated;

-- ============================================================================
-- Clientes e venda fiado — tarefa 012
--
-- "customers" é o cadastro; "customerEntries" é o livro de lançamentos de cada
-- cliente: um 'fiado' aumenta o que ele deve, um 'pagamento' diminui. O saldo
-- devedor é sempre a soma dos fiados menos a soma dos pagamentos (não é
-- guardado em coluna, para nunca ficar fora de sincronia).
--
-- O PDV não tem tabela de vendas (cada venda vira movimentações de saída), por
-- isso o lançamento não aponta para uma venda: a descrição guarda o resumo.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "customers" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30) NOT NULL DEFAULT '',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_owner" ON "customers";
CREATE POLICY "customers_owner" ON "customers"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ON DELETE RESTRICT: não dá para apagar um cliente que tem histórico.
CREATE TABLE IF NOT EXISTS "customerEntries" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "customerId" BIGINT NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
    "type" VARCHAR(20) NOT NULL CHECK ("type" IN ('fiado', 'pagamento')),
    "amount" DECIMAL(10,2) NOT NULL CHECK ("amount" > 0),
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "customerEntries" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customerEntries_owner" ON "customerEntries";
CREATE POLICY "customerEntries_owner" ON "customerEntries"
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Registra um lançamento com validação e trava do cliente (evita dois
-- pagamentos simultâneos passarem do saldo). SECURITY INVOKER: a RLS vale.
CREATE OR REPLACE FUNCTION public.add_customer_entry(
    p_customer_id bigint,
    p_type text,
    p_amount numeric,
    p_description text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_balance numeric;
    v_entry_id bigint;
BEGIN
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'Selecione o cliente';
    END IF;
    IF p_type NOT IN ('fiado', 'pagamento') THEN
        RAISE EXCEPTION 'Tipo de lançamento inválido: %', p_type;
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'O valor deve ser maior que zero';
    END IF;

    PERFORM 1 FROM public.customers WHERE id = p_customer_id AND user_id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente % não encontrado', p_customer_id;
    END IF;

    SELECT COALESCE(SUM(CASE WHEN type = 'fiado' THEN amount ELSE -amount END), 0) INTO v_balance
    FROM public."customerEntries" WHERE "customerId" = p_customer_id AND user_id = v_user_id;

    IF p_type = 'pagamento' AND p_amount > v_balance THEN
        RAISE EXCEPTION 'O pagamento (%) é maior que o saldo devedor (%)', p_amount, v_balance;
    END IF;

    INSERT INTO public."customerEntries" (user_id, "customerId", type, amount, description)
    VALUES (v_user_id, p_customer_id, p_type, p_amount, COALESCE(p_description, ''))
    RETURNING id INTO v_entry_id;

    RETURN jsonb_build_object(
        'entryId', v_entry_id,
        'balance', CASE WHEN p_type = 'fiado' THEN v_balance + p_amount ELSE v_balance - p_amount END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_customer_entry(bigint, text, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_customer_entry(bigint, text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_customer_entry(bigint, text, numeric, text) TO authenticated;

-- ============================================================================
-- Aceite dos termos e da política de privacidade (LGPD) — tarefa 003
--
-- Uma linha por aceite: quem aceitou, qual versão dos textos e quando. A linha
-- do cadastro é criada pelo trigger handle_new_user() (acima). A pessoa pode
-- ler os próprios aceites e registrar um novo (quando os textos mudarem), mas
-- não alterar nem apagar o histórico.
-- ============================================================================
CREATE TABLE IF NOT EXISTS "consents" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    "termsVersion" VARCHAR(50) NOT NULL CHECK (length(trim("termsVersion")) > 0),
    "acceptedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("user_id", "termsVersion")
);

ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consents_select" ON "consents";
CREATE POLICY "consents_select" ON "consents"
    FOR SELECT USING (user_id = auth.uid());
-- A data do aceite não pode ser inventada pelo cliente: tem de ser "agora".
DROP POLICY IF EXISTS "consents_insert" ON "consents";
CREATE POLICY "consents_insert" ON "consents"
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND "acceptedAt" BETWEEN now() - interval '1 minute' AND now() + interval '1 minute'
    );
