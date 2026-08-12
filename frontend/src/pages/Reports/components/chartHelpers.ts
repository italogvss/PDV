import type { ReportBasis } from '../../../types/report.types'

export { PAYMENT_METHOD_LABELS } from '../../../constants/payment'
export { formatCompactBRL } from '../../../utils/chart'

/**
 * Frase que explica o regime ativo, anexada ao tooltip de todo gráfico que **responde ao toggle
 * Regime**. Sem isso o usuário vê os números mudarem ao clicar no toggle sem saber o que passou a
 * ser contado — e com crediário a diferença entre os dois regimes é dinheiro de verdade.
 */
export function basisNote(basis: ReportBasis): string {
  return basis === 'cash'
    ? 'REGIME ATUAL: CAIXA — conta só o dinheiro que entrou. Venda à vista entra integral no dia da venda; venda fiado entra em pedaços (a entrada no dia da venda, cada parcela na data em que for recebida, mesmo que a venda seja de meses atrás).'
    : 'REGIME ATUAL: COMPETÊNCIA — conta a venda inteira na data da venda, tenha o dinheiro entrado ou não. Uma venda fiado de R$ 1.000 entra como R$ 1.000 no dia em que foi feita, mesmo sem nada ter sido recebido.'
}

/**
 * Aviso para os gráficos que **não** seguem o toggle: eles são sempre por competência. Sem esse
 * aviso, o usuário troca o regime, vê uns gráficos mudarem e outros não, e desconfia dos números.
 */
export const ACCRUAL_ONLY_NOTE =
  'Este gráfico é sempre por COMPETÊNCIA (data da venda) e não muda com o toggle Regime — uma venda fiado entra integral mesmo sem ter sido recebida.'
