# Contas e organizações — piloto desativado

Contas por convite em /contas; APIs em /api/accounts. ACCOUNTS_ENABLED=false por padrão.
Convites: token aleatório de 256 bits, apenas hash no banco, validade de 48 horas,
uso único com transação e bloqueio da linha. Senha: bcrypt custo 12, mínimo 12 caracteres,
limite de 72 bytes. Sessão: duas horas, versão conferida no banco a cada operação administrativa.
Somente administrador persistido em memberships pode criar organizações e convites.
Administração não concede acesso esportivo global. Convite de aluno exige vínculo do atleta à organização.

## Preparação antes da ativação
1. Backup e banco de staging. Aplicar accounts-schema.sql sem expor lb_accounts na Data API.
2. Revogar acesso público à tabela users e corrigir os caminhos legados. Migrar senhas em texto puro.
3. Provisionar organização LB, conta administrativa com hash de senha nova e membership platform_admin.
   Não há endpoint público para criar o primeiro administrador ou elevar privilégios.
4. Associar os atletas existentes à organização LB na tabela athlete_scopes, após conferir órfãos.
5. Testar cadastro, expiração, repetição e sessão inválida em staging.
6. Adicionar rate limiting distribuído aos endpoints de login/aceitação antes de expô-los publicamente.

## Sequência restante antes de acesso esportivo
O token scoped é deliberadamente rejeitado pelo middleware das APIs esportivas legadas,
pois /ler ainda carrega todos os atletas para coach. As rotas /accounts usam autenticação própria.
Assim, o piloto não abre uma segunda via para consultar dados sem isolamento.
Implementar filtros por athlete_scopes em todas as leituras e validação do vínculo em todas
as escritas/exclusões; novos atletas precisam de atribuição atômica. Revisar rotas de IA,
api/*.js, acesso direto Supabase e caches antes de habilitar esportes para novas contas.
Depois validar novo administrador, trocar JWT_SECRET e remover login fixo, auto-registro por
nascimento e recriação da senha padrão. Isso ainda não foi feito neste incremento para evitar
bloqueio do acesso existente sem credencial substituta validada.
Não aplicar nenhuma destas etapas automaticamente em produção.

## Progresso verificado em 03/10/2026
Schemas accounts e billing aplicados ao projeto LB-Performance-Staging, sem alteração
nas contas, senhas ou atletas existentes. Sete tabelas verificadas com RLS e sem USAGE
para anon/authenticated. Teste PostgreSQL local confirma isolamento e bloqueio direto.
Endpoint de listagem /api/accounts/athletes consulta escopo persistido, sem privilégio
esportivo global para administrador. Salvamento/exclusão esportiva scoped seguem bloqueados.
Cache do hub separado por identidade/organização; hub remonta quando muda a sessão,
logout limpa caches de atletas. Essa alteração não substitui autorização no servidor.
Bootstrap administrativo preparado em scripts/bootstrap-accounts.ts, ainda não executado;
requer senha nova fornecida por variável de ambiente. Não gera nem divulga senha ao usuário.

## Incremento de proteção das operações
Rotas privadas do piloto: PATCH /accounts/athletes/:id/profile altera somente nome/modalidade
por treinador da organização; DELETE /accounts/records/:type/:id verifica proprietário no
banco e faz exclusão transacional (incluindo séries/exercícios de treino). Aluno pode excluir
somente próprio wellness/sessão externa. A rota de contexto IA entrega apenas identificação
do atleta autorizado; não integra ainda o contexto completo nem as chamadas de IA legadas.
Login/aceitação limitados por identidade em janelas de 15 minutos usando contador PostgreSQL;
limites 20/10. Isso não substitui proteção global contra abuso ou ataques volumétricos.
Aplicar account-rate-schema.sql antes de ativar o piloto.
Sessões scoped passam a poder consultar billing após validar versão no banco; administração
financeira scoped vem de platform_admin persistido, sem depender da lista de IDs de legado.
Os fluxos esportivos existentes ainda não foram conectados às novas rotas: salvar avaliação,
criar atleta e prescrever treino por conta scoped continuam desativados.
