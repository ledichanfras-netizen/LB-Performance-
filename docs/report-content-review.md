# Relatórios: uso da página e síntese de conteúdo

A folha A4 permanece em 794 × 1123 px (JPEG 2382 × 3369). Cabeçalho e rodapé ficam fora do ajuste do corpo. Os grids da folha usam colunas de papel, independentemente da largura do celular. Quando o corpo precisa de ajuste, sua largura lógica é compensada antes da escala, mantendo a área impressa preenchida horizontalmente. Páginas curtas distribuem os cards na área útil; textos maiores e a retirada de blocos repetidos reduzem a necessidade de encolhimento.

| Relatório | Conteúdo prioritário preservado | Simplificação |
|---|---|---|
| Drop Jump | RSI, contato, altura, altura da caixa e histórico individual | Retirados score composto, rigidez estimada, voo/contato repetido, quadrantes, zonas genéricas e metas percentuais automáticas. Página 2 com treinador, atleta/família, prioridades e acompanhamento. |
| VO₂máx | VO₂máx, VAM, limiar e FC registrados, recuperação e histórico | Retirados score, quadrantes, painel repetido e metas genéricas; limiar e FC de limiar ausentes não são preenchidos com percentuais estimados. |
| IMTP | Força absoluta e relativa, tabela de força/RFD/impulso em 100/200/300 ms, histórico e devolutiva ao atleta | Retirados cards que repetiam dados já presentes na tabela técnica. |
| CMJ/Abalakov | Altura, potência registrada, demais medidas úteis do salto, comparação e orientações | Retirado o destaque do tempo de voo, redundante com a altura; layout A4 independente do celular. Mantida distinção entre testes e preservada potência média quando registrada. |
| Força isométrica | Valores D/E, assimetrias, I/Q e detalhes temporais quando medidos | Retirada a altura fixa de 210 mm no corpo, que forçava encolhimento; colunas e texto adaptados à folha. |
| Velocidade | Tempos por distância, velocidade, evolução e orientações | Retirado o painel motivacional que repetia explicações gerais sobre velocidade. |
| Bioimpedância | Composição corporal, massa muscular/gordura, hidratação, segmentação e evolução | Retirados IMC/TMB e idade metabólica como destaques da devolutiva; permanecem nos dados cadastrados. |
| Bem-estar | Último check-in e lesões efetivamente registradas | Retirados diagnósticos, tratamentos e conclusões clínicas geradas a partir de textos padrão. |
| Carga de treino | Carga, ACWR, prontidão, tendências e próximos passos | Retirado o bloco metodológico repetitivo; legenda identifica duração × PSE e a leitura não é chamada de diagnóstico clínico. |
| Análise integrada/IA | Síntese, análise, prioridades e matriz | Retirada ficha de identificação repetida e índice automático por padrão. |
| Anamnese | Dados registrados e observações | Compartilha o mesmo ajuste de largura da folha e a tipografia mínima. |

Os registros, formulários de avaliação e dados históricos não foram apagados. Observações do treinador são texto, sem interpretação de HTML. Ausências no histórico compacto aparecem como “Não informado”.

Validação: testes de dimensões A4, preenchimento da largura após ajuste, estabilidade em chamadas repetidas, distribuição do corpo em páginas curtas e manutenção das janelas e orientações do IMTP; TypeScript e build de produção. Não houve homologação visual de relatórios de atletas por sessão autenticada no navegador.
