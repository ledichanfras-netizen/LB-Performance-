import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import { fitReportPage, REPORT_PAGE } from '../utils/reportLayout';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Props = {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
};

/** Shared A4 canvas for screen previews, JPEG capture and browser printing. */
const ReportSheet = forwardRef<HTMLDivElement, Props>(function ReportSheet({ children, header, footer, className = '' }, forwardedRef) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  useBrowserLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    let frame = 0;
    let disposed = false;
    const fit = () => fitReportPage(page);
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    const observer = new ResizeObserver(schedule);
    for (const node of page.querySelectorAll<HTMLElement>('[data-report-content], [data-report-viewport], [data-report-header], [data-report-footer]')) observer.observe(node);
    fit();
    document.fonts?.ready.then(() => { if (!disposed) schedule(); });
    window.addEventListener('beforeprint', fit);
    window.addEventListener('afterprint', schedule);
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('beforeprint', fit);
      window.removeEventListener('afterprint', schedule);
    };
  }, [children, header, footer]);
  return <div ref={node => {
    pageRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }} className={`report-page lb-a4-sheet page-break bg-white text-slate-950 shadow-2xl my-10 mx-auto relative text-left ${className}`}
    style={{ width: REPORT_PAGE.width, height: REPORT_PAGE.height, minHeight: REPORT_PAGE.height, maxHeight: REPORT_PAGE.height, padding: '20mm', boxSizing: 'border-box' }}>
    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100" />
    <div className="lb-a4-frame">
      {header && <div data-report-header="" className="lb-a4-header">{header}</div>}
      <div data-report-viewport="" className="lb-a4-viewport">
        <div data-report-content="" className="lb-a4-content">{children}</div>
      </div>
      <div data-report-footer="" className="lb-a4-footer">{footer}</div>
    </div>
  </div>;
});

export default ReportSheet;
