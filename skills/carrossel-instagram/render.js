// Uso: node render.js slides.json pasta-de-saida
// Gera slide-1.png ... slide-N.png em 1080x1350 (retrato 4:5 do Instagram).
const fs = require('fs'), path = require('path');
const PW = process.env.PLAYWRIGHT_CORE || '/data/OpenBot/Agents/agent-561ce025-2106-41e1-afbf-b370ec6c277b/pw/node_modules/playwright-core';
const CHROME = process.env.CHROME_PATH || '/data/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';
const { chromium } = require(PW);
const [,, entrada, saida] = process.argv;
if (!entrada || !saida) { console.error('uso: node render.js slides.json pasta'); process.exit(1); }
const slides = JSON.parse(fs.readFileSync(entrada, 'utf8'));
fs.mkdirSync(saida, { recursive: true });
const F = p => 'data:font/ttf;base64,' + fs.readFileSync(path.join(__dirname, 'fontes', p)).toString('base64');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const em = s => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>'); // *palavra* = destaque em cor
const BG = { c: ['#f6f6f6','#151515','#bc0319','#454545'],   // fundo, texto, destaque, texto leve
             k: ['#151515','#f6f6f6','#ff4560','#f6f6f6'],
             r: ['#bc0319','#f6f6f6','#151515','#f6f6f6'] };
const css = `
@font-face{font-family:H;font-weight:700;src:url(${F('NeueHaasDisplayBold.ttf')})}
@font-face{font-family:H;font-weight:300;src:url(${F('NeueHaasDisplayLight.ttf')})}
@font-face{font-family:H;font-weight:400;src:url(${F('NeueHaasDisplayRoman.ttf')})}
*{margin:0;box-sizing:border-box}
body{word-spacing:.1em;width:1080px;height:1350px;font-family:H;position:relative;overflow:hidden}
.top{position:absolute;left:72px;right:72px;top:80px;display:flex;justify-content:space-between;font-weight:700;font-size:38px;letter-spacing:-.02em}
.top span{border-bottom:3px solid currentColor;padding-bottom:2px}
.c{position:absolute;left:72px;right:72px}
.c.top1{top:250px}.c.bottom{bottom:130px}.c.bottom2{bottom:110px}
.tag{display:inline-block;border:3px solid;padding:10px 24px;font-weight:700;font-size:26px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:28px}
h1{font-weight:700;font-size:104px;line-height:.95;letter-spacing:-.035em}
.b h1{font-size:92px}
p.body{font-weight:300;font-size:44px;line-height:1.3;letter-spacing:-.015em;margin-top:34px}
p.note{font-weight:300;font-size:40px;letter-spacing:-.015em;margin-top:44px;opacity:.8}
p.quote{font-weight:700;font-size:64px;letter-spacing:-.03em;margin-top:44px}
.cta{border-top:3px solid;margin-top:60px;padding-top:36px;font-weight:700;font-size:46px;line-height:1.25;letter-spacing:-.02em}
`;
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i], [bg, fg, ac] = BG[s.bg || 'c'];
    const pos = s.pos === 'top' ? 'top1' : (s.pos || 'bottom');
    const n = String(i + 1).padStart(2, '0');
    const html = `<style>${css}</style><body style="background:${bg};color:${fg}">
      <div class="top"><span>Made by Felipe®</span><span>${n}</span></div>
      <div class="c ${pos}" style="--a:${ac}">
        ${s.tag ? `<div class="tag" style="color:${ac === fg ? fg : (s.bg==='r'?fg:ac)}">${esc(s.tag)}</div>` : ''}
        <h1>${em(s.title).replace(/<em>/g, `<em style="font-style:normal;color:${ac}">`)}</h1>
        ${s.body ? `<p class="body">${esc(s.body)}</p>` : ''}
        ${s.quote ? `<p class="quote" style="color:${ac}">${esc(s.quote)}</p>` : ''}
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
        ${s.cta ? `<div class="cta">${esc(s.cta)}</div>` : ''}
      </div></body>`;
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    const over = await p.evaluate(() => { const c = document.querySelector('.c'); const r = c.getBoundingClientRect(); return r.top < 150 || r.bottom > 1350; });
    if (over) console.warn(`slide ${i+1}: texto passou da margem, encurte o título`);
    await p.screenshot({ path: path.join(saida, `slide-${i + 1}.png`) });
  }
  await b.close();
  console.log(`ok: ${slides.length} slides 1080x1350 em ${saida}`);
})();
