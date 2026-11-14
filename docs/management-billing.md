# Central de Gestão e mensalidades

A Central mantém superfícies claras, texto escuro e ações verdes no modo claro, inclusive Banco & Backup e o quadro de explicação. O modo escuro preserva sua paleta.

Em Mensalidades, o administrador cadastra conta, valor total e duração em uma etapa; busca alunos ou treinadores; edita e libera acessos; prepara um novo período; gera a próxima cobrança e registra recebimentos integrais com forma, data e observação. Os valores e datas de cobranças emitidas são imutáveis. Uma cobrança pendente existente é reapresentada, sem duplicar. Novas condições podem ser usadas após cancelar a pendente.

Gerar cobrança não cria receita nem altera acesso. Receber grava cobrança, lançamento, auditoria e validade em uma transação. Repetir a confirmação não gera novo lançamento. Cortesia/teste exige valor zero. Não há débitos nem envio de mensagens. Os recebimentos são manuais; este módulo não adiciona Checkout Mercado Pago, OAuth, parcelamento ou cobranças por treinador. As permissões financeiras anteriores (administrador) são preservadas.

## Implantação

Aplicar primeiro as migrações comerciais existentes, inclusive `billing-management-schema.sql`, `commercial-controls-schema.sql` e `billing-dates-schema.sql`. Depois aplicar `server/billing-invoices-schema.sql` em staging e verificar o fluxo antes de produção. O esquema permanece privado com RLS e sem acesso anon/authenticated. Nenhum plano, pagamento ou bloqueio é criado automaticamente na migração.

A aplicação deve receber a migração de cobranças antes da versão nova de interface. Não criar cobranças reais para testar; usar banco isolado e os testes automatizados.

## Validação

`node --import tsx --test --test-concurrency=1 server/billingInvoices.test.ts server/billing.test.ts server/database.test.ts`

`npm run lint` e `npm run build`.
