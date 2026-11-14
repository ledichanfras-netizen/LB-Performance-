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

## Cadastro simplificado por calendário

Aplicar `server/billing-calendar-schema.sql` antes desta versão. Os novos campos são opcionais para os planos antigos. Não reescreve pagamentos, cobranças ou prazos já cadastrados.

O formulário reúne aluno, plano cadastrado ou personalizado, duração mensal/trimestral/semestral/anual/por periodização, valor integral e início. As quatro durações regulares usam meses do calendário; periodização usa início e fim explícitos, sem depender de edições do treino. A prévia mostra o último dia incluído. A opção “Já recebi este pagamento” exige data, forma e confirmação e salva plano, cobrança, recebimento e auditoria atomicamente. Sem essa opção, salva cobrança pendente.

As tentativas repetidas do mesmo pedido não duplicam lançamentos. Períodos pagos não podem se sobrepor. Novos períodos precisam resolver cobranças pendentes anteriores antes de substituir condições. Cobranças de periodização exigem um novo período com datas explícitas; não são renovadas silenciosamente por número de dias. O valor informado é integral pelo período; não há parcelamento neste formulário.

Liberação por cortesia e exigência de período pago ficam em opções adicionais. Controles antigos preservam o comportamento anterior; os novos respeitam o controle financeiro global do serviço. Pagamento antecipado de um primeiro período futuro não libera acesso antes da data inicial quando a cobrança é exigida.
