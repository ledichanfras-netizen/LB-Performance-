# Supervisão de treinadores

A conta administradora acessa `/supervisao`. A supervisão é somente leitura e exige vínculo explícito entre o administrador e cada organização. O treinador continua acessando apenas a própria organização no aplicativo. Atletas não são transferidos ou duplicados.

## Uso

1. Entre na conta administradora e escolha **Supervisão de treinadores**.
2. Em **Organizações e vínculos**, vincule a organização participante da mentoria. Desvincular interrompe as próximas consultas.
3. Selecione organização, atleta e conteúdo: perfil, prontidão, sessões externas, treino com exercícios/séries ou avaliações.
4. Consulte o histórico em páginas de 50 registros. **Meus atletas** retorna à organização original.

O convite de treinador não concede supervisão automaticamente. O administrador faz o vínculo explicitamente. Esta etapa não cria matrícula de mentoria ou cobrança automática.

## Instalação

Aplicar `server/supervisor-schema.sql` após o esquema de contas. As tabelas ficam no esquema privado `lb_accounts`, com RLS e sem privilégios para PUBLIC/anon/authenticated. A API usa autenticação nativa do servidor, valida associação ativa e administração persistida a cada pedido; o vínculo é consultado no banco. Os registros de atletas são filtrados por organização e atletas arquivados ficam excluídos.

Os únicos métodos de dados supervisionados são GET. PUT altera apenas o vínculo do próprio administrador e grava auditoria na mesma transação. Nenhum JWT novo ou troca da organização da sessão é necessário. Os registros ficam apenas na memória da página; nenhuma coleção supervisionada é escrita no cache de atletas do aplicativo.

## Validação

`npm run test:accounts`, `npm run lint`, `npm run build`. Testes PostgreSQL/HTTP cobrem ausência de vínculo, treinador comum, atleta de outra organização, conteúdo permitido, exercícios/séries, revogação, tentativas de alteração e bloqueio do acesso anônimo às tabelas privadas.
