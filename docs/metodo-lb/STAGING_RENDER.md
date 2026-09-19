# Render Staging — LB Performance

Use este documento apenas para homologação do Método LB.

## Serviço

- Nome sugerido: `lb-performance-staging`
- Repositório: `ledichanfras-netizen/LB-Performance-`
- Branch: `feature/metodo-lb-v1`
- Build: `npm install && npm run build`
- Start: `npm start`
- Health check: `/api/health`

O arquivo `render.staging.yaml` contém a configuração-base.

## Banco

Usar exclusivamente o projeto Supabase:
- `LB-Performance-Staging`
- ref `jhwgegzzdjhnjgdofrlf`

Nunca usar a `DATABASE_URL` do LBHUB de produção no serviço de homologação.

## Variáveis obrigatórias

- `DATABASE_URL`: conexão Postgres do projeto de staging.
- `JWT_SECRET`: segredo exclusivo do staging.
- `VITE_SUPABASE_URL`: URL do projeto de staging.
- `VITE_SUPABASE_ANON_KEY`: publishable key do staging.
- `ALLOW_LEGACY_DOB_LOGIN=false`.

`GEMINI_API_KEY` pode ser configurada quando os endpoints de IA forem testados.

## Feature flags

Começar com todas em `false`.

Ordem recomendada de homologação:
1. `VITE_LB_CORE_WORKFLOW=true`
2. interpretation / decision
3. prescription / monitoring
4. reassessment / transfer
5. premium reports

Nunca ativar todo o Método LB de uma vez no primeiro deploy.

## Gate

Antes de qualquer merge para `main`:
- health check 200;
- login sem credenciais padrão;
- leitura/escrita somente via servidor;
- regressão das avaliações atuais;
- regressão de treino/wellness;
- smoke tests do lb_core;
- validação funcional do Prof. Leandro.
