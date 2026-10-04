# Mentoria: análise e prescrição pelo treinador

## Comportamento

- Novas associações de conta recebem `ai_enabled=false`. Isso também se aplica ao Treinador Teste existente após a migração.
- Plano gratuito/Pro e assinatura paga não concedem IA. Somente a permissão persistida ou a administração da plataforma concedem acesso.
- Chat, modelagem, busca/prescrição assistida, periodização por IA e criação de avaliação postural automatizada ficam ocultos para contas sem permissão. As oito rotas de IA também retornam 403 antes de chamar o provedor.
- Cálculos de indicadores, gráficos e relatórios de avaliação continuam disponíveis. Eles apoiam a interpretação profissional e não chamam um modelo generativo.
- O editor manual oferece **Raciocínio do treinador**: achado → objetivo → escolha dos exercícios → critério de acompanhamento/reavaliação. O texto é salvo no `trainerNotes` já existente, sem tornar o campo obrigatório ou impedir rascunhos.
- A supervisão integrada usa a mesma permissão de IA do treinador. Ela continua somente leitura.
- Contas autenticadas vazias iniciam sem atletas de demonstração. Exemplos de cache não são incorporados automaticamente aos atletas reais. Nenhum atleta real foi apagado.

## Revisão da mentoria

1. O treinador cadastra o atleta, registra avaliações e identifica os achados relevantes.
2. Define um objetivo, monta o treino pela biblioteca e preenche o raciocínio no editor.
3. O supervisor abre **Visualizar como treinador** e confere os registros e a prescrição. O campo também aparece como observações do treinador na consulta de registros de supervisão.
4. O treinador registra a execução, a prontidão e a resposta ao treino para embasar o próximo ajuste.

Matrícula/turmas, rubrica de avaliação, comentários de devolutiva e calendário de encontros ainda não foram criados nesta etapa. Este fluxo prepara a revisão dos casos reais com os dados já disponíveis.

## Configuração e validação

Aplicar `server/ai-policy-schema.sql`. A coluna fica na tabela privada de associações com RLS e sem acesso para anon/authenticated. Não há liberação automática de IA ao comprar plano, aceitar convite ou terminar prazo; liberações futuras exigem ação administrativa explícita.

O login e cada operação sensível validam a associação ativa e a versão da sessão no banco. Dados de organização nunca usam o cache geral do servidor. Scripts de permissões continuam voltados ao acesso pelo servidor com JWT nativo; não concedem leitura anônima dos atletas.

Validação: testes de contas/assinaturas/escopo e novos testes de negativa padrão, ocultação dos controles, preservação da navegação manual e negativa de acesso quando o banco ou a sessão estão indisponíveis.
