# Entrada e carregamento progressivo

## Comportamento

Após autenticar, o cliente solicita `/api/ler?view=dashboard`. Uma única instrução SQL, com snapshot consistente e escopo obrigatório por organização/aluno, reúne cadastros, avaliações, prontidão e os campos de sessões necessários aos indicadores do painel. Datas e cargas das sessões não são truncadas. Não baixa as séries executadas nem a prescrição completa de todos os atletas; os exercícios com dor relevante são incluídos apenas como alertas.

O resultado está explicitamente marcado `historyComplete:false`. O painel não espera a leitura de todos os históricos em páginas. Ao selecionar um atleta (ou entrar como aluno), a interface busca `/api/ler?history=paged&athleteId=...` e as páginas somente desse atleta. Edição, execução e relatórios individuais aguardam a validação de revisão, contagem e duplicações do histórico completo. A lista de atletas permanece independente dos demais históricos.

Dados completos em cache só são reaproveitados quando a revisão coincide com a resposta autorizada atual. A troca de conta limpa o estado visível e restaura apenas seu cache. Respostas da sessão anterior são descartadas. Uma falha de conexão sem cache apresenta erro com nova tentativa, em vez de afirmar que a base está vazia. Havendo cache, o painel permanece disponível com aviso de sincronização pendente.

O prazo da abertura do painel é de 30 segundos; leituras completas solicitadas pelo usuário mantêm um prazo separado de 120 segundos. GETs com 502/503/504 têm até três tentativas limitadas pelo mesmo prazo. O login também tem limite de espera. Os timers são liberados e as requisições canceladas ao terminar.

## Integridade

O cliente rejeita snapshots parciais antes de enviar salvamentos. O servidor mantém os contratos existentes de completude, revisão, organização e prescrição. O carregamento dos detalhes é compartilhado entre solicitações simultâneas do mesmo atleta. Se uma gravação ocorrer durante a leitura, a resposta não substitui os dados editados.

Backup e análise global por IA carregam e verificam os registros completos sob demanda. Não exportam silenciosamente resumos. Clonagem para um atleta ainda não aberto, alterações em lote e calendário hidratam o cadastro antes da gravação. Reavaliação e geração de periodização relêem apenas o atleta envolvido.

Clientes anteriores continuam usando as rotas de leitura completa/paginada existentes. Não houve migração de esquema, alteração de plano ou redução das verificações de autenticação.

## Verificação

Testes locais com PostgreSQL embutido verificam a única instrução SQL, os escopos de treinador/aluno, arquivados, base vazia, alertas de dor, equivalência dos indicadores de carga e ausência de séries/prescrição no resumo. Testes adicionais cobrem reaproveitamento por revisão, recusa de snapshots parciais e paginação exclusiva do atleta selecionado. A suíte completa passou com 182 testes.

A conferência no navegador passou nos layouts de 390, 768 e 1280 pixels. Validou login até o painel sem requisições de histórico, abertura exclusiva do atleta selecionado, 503 inicial com nova tentativa, cache disponível, falha no detalhe do aluno e backup que aguarda e inclui a prescrição completa. Utilizou contas e respostas sintéticas, sem gravações no banco real. O tempo final em dispositivos físicos e redes móveis depende das condições de uso; não há promessa de latência fixa. Prontidão, avaliações e campos escalares das sessões ainda são lidos integralmente na consulta inicial para preservar os indicadores existentes; podem ser resumidos no servidor em uma evolução futura.
