/**
 * Dispara o diálogo de impressão do navegador. Quem monta o que sai no papel é o
 * `@media print` do componente impresso (ver components/SaleReceipt) — aqui só o gatilho.
 *
 * "Salvar como PDF" é uma opção do próprio diálogo do sistema, então não há biblioteca de
 * PDF no bundle: o comprovante é o mesmo componente React renderizado com o tema do app.
 */
export function printDocument(): void {
  // Espera o layout de impressão estar aplicado antes de abrir o diálogo — sem isso o
  // Chrome ocasionalmente captura o DOM anterior quando a impressão vem logo após um render.
  requestAnimationFrame(() => window.print())
}
