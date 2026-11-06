# Correções da segunda revisão

## Implementado

- Rascunhos de outra versão da prescrição não são substituídos automaticamente. A tela permite recuperar resultados compatíveis, exportar o original ou continuar com a nova prescrição. Ao gravar a nova versão, o original é preservado em uma chave de recuperação. Se a cópia falhar, a gravação não substitui o original.
- A retomada usa o tempo registrado, sem adicionar o intervalo com o aplicativo fechado. Interrupções superiores a dois minutos exigem confirmação da duração antes da conclusão.
- O service worker retorna HTML somente para navegação. Um módulo JavaScript indisponível offline recebe erro explícito, e arquivos já armazenados continuam disponíveis.
- O salvamento de snapshots do treinador exige identificação e todas as coleções principais, além da lista de exercícios de cada treino. Omissão não é convertida automaticamente em coleção vazia. Snapshots declarados parciais são recusados antes das transações.
- Requisições têm prazo máximo de 45 segundos, incluindo a leitura do corpo. Uma requisição travada deixa de bloquear indefinidamente a fila de salvamento. Timeout não gera repetição automática de uma gravação de resultado incerto.
- A análise geral por IA recebe somente o ID do atleta. O servidor verifica o escopo e seleciona campos esportivos explícitos, sem nome, data de nascimento, sintomas menstruais ou notas de psicologia. O resultado não apresenta probabilidade individual de lesão gerada pelo modelo.
- PostgreSQL remoto exige validação de certificado e hostname. Parâmetros SSL da URL não podem desligar essa verificação. `DATABASE_SSL_CA` aceita o certificado PEM do provedor; em Supabase, quando não configurado, o servidor usa a CA pública incluída no código, com fingerprint SHA-256 validado. Certificado inválido não provoca fallback inseguro.
- Monotonia e strain usam sete dias de calendário e somam todas as sessões do mesmo dia. Dias sem registro não são inventados como descanso; falta de cobertura e desvio padrão zero produzem indicador não calculável.
- ACWR exclui datas futuras e exige histórico com início anterior ou igual ao começo da janela de 28 dias, carga crônica positiva e duração/PSE válidas nas sessões da janela. Dados insuficientes não produzem ACWR 1 ou classificação estável. A interface e os consumidores tratam o resultado nulo.
- PSE zero é um registro válido no contexto esportivo enviado à IA.

## Validação

- 132 testes locais passaram, incluindo dez novos testes de regressão.
- TypeScript de front-end e servidor aprovado.
- Build de produção aprovado. Persistem avisos de CSS e tamanho do bundle que já existiam.
- Testes locais não acessam serviços externos nem alteram dados reais de atletas.

## Pendente e limites

1. **Paginação implementada em continuação:** o aplicativo agora usa `/api/ler?history=paged` e reúne os treinos em páginas antes de atualizar seu estado. A rota legada completa continua compatível. Detalhes e limites estão em [PAGED_HISTORY.md](PAGED_HISTORY.md).
2. O teste automatizado do service worker verifica respostas offline, mas não equivale à validação completa em Android/iOS com atualização de versão e perda de rede.
3. A validação TLS local usa certificados e respostas simuladas. A disponibilidade da conexão configurada deve ser confirmada na publicação. A CA pública incluída expira em abril de 2031 e precisa acompanhar eventual rotação do provedor.
4. ACWR descreve **cargas registradas**. Ter um registro antigo não comprova cobertura de todos os dias; ausência de sessão não prova descanso. A relação não é probabilidade de lesão nem autorização automática de treino.
5. A validação do contrato reduz o risco de omissão acidental. Não comprova, sozinha, que uma lista explicitamente vazia representa uma exclusão intencional; revisão de sincronização e testes entre dispositivos continuam necessários.
