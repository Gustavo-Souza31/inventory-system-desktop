-- ============================================================================
-- ROLLBACK da migração "lojistas" (perfis, contagem, fiado, termos)
--
-- Volta o banco de PRODUÇÃO ao estado anterior: 8 tabelas (categories, suppliers,
-- locations, products, movements, priceHistory, productStock, settings), uma
-- política "<tabela>_owner" em cada uma e a função restore_backup antiga.
--
-- ATENÇÃO: apaga as tabelas novas e TODOS os dados delas (clientes, fiado,
-- contagens, equipe, aceites, perfis). Só use se a migração der errado logo no
-- início, antes de alguém cadastrar clientes/fiado. Depois disso, em vez de
-- voltar, corrija para frente. Rode tudo numa transação (apply_migration já faz).
-- ============================================================================

-- Gatilhos e funções novas
DROP TRIGGER IF EXISTS "on_auth_user_created" ON auth.users;
DROP TRIGGER IF EXISTS "products_restrict_cashier_writes" ON public.products;
DROP TRIGGER IF EXISTS "productStock_restrict_cashier_writes" ON public."productStock";
DROP TRIGGER IF EXISTS "movements_restrict_cashier_writes" ON public.movements;
DROP TRIGGER IF EXISTS "products_check_refs_owner" ON public.products;
DROP TRIGGER IF EXISTS "productStock_check_refs_owner" ON public."productStock";
DROP TRIGGER IF EXISTS "movements_check_refs_owner" ON public.movements;
DROP TRIGGER IF EXISTS "priceHistory_check_refs_owner" ON public."priceHistory";

-- Tabelas novas (os gatilhos delas caem junto)
DROP TABLE IF EXISTS public."customerEntries";
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public."stockCountItems";
DROP TABLE IF EXISTS public."stockCounts";
DROP TABLE IF EXISTS public.consents;
DROP TABLE IF EXISTS public.members;
DROP TABLE IF EXISTS public.profiles;

DROP FUNCTION IF EXISTS public.restrict_cashier_writes();
DROP FUNCTION IF EXISTS public.check_store_refs_owner();
DROP FUNCTION IF EXISTS public.check_customer_entry_owner();
DROP FUNCTION IF EXISTS public.check_stock_count_owner();
DROP FUNCTION IF EXISTS public.add_customer_entry(bigint, text, numeric, text);
DROP FUNCTION IF EXISTS public.save_and_apply_stock_count(bigint, text, jsonb);
DROP FUNCTION IF EXISTS public.apply_stock_count(bigint);
DROP FUNCTION IF EXISTS public.add_member(text, text);
DROP FUNCTION IF EXISTS public.set_member_role(uuid, text);
DROP FUNCTION IF EXISTS public.remove_member(uuid);
DROP FUNCTION IF EXISTS public.list_members();
DROP FUNCTION IF EXISTS public.my_pending_invite();
DROP FUNCTION IF EXISTS public.accept_invite();
DROP FUNCTION IF EXISTS public.leave_team();
DROP FUNCTION IF EXISTS public.account_has_own_data(uuid);
DROP FUNCTION IF EXISTS public.my_access();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Políticas: troca as por-papel pelas antigas "<tabela>_owner" e devolve o
-- DEFAULT de user_id para auth.uid(). (As funções current_owner_id() e
-- current_role_name() são removidas por último, depois que nada mais as usa.)
DO $rollback$
DECLARE
    v_table text;
    v_suffix text;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'categories', 'suppliers', 'locations', 'products', 'movements',
        'priceHistory', 'productStock', 'settings'
    ] LOOP
        FOREACH v_suffix IN ARRAY ARRAY['select', 'insert', 'update', 'delete', 'owner'] LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_table || '_' || v_suffix, v_table);
        END LOOP;
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', v_table);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
            v_table || '_owner', v_table);
    END LOOP;
END
$rollback$;

-- restore_backup antigo (usa auth.uid() e não checa papel). É CREATE OR REPLACE:
-- precisa vir ANTES de remover current_owner_id(), mas ele não depende dela.
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

-- Por último, as funções de papel (nada mais depende delas)
DROP FUNCTION IF EXISTS public.current_role_name();
DROP FUNCTION IF EXISTS public.current_owner_id();
