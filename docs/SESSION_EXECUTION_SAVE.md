# Salvamento da execução e cards escuros

## Mudanças

A finalização e a correção de uma sessão concluída usam `PUT /api/athletes/:id/workouts/:workoutId/execution`. O cliente envia apenas data, duração, PSE, feedback, dor e resultados das séries do treino atual, com a revisão original do treino. Não reenvia cadastro, avaliações, imagens ou treinos anteriores.

Antes de transmitir resultados, o cliente consulta a disponibilidade do serviço por até dois minutos. Essas consultas são GETs pontuais durante o salvamento; não há polling para manter a hospedagem ativa enquanto o aluno treina. Cada gravação continua com limite de 45 segundos. O plano gratuito do Render pode suspender o serviço quando não há tráfego; a retomada é um fator possível de demora, não uma causa comprovada para cada timeout.

O servidor valida organização, aluno, exercícios, IDs das séries e revisão. Grava séries e métricas em lote dentro de uma transação, com prazos para bloqueios e comandos SQL. A prescrição permanece no banco; apenas os resultados e a dor são atualizados. A tonelagem é calculada com a prescrição existente e as séries concluídas. Outros treinos, avaliações e prontidão não são regravados.

Se a resposta de uma gravação confirmada se perder, uma repetição com resultados idênticos recebe a confirmação já existente, sem nova gravação. Conteúdo divergente com revisão antiga retorna conflito. Falha em qualquer etapa provoca rollback e não produz confirmação de sucesso.

A interface bloqueia envios duplicados durante a espera e mantém o rascunho até receber uma confirmação válida, inclusive para correções em sessões já concluídas. Uma versão otimista do estado local não é tratada como nova revisão do servidor.

Os cards de data, duração, intensidade, PSE e observações da finalização usam fundo azul escuro, campos escuros e contraste claro. As regras ficam limitadas à finalização da sessão e prevalecem sobre as regras globais do tema claro. A seleção de PSE permanece visível.

## Verificação e limites

A suíte completa passou com 150 testes, além da checagem TypeScript e do build de produção. Dez testes novos cobrem 120 séries em uma gravação, quantidade limitada de comandos, data/duração/PSE, PSE zero, métricas aeróbias, preservação da prescrição e do histórico, isolamento entre contas, revisão antiga, resposta perdida/repetição, rollback e preservação de rascunhos. Cobrem ainda serviço iniciando com HTML, falha temporária e prazo de reconexão.

Os testes usam PostgreSQL embutido e API HTTP local, sem gravações em atletas reais. Não medem latência na hospedagem real e não substituem teste em Android/iOS físicos. Os demais cadastros e a edição da prescrição continuam usando o salvamento de snapshots existente.

A publicação anterior de paginação terminou em timeout de ativação no Render, com build concluído. Os logs consultados não estabeleceram a causa exata dessa falha. A disponibilidade da nova versão precisa ser confirmada após sua própria publicação; build e testes aprovados não comprovam ativação.
