import { Activity, BookOpen, CalendarDays, ChevronDown, ClipboardList, Dumbbell, Heart, LayoutDashboard, Layers, TrendingUp } from 'lucide-react';

export function SystemGuide({ role }: { role: 'coach' | 'athlete' }) {
  const coach = role === 'coach';
  const routine = coach ? [
    { title: 'Confira o dia', text: 'Veja a prontidão, os treinos e as competições antes de orientar seus atletas.' },
    { title: 'Prescreva e ajuste', text: 'Selecione o atleta, organize os exercícios e salve a planilha após cada edição.' },
    { title: 'Acompanhe a resposta', text: 'Cruze os registros de execução, a PSE e as avaliações para orientar os próximos treinos.' },
  ] : [
    { title: 'Antes do treino', text: 'Responda à prontidão do dia com seu sono, fadiga, dores e como está se sentindo.' },
    { title: 'Durante o treino', text: 'Abra a sessão prescrita, confira as orientações e registre o que realmente executou.' },
    { title: 'Ao finalizar', text: 'Informe a duração e a PSE, finalize o treino e confira a confirmação do registro.' },
  ];
  const modules = [
    {
      icon: LayoutDashboard, title: 'Painel Geral', summary: 'O que precisa da sua atenção hoje.',
      steps: coach ? [
        'Selecione o atleta para consultar a prontidão de hoje, os treinos e o resumo da semana.',
        'Confira a Performance LB-X e os resultados disponíveis de IMTP, CMJ e RSI. Abra o histórico da métrica para acompanhar sua evolução.',
        'Use o período e as datas de cada informação: um dado ausente não significa um resultado igual a zero.',
      ] : [
        'Confira sua prontidão, os treinos do dia e o resumo da semana.',
        'Veja seus resultados de força e salto. Em cada métrica, abra o histórico para acompanhar a evolução.',
        'Confira a data da última avaliação para saber a qual momento aquele resultado se refere.',
      ],
    },
    {
      icon: Activity, title: 'Prontidão', summary: 'Seu registro diário de bem-estar.',
      steps: coach ? [
        'Confira se o atleta respondeu na data desejada e consulte as respostas, além do resultado de prontidão.',
        'Observe sono, fadiga, dor, estresse e sintomas relatados junto ao contexto do treino.',
        'Quando informados pela atleta, a fase menstrual e os sintomas também podem ser consultados para apoiar a conversa e os ajustes.',
      ] : [
        'Responda uma vez por dia, de preferência antes da sessão, e use respostas que representem como você está.',
        'Informe sono, fadiga, dor e os demais itens solicitados. Confira o registro no Painel Geral e no histórico.',
        'Se o formulário apresentar a seção menstrual, o preenchimento é opcional. Você pode informar a fase e os sintomas que estiver sentindo.',
      ],
    },
    {
      icon: Dumbbell, title: 'Treinos', summary: coach ? 'Prescrição, edição e acompanhamento.' : 'Execute, registre e finalize sua sessão.',
      steps: coach ? [
        'Escolha o atleta e a data. Organize os exercícios na ordem em que devem ser executados.',
        'Ao trocar um exercício ou alterar séries, repetições, carga e pausa, salve a planilha. Os campos de execução do treino pendente acompanham a prescrição atual.',
        'Em exercícios unilaterais, ative Personalizar por lado para definir séries, repetições ou tempo e carga de cada lado. Escolha o lado inicial e salve a planilha.',
        'Consulte o que foi realizado e a PSE após a finalização. Registros já executados compõem o histórico do atleta.',
      ] : [
        'Abra o treino da data correta e confira exercício, séries, repetições, carga e pausa.',
        'Preencha as séries com o que você realmente realizou. Após uma alteração feita pelo treinador, atualize e reabra o treino antes de iniciar.',
        'Quando houver prescrição por lado, preencha e confirme as séries do lado esquerdo e do direito separadamente, seguindo a ordem indicada.',
        'Ao concluir, informe a duração e a PSE de 0 a 10. A PSE representa o esforço que você sentiu na sessão inteira.',
      ],
    },
    {
      icon: TrendingUp, title: 'Carga', summary: 'Volume registrado e evolução ao longo dos dias.',
      steps: [
        'Consulte as cargas aguda e crônica e o gráfico de equilíbrio de carga (ACWR). Confira o período e as unidades indicadas.',
        'Duração e PSE permitem registrar a carga interna da sessão. Atividades externas também precisam ser registradas para entrar no acompanhamento.',
        coach ? 'Use as faixas do gráfico junto à prontidão, aos sintomas e ao histórico. O ACWR isolado não determina uma decisão de treino ou um diagnóstico.' : 'Mostre ao treinador atividades extras e mudanças no seu bem-estar para que o acompanhamento represente sua rotina.',
      ],
    },
    {
      icon: CalendarDays, title: 'Competições', summary: coach ? 'Jogos e provas de todos os seus atletas.' : 'Seus jogos, provas e torneios.',
      steps: coach ? [
        'Abra Competições para ver o calendário geral, sem precisar selecionar um atleta antes.',
        'Use Mês ou Agenda e filtre por atleta e modalidade. Em Mais filtros, escolha prioridade e situação. No celular, a Agenda é a visualização inicial.',
        'Ao cadastrar, escolha o atleta. Em Detalhes / pré e pós, consulte ou edite os dados. Ao concluir com duração e PSE, a carga da competição entra no acompanhamento.',
      ] : [
        'Cadastre seus jogos e provas com data, horário, modalidade e local. Seu calendário mostra somente os seus eventos.',
        'Alterne entre Mês e Agenda para consultar as competições. Seu treinador acompanha esses registros no calendário geral.',
        'Abra Detalhes / pré e pós para preencher as informações solicitadas. Ao concluir com duração e PSE, a carga da competição entra no acompanhamento.',
      ],
    },
    {
      icon: ClipboardList, title: 'Avaliações', summary: 'Resultados e evolução de cada capacidade.',
      steps: coach ? [
        'Selecione o atleta para registrar e consultar os testes disponíveis, com a data correta de cada avaliação.',
        'Confira as unidades e o protocolo utilizado antes de comparar os resultados. Cada métrica tem sua própria escala no histórico.',
        'Use os resultados junto às demandas da modalidade e ao objetivo do atleta para orientar a prescrição.',
      ] : [
        'Consulte os resultados registrados pelo treinador e as datas das avaliações.',
        'Compare a evolução dentro da mesma métrica. IMTP, CMJ e RSI têm unidades e significados diferentes.',
        'Peça ao treinador a interpretação dos resultados e a relação deles com seus objetivos.',
      ],
    },
    {
      icon: Heart, title: 'DM e Saúde', summary: 'Dores, lesões e acompanhamento registrado.',
      steps: [
        coach ? 'Consulte os registros de saúde do atleta junto aos relatos de dor e às orientações recebidas.' : 'Informe dores e alterações relevantes ao treinador e mantenha os registros de saúde atualizados.',
        'O registro no aplicativo apoia o acompanhamento e não substitui avaliação profissional ou liberação para retorno ao esporte.',
      ],
    },
    ...(coach ? [{
      icon: Layers, title: 'Matriz LB', summary: 'Das avaliações às prioridades de treinamento.',
      steps: [
        'Use as avaliações disponíveis para consultar os achados e as prioridades indicadas pela Matriz LB.',
        'Revise as sugestões de trabalho de acordo com o objetivo, o calendário, os equipamentos e as condições do atleta.',
        'Confira e salve a prescrição resultante antes de disponibilizá-la para execução.',
      ],
    }] : []),
    {
      icon: BookOpen, title: 'Biblioteca de Exercícios', summary: 'Consulta de exercícios e orientações de execução.',
      steps: [
        'Abra a aba Biblioteca de Exercícios nesta área. Busque pelo nome e use os filtros disponíveis.',
        'Expanda o exercício para consultar suas informações e o vídeo, quando disponível.',
        coach ? 'Na prescrição, use a biblioteca para adicionar ou substituir exercícios e confira as séries, repetições, carga e pausa antes de salvar.' : 'Use as orientações para revisar a execução e tire dúvidas com seu treinador antes de adaptar o exercício.',
      ],
    },
  ];

  return (
    <div className="lb-system-guide">
      <header className="lsg-hero">
        <span className="lsg-eyebrow"><BookOpen size={15} /> LB PERFORMANCE · GUIA RÁPIDO</span>
        <h1>O essencial para<br />usar bem o aplicativo.</h1>
        <p>{coach ? 'Do planejamento ao acompanhamento: encontre o próximo passo para orientar seus atletas.' : 'Da prontidão à finalização do treino: registre sua rotina e acompanhe sua evolução.'}</p>
        <span className="lsg-role">{coach ? 'Visão do treinador' : 'Visão do atleta'}</span>
      </header>
      <section className="lsg-routine" aria-label="Rotina de uso">
        {routine.map((item, i) => <div className="lsg-step" key={item.title}><span className="lsg-number">{i + 1}</span><div><h2>{item.title}</h2><p>{item.text}</p></div></div>)}
      </section>
      <section className="lsg-modules" aria-label="Como usar cada módulo">
        <h2>Consulte quando precisar</h2>
        {modules.map(({ icon: Icon, title, summary, steps }) => <details className="lsg-module" key={title}>
          <summary><span className="lsg-module-icon"><Icon size={20} /></span><span className="lsg-module-title"><strong>{title}</strong><span>{summary}</span></span><ChevronDown size={17} className="lsg-chevron" /></summary>
          <ol>{steps.map(step => <li key={step}>{step}</li>)}</ol>
        </details>)}
      </section>
    </div>
  );
}
