/** Reset page containers only; keep navigation bars, dialogs and chart scroll positions intact. */
export function resetPageScroll() {
  const containers = new Set<Element>([document.documentElement, document.body]);
  if (document.scrollingElement) containers.add(document.scrollingElement);
  let content: HTMLElement | null = document.querySelector('.lb-app-main');
  while (content) {
    containers.add(content);
    content = content.parentElement;
  }
  for (const container of containers) container.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}
