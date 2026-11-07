import { toJpeg } from 'html-to-image';

export const REPORT_PAGE = { width: 794, height: 1123, pixelRatio: 3 } as const;

export function reportContentScale(width: number, height: number, availableWidth: number, availableHeight: number): number {
  if (![width, height, availableWidth, availableHeight].every(value => Number.isFinite(value) && value > 0)) return 1;
  return Math.min(1, availableWidth / width, availableHeight / height);
}

/** Fit the body only: headers, page dimensions, margins and footers stay fixed. */
export function fitReportPage(page: HTMLElement): void {
  const viewport = page.querySelector<HTMLElement>('[data-report-viewport]');
  const content = page.querySelector<HTMLElement>('[data-report-content]');
  if (!viewport || !content) return;
  // offset/client sizes ignore any mobile preview transform on an ancestor.
  const scale = reportContentScale(content.scrollWidth, content.scrollHeight, viewport.clientWidth, viewport.clientHeight);
  content.style.transform = `scale(${scale})`;
  page.dataset.contentScale = String(scale);
}

export async function toReportJpeg(page: HTMLElement): Promise<string> {
  await document.fonts?.ready;
  // Wait for logos and illustrations as well as fonts before measuring/capturing.
  await Promise.all(Array.from(page.querySelectorAll('img')).map(img => img.decode?.().catch(() => undefined)));
  fitReportPage(page);
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  return toJpeg(page, {
    quality: 0.96, backgroundColor: '#ffffff', pixelRatio: REPORT_PAGE.pixelRatio,
    width: REPORT_PAGE.width, height: REPORT_PAGE.height,
    canvasWidth: REPORT_PAGE.width, canvasHeight: REPORT_PAGE.height,
    style: { width: `${REPORT_PAGE.width}px`, height: `${REPORT_PAGE.height}px`, margin: '0', transform: 'none' },
  });
}
