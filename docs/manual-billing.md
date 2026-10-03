# Opção A sobre a base da opção B

O administrador cria planos para aluno e treinador em /assinaturas: valor em centavos, duração em dias, tolerância e limite de atletas. Vincula um usuário ao plano e confirma manualmente um recebimento Pix, cartão externo ou transferência. Cortesias são registradas separadamente de receita.

Cada renovação tem chave de idempotência, transação e bloqueio de assinatura; uma repetição da mesma solicitação não duplica receita nem prazo. O prazo parte do maior valor entre vencimento atual e agora. Suspensão bloqueia acesso; retomada mantém o prazo; cancelamento de renovação mantém o acesso até vencer. Histórico registra pagamentos e ações administrativas.

As tabelas lb_billing.plans, subscriptions, entries e audit_events são privadas, protegidas por RLS e acessadas apenas pelo servidor. A autoridade financeira vem da membership persistida; o administrador não recebe acesso esportivo global.

A opção B poderá adicionar identificação do cliente no provedor, checkout, assinatura recorrente e eventos de webhook únicos/validados. O evento confirmado alimentará a mesma rotina transacional de concessão de prazo. Redirecionamento do navegador nunca será confirmação de pagamento.

A ativação e as variáveis necessárias estão em accounts-rollout.md. Checkout e webhooks de provedor não estão implementados; a entrega atual é cobrança manual.
