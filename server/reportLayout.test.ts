import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReportSheet from '../src/components/ReportSheet';
import { fitReportPage, reportContentScale, REPORT_PAGE } from '../src/utils/reportLayout';

test('short and long report sheets keep identical A4 geometry and retain all content', () => {
  const render = (text: string) => renderToStaticMarkup(React.createElement(ReportSheet, {
    header: React.createElement('header', null, 'Avaliação'),
    footer: React.createElement('footer', null, 'Página 1'),
    children: React.createElement('p', null, text),
  }));
  const short = render('Resultado');
  const longText = 'Observação completa do treinador. '.repeat(300);
  const long = render(longText);
  const pageStyle = (html: string) => /style="([^"]+)"/.exec(html)?.[1];
  assert.equal(pageStyle(short), pageStyle(long));
  assert.match(short, /height:1123px/);
  assert.match(short, /width:794px/);
  assert.ok(long.includes(longText));
  assert.ok(long.indexOf('data-report-footer') > long.indexOf('data-report-content'));
  assert.equal(REPORT_PAGE.width * REPORT_PAGE.pixelRatio, 2382);
  assert.equal(REPORT_PAGE.height * REPORT_PAGE.pixelRatio, 3369);
});

test('content fitting handles vertical and horizontal overflow without enlarging short pages', () => {
  assert.equal(reportContentScale(640, 400, 640, 800), 1);
  assert.equal(reportContentScale(640, 1600, 640, 800), 0.5);
  assert.equal(reportContentScale(1280, 400, 640, 800), 0.5);
  assert.equal(reportContentScale(0, 400, 640, 800), 1);
  assert.equal(reportContentScale(NaN, 400, 640, 800), 1);
});

test('fitting uses unscaled content dimensions even inside a mobile preview', () => {
  const content = { scrollWidth: 640, scrollHeight: 1600, style: { transform: '',width:'',minHeight:'' } };
  const viewport = { clientWidth: 640, clientHeight: 800 };
  const page = { dataset: {} as Record<string, string>, querySelector: (selector: string) => selector === '[data-report-content]' ? content : viewport };
  fitReportPage(page as any);
  assert.ok(Math.abs(Number(page.dataset.contentScale)-.5)<.002);
  assert.ok(parseFloat(content.style.width)>1270);
  // Running again must not progressively shrink an already fitted report.
  fitReportPage(page as any);
  assert.ok(Math.abs(Number(page.dataset.contentScale)-.5)<.002);
  assert.ok(parseFloat(content.style.width)>1270);
  content.scrollHeight = 400;
  fitReportPage(page as any);
  assert.equal(content.style.transform, 'scale(1)');
});

test('long pages reflow to occupy the full body width instead of a narrow scaled column',()=>{
 const style={width:'640px',minHeight:'0',transform:''};
 const content={style,get scrollWidth(){return parseFloat(style.width);},get scrollHeight(){return Math.ceil(1600*640/parseFloat(style.width));}};
 const viewport={clientWidth:640,clientHeight:800};
 const page={dataset:{} as Record<string,string>,querySelector:(selector:string)=>selector==='[data-report-content]'?content:viewport};
 fitReportPage(page as any);const scale=Number(page.dataset.contentScale);
 assert.ok(scale>.7&&scale<.72);assert.ok(Math.abs(parseFloat(style.width)*scale-640)<.1);assert.ok(content.scrollHeight*scale<802);
 const before=style.transform;fitReportPage(page as any);assert.equal(style.transform,before);
});
test('short pages distribute cards over the body while keeping the same A4 sheet size',()=>{
 const content={scrollWidth:640,scrollHeight:200,style:{width:'',minHeight:'',transform:''}};
 const viewport={clientWidth:640,clientHeight:800};const page={dataset:{},querySelector:(s:string)=>s==='[data-report-content]'?content:viewport};
 fitReportPage(page as any);assert.equal(content.style.transform,'scale(1)');assert.equal(content.style.minHeight,'800px');assert.equal(content.style.width,'640px');
});
