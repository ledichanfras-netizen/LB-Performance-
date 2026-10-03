# Ativação de contas, organizações e cobrança manual

A implementação está na branch feat/manual-billing-foundation. Produção e main não foram alteradas.

## Fluxo implementado
- /contas: configuração única do administrador, aceitação de convite, criação de organizações e convite de treinador/aluno; redefinição de senha para usuário vinculado ao mesmo espaço.
- Login com bcrypt, sessão de duas horas, versão de sessão consultada no banco e limite distribuído de tentativas. Redefinir senha invalida sessões anteriores.
- Treinadores consultam e alteram apenas atletas de sua organização. Alunos registram prontidão, sessões externas e execução de seus próprios treinos; não alteram prescrição.
- Leituras, salvamento, exclusões, IA e cache respeitam os vínculos. Atleta excluído é arquivado, preservando registros.
- /assinaturas: planos de aluno/treinador, preço, duração, tolerância e limite de atletas; vínculo do plano, recebimento confirmado, cortesia, renovação, suspensão e cancelamento da renovação; histórico financeiro.
- Liberação conferida no servidor pela validade/tolerância. Um aluno sem assinatura individual pode ser coberto por licença ativa de treinador do mesmo espaço. Uma assinatura individual vencida ou suspensa tem prioridade. Cancelamento da renovação preserva o prazo já concedido.

## Implantação em staging
1. Confirmar serviço Render e conferir que usa exclusivamente LB-Performance-Staging.
2. Aplicar accounts-schema.sql, billing-schema.sql, account-rate-schema.sql e commercial-controls-schema.sql nessa ordem. Manter schemas privados fora da Data API e acesso público a users revogado.
3. Configurar DATABASE_URL e JWT_SECRET forte e exclusivo. Ativar ACCOUNTS_ENABLED, SCOPED_SPORTS_ENABLED e BILLING_ENABLED. Manter BILLING_ENFORCE=false durante o teste inicial.
4. Gerar um código aleatório de 32 bytes; guardar apenas SHA256 em ADMIN_SETUP_TOKEN_HASH. Para criar a conta Leandro, definir ADMIN_SETUP_ALLOW_CREATE=true e ADMIN_SETUP_USERNAME=Leandro. Alternativamente, definir ADMIN_SETUP_USER_ID de treinador existente verificado. Não usar conta de regressão como administrador.
5. Em /contas, o proprietário informa o código privado e define pessoalmente uma senha de pelo menos 12 caracteres. O código não é senha permanente. O processo só funciona quando ainda não existe administrador, vincula atletas existentes à organização LB e não redefine outras contas.
6. Remover variáveis ADMIN_SETUP_* após configurar e testar o novo login. Criar organização e convite de outro treinador; criar aluno nesse espaço e convite correspondente.
7. Criar plano, vincular assinatura, confirmar recebimento/cortesia e ativar BILLING_ENFORCE=true. Conferir bloqueio de conta sem licença, prazo vencido, suspensão, renovação duplicada, aluno próprio e tentativa de acesso entre organizações.
8. Validar prontidão, avaliações, treino, execução e IA no serviço implantado antes de promover para produção. Fazer backup e inventário de contas/atletas da produção antes da migração.

## Limites desta entrega
A opção A registra pagamentos confirmados manualmente: o app não cobra cartão nem verifica Pix automaticamente. A base separa planos, assinaturas e lançamentos para implementar checkout e webhooks na opção B. Integração online depende de escolher provedor, conta comercial e credenciais de teste; nenhum pagamento real é executado nesta entrega.
Não habilitar produção sem validar o fluxo no ambiente implantado. As flags ficam desativadas no exemplo para implantação controlada.

## Implantação LBHUB em 03/10/2026

O usuário autorizou a implantação após validar DATABASE_URL pelo Session pooler. O banco LBHUB contém a conta Leandro e 38 atletas. Schemas de contas/cobrança são preparados sem alterar registros esportivos. data-access-schema.sql habilita RLS e revoga acesso direto de clientes às tabelas existentes, pois o login é JWT nativo e o servidor faz autorização usando PostgreSQL.
O primeiro administrador usa a conta Leandro existente, selecionada por ID após conferir username/role. A senha nova é definida pelo proprietário em /contas com código único; não é definida em código nem coletada no chat. BILLING_ENFORCE permanece false até validar esse acesso e os planos. A ativação exige novo login e invalida tokens anteriores.
