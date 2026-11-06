# Histórico de treinos em páginas

## Comportamento

O aplicativo autenticado solicita `/api/ler?history=paged`. Essa resposta inclui o cadastro, avaliações e prontidão, com contagem de treinos e `historyComplete:false`. Não inclui exercícios ou séries do histórico.

O cliente lê os treinos de cada atleta em páginas de 20, com no máximo duas leituras simultâneas. Atletas sem treinos não exigem uma requisição extra. A API aceita de 1 a 50 treinos por página, usando cursor por data e ID, sem OFFSET.

Cada página inclui a prescrição e os resultados completos dos treinos selecionados. Nome, ordem dos exercícios, séries, carga, duração, PSE zero e métricas aeróbias seguem o mesmo mapeamento da leitura completa. A ordem das séries segue os IDs gravados na metainformação quando disponível; registros antigos sem essa informação mantêm a ordem retornada pelo banco.

A resposta inicial e cada página são lidas em transações somente leitura com isolamento REPEATABLE READ. Os cursores ficam vinculados ao atleta e à revisão. Alteração de revisão durante a leitura provoca uma nova busca completa, no máximo uma vez. Arquivados e atletas de outras organizações ficam excluídos. Cada página verifica novamente o escopo da conta.

O estado visível, o cache, a edição, a clonagem, os relatórios e a exportação só recebem o histórico depois da reunião e validação de todas as páginas. A quantidade final precisa coincidir com a contagem inicial, sem IDs duplicados. Falha de rede, versão incompatível ou página incompleta mantém o estado anterior; o servidor rejeita payloads marcados como parciais, inclusive do aluno.

O prazo global do carregamento é de três minutos; as requisições individuais continuam limitadas a 45 segundos. O temporizador é liberado e a leitura é cancelada ao terminar ou exceder o prazo. A rota `/api/ler` sem o parâmetro continua disponível para clientes anteriores.

## Correção adicional de integridade

A normalização de dados antigos não preenche duração ausente com 60 minutos ou PSE ausente com zero. Tonelagem ausente usa apenas séries realmente concluídas; não usa duração × PSE. Tonelagem válida acima de 20 mil kg também não é substituída por carga interna.

## Verificação

A suíte completa passou com 140 testes (oito novos nesta continuação). TypeScript de cliente/servidor e build de produção aprovados.

Testes locais com PostgreSQL embutido e API HTTP validam um histórico sintético com 61 treinos em quatro páginas, datas repetidas, treinos planejados/em andamento/concluídos, exclusão de arquivados, ordem e resultados das séries, PSE zero, métricas aeróbias, exportação em JSON e o contrato de arquivamento do salvamento.

Outros testes cobrem escopo de treinador/aluno, cursores inválidos, alteração de versão, página interrompida, contagem incompleta, leitura legada, histórico vazio, concorrência limitada e descarte de conexão após falha de rollback. Nenhum teste grava dados reais ou consulta serviços externos.

## Limites

- A paginação limita os treinos por consulta/resposta, mas o cliente ainda reúne o histórico completo em memória. Não é uma interface de navegação com carregamento apenas ao rolar a tela.
- Prontidão, avaliações e o salvamento de snapshots continuam completos. Paginar essas áreas e migrar gravações para alterações individuais são melhorias adicionais.
- Uma página pode ser grande quando um único treino tem muitas séries; não há truncamento silencioso.
- Não foram feitos testes em dispositivos Android/iOS físicos, nem uma medição comparativa de latência ou consumo em produção. Testes de rede móvel, teclado, suspensão do PWA e atualização offline nesses dispositivos continuam pendentes.
