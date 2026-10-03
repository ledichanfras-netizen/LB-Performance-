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
