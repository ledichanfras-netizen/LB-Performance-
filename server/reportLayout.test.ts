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
  const content = { scrollWidth: 640, scrollHeight: 1600, style: { transform: '' } };
  const viewport = { clientWidth: 640, clientHeight: 800 };
  const page = { dataset: {} as Record<string, string>, querySelector: (selector: string) => selector === '[data-report-content]' ? content : viewport };
  fitReportPage(page as any);
  assert.equal(content.style.transform, 'scale(0.5)');
  // Running again must not progressively shrink an already fitted report.
  fitReportPage(page as any);
  assert.equal(content.style.transform, 'scale(0.5)');
  content.scrollHeight = 400;
  fitReportPage(page as any);
  assert.equal(content.style.transform, 'scale(1)');
});
