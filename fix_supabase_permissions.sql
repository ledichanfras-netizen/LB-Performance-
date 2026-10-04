-- =========================================================================
-- LB SPORTS - CORREÇÃO DE PERMISSÕES NO SUPABASE (ERRO 42501)
-- =========================================================================
-- Execute este script no SQL Editor do seu projeto Supabase para liberar o
-- acesso de leitura e escrita para a chave anônima (anon) e autenticada.
-- =========================================================================

-- 1. Conceder permissões no schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Garantir que novas tabelas criadas no futuro também tenham permissão
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 3. Configurar Políticas de RLS (Row Level Security) para a tabela athletes
ALTER TABLE IF EXISTS athletes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select para anon em athletes" ON athletes;
DROP POLICY IF EXISTS "Permitir insert para anon em athletes" ON athletes;
DROP POLICY IF EXISTS "Permitir update para anon em athletes" ON athletes;
DROP POLICY IF EXISTS "Permitir delete para anon em athletes" ON athletes;
DROP POLICY IF EXISTS "Permitir tudo para todos em athletes" ON athletes;

CREATE POLICY "Permitir tudo para todos em athletes" 
ON athletes 
FOR ALL 
TO public, anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Repetir para tabelas relacionadas (wellness, workouts, etc.)
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'wellness',
        'external_sessions',
        'workouts',
        'prescribed_exercises',
        'performed_sets',
        'bioimpedance',
        'isometric_strength',
        'cmj',
        'drop_jump',
        'vo2max',
        'speed',
        'general_strength',
        'users',
        'performance'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Permitir tudo para todos em %s" ON %I;', tbl, tbl);
            EXECUTE format('CREATE POLICY "Permitir tudo para todos em %s" ON %I FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- Mensagem de confirmação
SELECT 'Permissões e RLS do Supabase configurados com sucesso para o LB Sports!' AS status;
