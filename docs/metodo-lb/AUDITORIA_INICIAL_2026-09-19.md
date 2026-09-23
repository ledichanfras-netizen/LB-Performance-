# Método LB Performance — Auditoria Inicial

Data: 2026-09-19  
Branch: `feature/metodo-lb-v1`  
Base congelada: `backup/pre-metodo-lb-2026-09-19`  
Commit de referência: `59fb91f888dc7bb905b42d1a7d564436cef99bdb`

## Objetivo

Integrar o fluxo **AVALIAR → INTERPRETAR → DECIDIR → PRESCREVER → MONITORAR → REAVALIAR → TRANSFERIR** sem alterar o comportamento atual da produção até validação explícita.

## Arquitetura real identificada

- Front-end: React 18 + Vite + TypeScript.
- Back-end: Express/Node no mesmo repositório.
- Banco: Supabase/Postgres, projeto LBHUB.
- Deploy: Render via `render.yaml`.
- Persistência atual: acesso direto por `pg` no servidor, com fallback pelo cliente Supabase.
- Autenticação atual: JWT próprio do Express.

## Achados prioritários

1. As tabelas públicas do banco atual estão com RLS desativado.
2. O servidor contém um fallback de credencial de treinador codificado no código-fonte.
3. O login do atleta ainda possui fallback baseado em dado pessoal previsível.
4. Rotas de escrita/exclusão usam autenticação por token, mas precisam de autorização por papel/posse de recurso mais granular.
5. O servidor executa alterações de schema em runtime por meio de `ensureColumns()`.
6. O front-end mantém fallback de acesso direto ao Supabase quando não recebe token.

## Regra de implantação

Nenhuma mudança do Método LB será aplicada à `main`, Render ou banco de produção antes de:

1. validação em branch isolada;
2. ambiente de staging/homologação;
3. teste de regressão do fluxo atual;
4. teste de autorização;
5. validação funcional do Prof. Leandro;
6. plano de rollback validado.

## Estratégia de banco

Enquanto o app continuar usando JWT próprio no Express, o novo núcleo do Método LB será desenhado como **schema privado server-side**, evitando expor novas tabelas diretamente ao Data API.

As tabelas atuais não serão renomeadas, removidas ou sobrescritas nesta fase.

## Rollback

Rollback de código:
- retornar o deploy ao commit `59fb91f888dc7bb905b42d1a7d564436cef99bdb` ou à branch `backup/pre-metodo-lb-2026-09-19`.

Rollback de funcionalidades:
- novas telas serão protegidas por feature flags.

Rollback de banco:
- migrations novas devem ser aditivas;
- nenhuma coluna/tabela atual será destruída na primeira implantação;
- dados do núcleo LB permanecerão separados do legado enquanto a nova arquitetura for validada.
