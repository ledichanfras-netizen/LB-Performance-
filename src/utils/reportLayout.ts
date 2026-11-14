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
  // A mobile screen must not make the A4 body narrower. Measure in paper pixels.
  const width=viewport.clientWidth,height=viewport.clientHeight;
  if(!(width>0&&height>0))return;
  content.style.minHeight='0';
  const measure=(scale:number)=>{
    content.style.width=`${width/scale}px`;
    content.style.transform=`scale(${scale})`;
    return content.scrollHeight*scale<=height+1 && content.scrollWidth*scale<=width+1;
  };
  let scale=1;
  if(!measure(1)){
    let low=.1,high=1;
    for(let i=0;i<12;i++){const middle=(low+high)/2;if(measure(middle))low=middle;else high=middle;}
    scale=low;
  }
  measure(scale);
  // Short pages distribute their cards over the available body, instead of
  // shrinking the page or leaving a small block floating in the top-left.
  content.style.minHeight=`${height/scale}px`;
  page.dataset.contentScale=String(scale);

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
