# Gestão comercial — primeiro incremento

Rota: /assinaturas. API: /api/billing. Desativado por padrão.

## Entrega
Planos com preços em centavos, assinaturas de contas existentes, pagamentos manuais,
cortesias e testes separados da receita; renovação antecipada preserva período pago;
renovação vencida começa no momento do registro; tolerância calculada na leitura.
Renovações são transacionais, serializadas por assinatura e deduplicadas por requestId.
O administrador é autorizado por ID de uma conta real de treinador consultada no banco,
nunca pelo plano recebido no navegador ou pelo token legado sem ID.

## Ativação em staging
1. Backup do banco e confirmação da identidade da conta administrativa.
   Antes de ativar: remover políticas públicas de users e substituir o login fixo;
   um ID autorizado não protege uma conta que pode ser modificada anonimamente.
2. Aplicar server/billing-schema.sql com uma conexão privilegiada ao banco de staging.
   Não expor lb_billing na Data API. Não há acesso para anon/authenticated.
3. Definir BILLING_ADMIN_USER_IDS com os IDs existentes e BILLING_ENABLED=true.
4. Entrar com conta persistida no banco; token legado sem ID não funciona neste módulo.
5. Testar plano, vínculo, renovação, repetição da mesma requestId e acesso de aluno.

## Não é liberação de produção
Não aplica schema automaticamente nem modifica banco remoto.
Não bloqueia APIs esportivas por vencimento nesta fase.
Não implementa isolamento dos atletas por organização: isso precisa anteceder venda a outros treinadores.
Não remove ainda o login legado: a substituição exige provisionar e validar primeiro a conta administrativa.
Não implementa cancelamento, suspensão, histórico na interface, escolha da data de recebimento,
limite de atletas, checkout nem webhooks. O contrato reserva identificadores de provedor.
As regras atuais de acesso direto ao Supabase devem ser corrigidas antes de ativar bloqueio comercial.
Duração inicial é em dias, não meses de calendário. Os períodos são exibidos com horário.

## Próximo incremento
Provisionar login administrativo seguro; organizações e membros; filtrar todas as rotas,
remover caminhos diretos sem autorização e separar cache por conta; depois aplicar validade
nas operações protegidas. Cortesia e pagamento manual permanecem disponíveis com a futura integração online.
