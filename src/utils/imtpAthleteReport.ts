import type { Imtp } from '../types';
import { formatImtpValue, imtpChange, imtpValue } from './imtpAnalysis';

// Input is the verified report view, so unconfirmed legacy metrics stay absent.
// Differences describe the test; they do not diagnose fatigue or prescribe a dose.
export function imtpAthleteReport(current: Imtp, previous?: Imtp) {
  const measures = [
    ['peakForce', 'força máxima', 'kgf'],
    ['relativePeakForce', 'força em relação ao seu peso', 'kgf/kg'],
    ['force100', 'força em 100 ms', 'kgf'],
    ['force200', 'força em 200 ms', 'kgf'],
    ['force300', 'força em 300 ms', 'kgf'],
  ] as const;
  const available = measures.filter(([key]) => imtpValue(current[key]) !== null);
  const changes = measures.flatMap(([key, label]) => {
    const change = imtpChange(current[key], previous?.[key]);
    return change === null ? [] : [{ key, label, change }];
  });
  const declines = changes.filter(item => item.change < 0);
  const maintained = changes.filter(item => item.change >= 0);
  const earlyDecline = declines.some(item => item.key.startsWith('force'));
  const focus = !available.length ? 'Construir sua referência de força'
    : earlyDecline ? 'Acompanhar a força no início do esforço'
    : declines.length ? 'Acompanhar a resposta de força'
    : previous && changes.length ? 'Dar continuidade e acompanhar a evolução'
    : 'Transformar este resultado em um ponto de partida';
  const values = available.map(([key, label, unit]) => `${label}: ${formatImtpValue(current[key])} ${unit}`);
  const comparison = changes.map(({ label, change }) => `${label}: ${change > 0 ? '+' : ''}${change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
  return {
    focus,
    showed: values.length ? `Neste teste, você registrou ${values.join('; ')}.` : 'Não informado: não há medidas de força confirmadas suficientes para uma síntese individual.',
    comparison: comparison.length ? `Em relação ao teste anterior: ${comparison.join('; ')}. São diferenças observadas, que precisam ser confirmadas no acompanhamento.`
      : previous ? 'Não há medidas de força em comum suficientes para descrever sua evolução.'
      : 'Este é seu ponto de partida. Sem avaliação anterior, ainda não podemos afirmar melhora ou queda.',
    meaning: earlyDecline
      ? 'A força medida no início do esforço foi menor em pelo menos um dos tempos avaliados. Vamos observar sua resposta nas sessões antes de decidir se o treino precisa de ajuste.'
      : declines.length
      ? 'Houve uma medida de força menor que no teste anterior. Esse resultado isolado não define perda de desempenho: vamos avaliar como você está respondendo à rotina de treino.'
      : available.length
      ? 'O resultado ajuda a acompanhar a força que você produz neste teste e orientar sua preparação. A resposta nos treinos e no esporte mostrará como esse trabalho está funcionando para você.'
      : 'Precisamos de resultados confirmados para relacionar esta avaliação aos seus objetivos e orientar uma mudança no treino.',
    maintain: maintained.length
      ? `Continuar acompanhando ${maintained.map(item => item.label).join(', ')}: essas medidas não foram menores que no teste anterior. Manter o trabalho previsto pelo treinador até a revisão do plano.`
      : 'Manter a rotina orientada e os registros de esforço e recuperação. Os dados disponíveis não permitem apontar um ponto forte individual com segurança.',
    develop: earlyDecline
      ? 'Revisar com o treinador o trabalho de produção de força no início do esforço e acompanhar esses mesmos tempos na próxima avaliação.'
      : declines.length
      ? 'Revisar com o treinador as medidas que ficaram menores, junto da carga recente e da recuperação, para definir a prioridade do próximo ciclo.'
      : available.length
      ? 'Combinar com o treinador uma meta de força ligada ao seu objetivo esportivo e ao seu histórico, antes de definir progressão de carga.'
      : 'Completar a avaliação para definir sua prioridade individual antes de mudar a prescrição.',
    next: available.length
      ? 'Na próxima revisão do treino, alinhar este foco ao seu objetivo e definir os exercícios, as cargas e a progressão no seu programa. Durante o ciclo, registrar esforço, recuperação e dificuldades nas sessões.'
      : 'Conferir os resultados com o treinador e completar os dados ausentes. A prioridade de treino será definida após essa revisão.',
    followUp: 'Comparar as próximas medidas com seu histórico e acompanhar a resposta nas sessões. A data da reavaliação e a meta serão combinadas com o treinador conforme o calendário e a evolução.',
  };
}
