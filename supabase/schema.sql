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
