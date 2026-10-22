// README 화면 캡처: 샘플 빌드를 띄운 뒤 같은 시드(2026)로 화면을 찍는다. 모든 주소에 season=sample 을
// 붙이므로 로컬에 실데이터가 있어도 가상 선수만 찍힌다 (핵심 규칙 1).
// 시계는 Playwright 가짜 시계로 돌려서 실제 시간과 상관없이 같은 장면이 나온다.
//
//   VITE_DATA=sample npm run build && npx vite preview --port 4173     (PowerShell: $env:VITE_DATA = 'sample'; …)
//   npm i --no-save playwright && node docs/readme/capture.mjs [http://localhost:4173/]
//
// race-100m.gif 는 ffmpeg 가 있어야 만든다.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const OUT = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? 'http://localhost:4173/';
const SEED = '2026';

const browser = await chromium.launch();

async function open({ mode, width = 1100, height = 900, scale = 2, link = true }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, locale: 'ko-KR' });
  const page = await ctx.newPage();
  await page.clock.install();
  // link: 공유 링크로 연다 (같은 시드 = 같은 대회). false 면 시드 없이 처음 들어온 홈 화면
  await page.goto(`${BASE}?mode=${mode}&season=sample${link ? `&seed=${SEED}` : ''}`);
  await page.evaluate(() => document.fonts.ready);
  await tick(page);
  return page;
}

async function tick(page, ms = 400) {
  await page.clock.runFor(ms);
}

async function click(page, name) {
  await page.getByRole('button', { name, exact: true }).first().click();
  await tick(page);
}

/** 예선·준결승을 결과만 보고 넘겨 결승 첫 화면까지 */
async function toFinal(page) {
  await click(page, '엔트리 확인');
  await click(page, '100m 시작');
  for (const next of ['준결승으로', '결승으로']) {
    await click(page, '결과 바로 보기');
    await click(page, '남은 조 결과 바로 보기');
    await click(page, next);
  }
}

async function stageClip(page) {
  const head = await page.locator('.stage__head').boundingBox();
  const canvas = await page.locator('.race__canvas').boundingBox();
  return { x: canvas.x - 12, y: head.y - 12, width: canvas.width + 24, height: canvas.y + canvas.height - head.y + 24 };
}

// 1. 100m 결승 레이스 (GIF)
{
  const page = await open({ mode: 'team', width: 960, scale: 1 });
  await toFinal(page);
  const dir = mkdtempSync(join(tmpdir(), 'race-'));
  const clip = await stageClip(page);
  await page.getByRole('button', { name: '재생', exact: true }).click();
  // 1× 재생에 프레임마다 50ms 씩 시계를 돌린다. 스크린샷이 그리기 한 번을 더 부르므로
  // 한 프레임은 레이스 시간 약 0.1초 — 20fps GIF 에서 2배속으로 보인다.
  const fps = 20;
  let i = 0;
  // 출발 전 잠깐 + 결승선 통과 뒤 정지 화면
  for (let k = 0; k < 8; k++) await page.screenshot({ path: join(dir, `f${String(i++).padStart(4, '0')}.png`), clip });
  while (!(await page.getByRole('button', { name: '다시 보기', exact: true }).isVisible())) {
    await page.clock.runFor(1000 / fps);
    await page.screenshot({ path: join(dir, `f${String(i++).padStart(4, '0')}.png`), clip });
  }
  for (let k = 0; k < fps * 2; k++) await page.screenshot({ path: join(dir, `f${String(i++).padStart(4, '0')}.png`), clip });
  const gif = join(OUT, 'race-100m.gif');
  const ff = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, 'f%04d.png'),
      '-vf', 'split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', gif],
    { stdio: 'inherit' },
  );
  if (ff.error) console.warn('ffmpeg 이 없어 race-100m.gif 를 건너뜁니다');
  rmSync(dir, { recursive: true, force: true });
  await page.context().close();
}

