import React, { useState, useLayoutEffect, useRef, useEffect, FC } from "react";
import { toJpeg } from "html-to-image";
import { toast } from "react-hot-toast";
import { Printer, Download, BookOpen, ChevronRight, X } from "lucide-react";
import { Athlete } from "../types";

export interface ReportBlock {
  id: string;
  section?: string; // If specified, used for TOC
  forcePageBreak?: boolean; // Force start of a new page
  content: React.ReactNode;
}

interface DynamicReportProps {
  athlete: Athlete;
  reportTitle: string;
  reportSubTitle: string;
  extraStats?: { label: string; value: string | number }[];
  blocks: ReportBlock[];
  onClose: () => void;
  technicalResponsibleName?: string;
  technicalResponsibleCred?: string;
  hideTOC?: boolean;
}

// Fixed Header for every report page with green background and full bleed (bleed to borders)
export const ReportHeader: FC<{
  title: string;
  subTitle: string;
  athlete: Athlete;
  date: string;
  extraStats?: { label: string; value: string | number }[];
}> = ({ title, subTitle, athlete, date, extraStats }) => (
  <div className="bg-emerald-600 -mx-[20mm] -mt-[20mm] p-8 mb-8 flex justify-between items-end relative overflow-hidden shrink-0 text-left">
    {/* Subtle design gradient overlays */}
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-700/30 to-transparent pointer-events-none"></div>
    
    <div className="relative z-10 w-full">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-13 h-13 rounded-2xl bg-slate-900 flex items-center justify-center p-1.5 shadow-md border border-emerald-400/30 shrink-0">
          <img
            src="/pwa-192x192.svg"
            className="w-full h-full object-contain"
            alt="Logo"
          />
        </div>
        <div>
          <h4 className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em] leading-none mb-1">
            Elite Performance Lab
          </h4>
          <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
            {title}
          </h3>
          <p className="text-[8px] font-black text-white/70 uppercase tracking-[0.4em] mt-1.5 leading-none">
            {subTitle}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-5 mt-4 pt-4 border-t border-white/10">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">Atleta</span>
          <span className="text-xs font-black text-white uppercase italic">{athlete.name}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5 font-bold">Data de Emissão</span>
          <span className="text-xs font-black text-white uppercase italic">{date}</span>
        </div>
        {extraStats?.map((stat, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">{stat.label}</span>
            <span className="text-xs font-black text-white uppercase italic">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Fixed Footer for every report page
export const ReportFooter: FC<{
  pageNumber: number;
  totalPages: number;
  technicalResponsibleName?: string;
  technicalResponsibleCred?: string;
}> = ({
  pageNumber,
  totalPages,
  technicalResponsibleName = "Prof. Leandro Barbosa",
  technicalResponsibleCred = "036202-G/PR"
}) => (
  <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center bg-white shrink-0 text-left">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center p-1 shadow-lg border border-slate-800 shrink-0">
        <img
          src="/pwa-192x192.svg"
          className="w-full h-full object-contain"
          alt="LB"
        />
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">
          Responsável Técnico
        </p>
        <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">
          {technicalResponsibleName} ({technicalResponsibleCred})
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">
        Página {pageNumber} de {totalPages}
      </p>
      <div className="flex items-center justify-end gap-2">
        <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          LB HUB v3.0 • ELITE PERFORMANCE
        </p>
      </div>
    </div>
  </div>
);

export const DynamicReportEngine: FC<DynamicReportProps> = ({
  athlete,
  reportTitle,
  reportSubTitle,
  extraStats,
  blocks,
  onClose,
  technicalResponsibleName,
  technicalResponsibleCred,
  hideTOC = false
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const measurerRef = useRef<HTMLDivElement>(null);
  
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [isMeasuring, setIsMeasuring] = useState(true);
  const [paginatedPages, setPaginatedPages] = useState<ReportBlock[][]>([]);
  const [tocSections, setTocSections] = useState<{ name: string; page: number }[]>([]);
  
  const reportDate = new Date().toLocaleDateString("pt-BR");

  // USABLE HEIGHT CALCULATION:
  // A4 Page Height = 297mm.
  // 1mm = 3.7795px (at 96 DPI screen scaling for standard PDF generation)
  // Total A4 Height = 1122.5px.
  // Margins top/bottom: 20mm + 20mm = 40mm = 151px.
  // Header: ~180px.
  // Footer: ~70px.
  // Usable content area height = 1122.5px - 151px - 180px - 70px = 721.5px.
  // We use 680px to be absolutely safe and avoid unwanted blank overflows, leaving
  // a small robust buffer to keep high-quality header/footers without clipping.
  const maxContentHeight = 680;

  // Measure block heights in a layout effect to get layout-ready pixel sizes
  useLayoutEffect(() => {
    if (!measurerRef.current) return;
    
    const heights: Record<string, number> = {};
    const children = measurerRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const blockId = child.dataset.blockId;
      if (blockId) {
        // Measure exact height of each block
        heights[blockId] = child.getBoundingClientRect().height;
      }
    }
    
    setMeasuredHeights(heights);
    setIsMeasuring(false);
  }, [blocks]);

  // Once heights are measured, distribute blocks across pages
  useEffect(() => {
    if (isMeasuring || Object.keys(measuredHeights).length === 0) return;

    const computedPages: ReportBlock[][] = [];
    let currentPage: ReportBlock[] = [];
    let currentPageHeight = 0;

    // Filter unique sections for TOC calculation
    const sections: string[] = [];
    blocks.forEach((b) => {
      if (b.section && !sections.includes(b.section)) {
        sections.push(b.section);
      }
    });

    const hasMultipleSections = !hideTOC && sections.length >= 2;
    // Page index offset: if there is an index page, actual content starts on Page 2
    const firstContentPageNum = hasMultipleSections ? 2 : 1;

    blocks.forEach((block) => {
      const blockHeight = measuredHeights[block.id] || 150; // Fallback default height
      
      // space-y-6 adds 24px top margin to every block after the first on the page
      const spacing = currentPage.length > 0 ? 24 : 0;
      const projectedHeight = currentPageHeight + blockHeight + spacing;

      // Start a new page if:
      // 1. Force break is requested
      // 2. Or, adding this block exceeds the maximum content height limit
      const needsNewPage = 
        block.forcePageBreak || 
        (projectedHeight > maxContentHeight && currentPage.length > 0);

      if (needsNewPage) {
        computedPages.push(currentPage);
        currentPage = [block];
        currentPageHeight = blockHeight; // First block on new page, so spacing is 0
      } else {
        currentPage.push(block);
        currentPageHeight = projectedHeight;
      }
    });

    if (currentPage.length > 0) {
      computedPages.push(currentPage);
    }

    // Calculate TOC entries with their page numbers
    const computedToc: { name: string; page: number }[] = [];
    const blockToPageMap: Record<string, number> = {};

    computedPages.forEach((pageBlocks, pageIndex) => {
      const actualPageNum = firstContentPageNum + pageIndex;
      pageBlocks.forEach((block) => {
        blockToPageMap[block.id] = actualPageNum;
        if (block.section && !computedToc.some((t) => t.name === block.section)) {
          computedToc.push({ name: block.section, page: actualPageNum });
        }
      });
    });

    setTocSections(hideTOC ? [] : computedToc);
    setPaginatedPages(computedPages);
  }, [isMeasuring, measuredHeights, blocks, hideTOC]);

  const handlePrint = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      toast.error(
        "💡 Para Imprimir / Gerar PDF:\n\nComo você está no visualizador do AI Studio, o navegador bloqueia a impressão nesta janela.\n\nPor favor, abra o aplicativo em uma nova aba clicando no ícone ↗️ (abrir em nova janela) no canto superior direito do AI Studio, e clique em Imprimir por lá!",
        {
          duration: 12000,
          position: "top-center",
          style: {
            maxWidth: "500px",
            background: "#0f172a",
            color: "#ffffff",
            border: "2px solid #10b981",
            fontSize: "14px",
            lineHeight: "1.6",
            padding: "18px",
            borderRadius: "16px",
          }
        }
      );
    } else {
      window.print();
    }
  };

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Otimizando e preparando páginas A4 para exportação...");
    try {
      const pages = reportRef.current.querySelectorAll(".report-page");
      const athleteSlug = athlete.name.toLowerCase().replace(/\s+/g, "-");

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await toJpeg(page, {
          quality: 0.92,
          backgroundColor: "#ffffff",
          pixelRatio: 2, // Optimized ratio for crisp text and smaller export size
        });
        const link = document.createElement("a");
        link.download = `relatorio-${athleteSlug}-pag-${i + 1}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 450));
      }
      toast.success("Todas as páginas foram geradas com sucesso!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar imagens das páginas.", { id: toastId });
    }
  };

  const totalPages = paginatedPages.length + (tocSections.length >= 2 ? 1 : 0);

  return (
    <div className="fixed inset-0 z-[1100] flex items-start justify-center bg-slate-900/95 backdrop-blur-xl overflow-y-auto p-0 md:p-4 no-scrollbar">
      {/* Hidden measurer container - matches exact width (170mm) of A4 text area for 100% accuracy */}
      <div 
        ref={measurerRef}
        className="absolute pointer-events-none opacity-0"
        style={{ width: "170mm", top: "-9999px", left: "-9999px" }}
      >
        {blocks.map((block) => (
          <div key={block.id} data-block-id={block.id} className="w-full break-inside-avoid mb-6">
            {block.content}
          </div>
        ))}
      </div>

      <div className="max-w-5xl w-full mx-auto md:my-10 h-full md:h-auto font-sans relative">
        {/* Printable/exportable container */}
        <div ref={reportRef} className="print-container bg-slate-150/10 md:bg-transparent">
          
          {/* 1. AUTOMATIC INDEX PAGE (TOC) - Shown only when report has multiple sections */}
          {tocSections.length >= 2 && (
            <div
              className="report-page page-break bg-white text-slate-950 shadow-2xl my-10 mx-auto overflow-hidden relative text-left"
              style={{ width: "210mm", height: "297mm", padding: "20mm", boxSizing: "border-box" }}
            >
              {/* Decorative top green border */}
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>

              <div className="flex flex-col h-full justify-between" style={{ height: "257mm" }}>
                <div>
                  <ReportHeader
                    title={reportTitle}
                    subTitle="ÍNDICE DE SEÇÕES & ESTRUTURA METODOLÓGICA"
                    athlete={athlete}
                    date={reportDate}
                    extraStats={extraStats}
                  />

                  <div className="space-y-8 mt-12">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                        Índice Geral do Relatório
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Este documento técnico de alta performance está organizado em módulos lógicos indivisíveis. 
                      Abaixo consta a localização exata de cada seção analítica para guiar a tomada de decisão da comissão técnica.
                    </p>

                    <div className="space-y-4 pt-4">
                      {tocSections.map((sec, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/40 hover:bg-emerald-50/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                              {sec.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 font-mono">Pág.</span>
                            <span className="text-xs font-black text-emerald-600 font-mono bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                              {sec.page}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Metodological Disclaimer */}
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl mt-8">
                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-2">
                        Nota de Confidencialidade e Metodologia
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                        As informações contidas neste laudo são geradas por algoritmos cinéticos, testes de força reativa (RSI), avaliações antropométricas e de bioimpedância em laboratório, sob a chancela da LB Elite Performance. Uso estritamente profissional e confidencial.
                      </p>
                    </div>
                  </div>
                </div>

                <ReportFooter 
                  pageNumber={1} 
                  totalPages={totalPages} 
                  technicalResponsibleName={technicalResponsibleName}
                  technicalResponsibleCred={technicalResponsibleCred}
                />
              </div>
            </div>
          )}

          {/* 2. DYNAMICALLY PAGINATED PAGES */}
          {!isMeasuring && paginatedPages.map((pageBlocks, pageIndex) => {
            const pageNum = (tocSections.length >= 2 ? 2 : 1) + pageIndex;
            return (
              <div
                key={pageIndex}
                className="report-page page-break bg-white text-slate-950 shadow-2xl my-10 mx-auto overflow-hidden relative text-left"
                style={{ width: "210mm", height: "297mm", padding: "20mm", boxSizing: "border-box" }}
              >
                {/* Decorative top green border */}
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>

                <div className="flex flex-col h-full justify-between" style={{ height: "257mm" }}>
                  <div className="flex-grow">
                    <ReportHeader
                      title={reportTitle}
                      subTitle={reportSubTitle}
                      athlete={athlete}
                      date={reportDate}
                      extraStats={extraStats}
                    />

                    {/* Content Blocks for this specific page */}
                    <div className="space-y-6">
                      {pageBlocks.map((block) => (
                        <div key={block.id} className="w-full break-inside-avoid">
                          {block.content}
                        </div>
                      ))}
                    </div>
                  </div>

                  <ReportFooter 
                    pageNumber={pageNum} 
                    totalPages={totalPages} 
                    technicalResponsibleName={technicalResponsibleName}
                    technicalResponsibleCred={technicalResponsibleCred}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons Row / Controls (no-print) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 no-print pb-20 px-4 md:px-0 font-sans max-w-5xl w-full mx-auto">
          <button
            onClick={handleExportJpeg}
            className="flex-grow flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Download size={20} /> Baixar Páginas (JPEG)
          </button>
          <button
            onClick={handlePrint}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 cursor-pointer font-sans"
          >
            <Printer size={20} /> Imprimir / PDF
          </button>
          <button
            onClick={onClose}
            className="flex-grow flex items-center justify-center gap-2 bg-slate-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 cursor-pointer font-sans"
          >
            <X size={20} /> Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
