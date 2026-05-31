/**
 * Moldura de uma tela externa (Chatwoot/Odoo) embutida no portal. Sem `sandbox`
 * de propósito: os produtos são same-site e precisam de cookies/JS plenos pra
 * sessão SSO funcionar dentro do frame. URL ausente (env não configurada) degrada
 * pra um aviso neutro em vez de um iframe quebrado.
 */
export function EmbeddedFrame({
  src,
  title,
}: {
  src: string | null;
  title: string;
}) {
  if (!src) {
    return (
      <div
        data-testid="embedded-frame-fallback"
        className="flex h-full items-center justify-center p-8 text-center text-s4s-blue"
      >
        <p>Esta área está indisponível neste ambiente.</p>
      </div>
    );
  }
  return (
    <iframe
      data-testid="embedded-frame"
      src={src}
      title={title}
      // `block`: iframe é inline por padrão (vertical-align: baseline) e deixa um
      // gap de ~4px embaixo → barra de rolagem de poucos px → a largura do frame
      // oscila → o ResizeObserver do kanban do Odoo entra em loop e trava a aba.
      className="block h-full w-full border-0"
    />
  );
}