// 2. 결과 표 + 데이터 / 게임 분해 (화면을 길게 잡아 스크롤 없이 찍는다: 상단 바가 표를 가리지 않게)
{
  const page = await open({ mode: 'team', height: 2000 });
  await toFinal(page);
  await click(page, '결과 바로 보기');
  await page.locator('.results .rrow__athlete').first().click();
  await tick(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const table = await page.locator('.results .rtable').boundingBox();
  await page.screenshot({ path: join(OUT, 'breakdown.png'), clip: { x: table.x - 16, y: table.y - 16, width: table.width + 32, height: table.height + 32 } });
  await page.context().close();
}

// 3. 계주 오더 편집 (국가별)
{
  const page = await open({ mode: 'nation' });
  await toFinal(page);
  await click(page, '결과 바로 보기');
  await click(page, '4×100m 계주 오더로');
  await page.locator('.team__head').first().click();
  await tick(page);
  await page.screenshot({ path: join(OUT, 'relay-order.png') });
  await page.context().close();
}

// 4. 시상대 두 개 (국가별, 공유 링크에서 바로)
{
  const page = await open({ mode: 'nation', height: 2000 });
  await click(page, '메달 테이블 바로 보기');
  await page.evaluate(() => window.scrollTo(0, 0));
  const top = await page.locator('.podium > .title').boundingBox();
  const relay = await page.locator('.podium__event').last().boundingBox();
  await page.screenshot({
    path: join(OUT, 'podium.png'),
    clip: { x: relay.x - 24, y: top.y - 16, width: relay.width + 48, height: relay.y + relay.height - top.y + 32 },
  });
  await page.context().close();
}

// 5. 휴대폰 세 장 (홈 · 레이스 · 시상)
{
  const dir = mkdtempSync(join(tmpdir(), 'mobile-'));
  const shots = [];
  const phone = { width: 390, height: 780, scale: 2 };
  const shot = async (page, name) => {
    const path = join(dir, `${name}.png`);
    await page.screenshot({ path });
    shots.push(path);
  };
  let page = await open({ mode: 'team', ...phone, link: false });
  await shot(page, 'home');
  await page.context().close();
  page = await open({ mode: 'team', ...phone });
  await toFinal(page);
  await click(page, '2×');
  await page.getByRole('button', { name: '재생', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.clock.runFor(4200);
  await shot(page, 'race');
  await page.context().close();
  page = await open({ mode: 'nation', ...phone });
  await click(page, '메달 테이블 바로 보기');
  await shot(page, 'podium');
  await page.context().close();

  // 세 장을 Tyvek 위에 나란히: 1.5px 잉크 테두리, 4px 잉크 괘선 위 디스플레이 서체 캡션.
  // 캡션 서체는 앱 빌드의 @font-face 를 그대로 쓰려고 같은 출처의 가짜 페이지로 연다.
  const labels = ['홈 · 대회 설정', '100m 결승', '대회 결과 · 시상'];
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  const comp = await ctx.newPage();
  await comp.goto(BASE);
  const fontCss = await comp.evaluate(() =>
    [...document.styleSheets]
      .flatMap((s) =>
        [...s.cssRules]
          .filter((r) => r instanceof CSSFontFaceRule && /Big Shoulders|Black Han/.test(r.cssText))
          .map((r) => r.cssText.replace(/url\("?([^")]+)"?\)/g, (m, u) => (u.startsWith('data:') ? m : `url("${new URL(u, s.href ?? location.href).href}")`))),
      )
      .join('\n'),
  );
  const img = (path) => `data:image/png;base64,${readFileSync(path).toString('base64')}`;
  const html = `<!doctype html><meta charset="utf-8"><style>${fontCss}
    body { margin: 0; background: #f4f3ee; font-family: 'Big Shoulders Display', 'Black Han Sans', sans-serif; font-synthesis: none; }
    .row { display: flex; gap: 32px; padding: 32px; width: max-content; }
    figure { margin: 0; display: grid; gap: 12px; }
    img { display: block; width: 390px; border: 1.5px solid #121212; }
    figcaption { font-weight: 800; font-size: 20px; color: #121212; border-top: 4px solid #121212; padding-top: 8px; }
  </style><div class="row">${shots.map((s, i) => `<figure><img src="${img(s)}"><figcaption>${labels[i]}</figcaption></figure>`).join('')}</div>`;
  const url = new URL('__readme-mobile.html', BASE).href;
  await comp.route(url, (route) => route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' }));
  await comp.goto(url);
  await comp.evaluate(() => document.fonts.ready);
  await comp.locator('.row').screenshot({ path: join(OUT, 'mobile.png') });
  await ctx.close();
  rmSync(dir, { recursive: true, force: true });
}

await browser.close();
console.log('README 캡처 완료:', OUT);
