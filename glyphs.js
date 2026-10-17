(function () {
  const canvas = document.createElement("canvas");
  canvas.className = "glyphs";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const chars = "01abcdefghijklmnopqrstuvwxyz23456789#/*+=<>{}[]";
  const cell = 13;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, cols = 0, rows = 0;
  let grid = new Uint8Array(0);
  let mask = new Uint8Array(0);
  let mw = 0, mh = 0, bx = 0, by = 0;
  let rgb = "241,241,246";
  let colorAt = 0;
  let last = 0;

  function readColor(now) {
    if (now - colorAt < 800) return;
    colorAt = now;
    const v = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v);
    if (m) rgb = parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16);
  }

  function buildMask() {
    const narrow = W < 700;
    mh = Math.round(narrow ? Math.min(H * 0.5, W * 0.85) : Math.min(H * 0.78, 680));
    mw = Math.round(mh * 0.95);
    const m = document.createElement("canvas");
    m.width = mw;
    m.height = mh;
    const c = m.getContext("2d");
    if ("filter" in c) c.filter = "blur(" + Math.max(2, Math.round(mh / 90)) + "px)";
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    let size = mh;
    c.font = "800 " + size + 'px "Geist", Arial, sans-serif';
    const w = c.measureText("IL").width;
    if (w > mw * 0.92) {
      size = Math.floor(size * (mw * 0.92) / w);
      c.font = "800 " + size + 'px "Geist", Arial, sans-serif';
    }
    c.fillText("IL", mw / 2, mh / 2 + size * 0.04);
    const data = c.getImageData(0, 0, mw, mh).data;
    mask = new Uint8Array(mw * mh);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3];
    bx = narrow ? (W - mw) / 2 : W - mw - 24;
    by = (H - mh) / 2;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / cell);
    rows = Math.ceil(H / cell);
    grid = new Uint8Array(cols * rows);
    for (let i = 0; i < grid.length; i++) grid[i] = Math.floor(Math.random() * chars.length);
    buildMask();
    draw(performance.now());
  }

  const textSelector = "main h1, main h2, main p, main small, main strong, main .eyebrow, main .btn, main .ul, footer .t, footer #year, footer .keys, footer .ul";
  let blockers = [];
  let blockersAt = 0;
  const range = document.createRange();

  function collectBlockers(now) {
    if (now - blockersAt < 1000 && blockers.length) return;
    blockersAt = now;
    blockers = [...document.querySelectorAll(textSelector)].filter((e) => !e.closest(".card, .info, .cards, .gallery, .work, .lb"));
  }

  function textRects(now) {
    collectBlockers(now);
    const out = [];
    const padX = 14;
    const padY = 8;
    for (const el of blockers) {
      range.selectNodeContents(el);
      const list = range.getClientRects();
      for (const r of list) {
        if (r.width < 2 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
        out.push([r.left - padX, r.top - padY, r.right + padX, r.bottom + padY]);
      }
    }
    return out;
  }

  function covered(rects, x, y) {
    for (let k = 0; k < rects.length; k++) {
      const q = rects[k];
      if (x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3]) return true;
    }
    return false;
  }

  function draw(now) {
    readColor(now);
    const rects = textRects(now);
    ctx.clearRect(0, 0, W, H);
    ctx.font = (cell - 1) + 'px "Geist Mono", ui-monospace, Consolas, monospace';
    ctx.textBaseline = "top";
    const ox = bx + Math.sin(now / 5200) * 22;
    const oy = by + Math.sin(now / 4300 + 1) * 30;
    const narrow = W < 700;
    const gain = narrow ? 0.16 : 0.26;
    for (let r = 0; r < rows; r++) {
      const y = r * cell;
      for (let c = 0; c < cols; c++) {
        const x = c * cell;
        const mx = Math.floor(x + cell / 2 - ox);
        const my = Math.floor(y + cell / 2 - oy);
        let a = 0;
        if (mx >= 0 && my >= 0 && mx < mw && my < mh) a = mask[my * mw + mx] / 255;
        const i = r * cols + c;
        let alpha = 0;
        if (a > 0.08) {
          alpha = a * (gain * 0.55 + Math.random() * gain * 0.45);
          if (Math.random() < 0.07) grid[i] = Math.floor(Math.random() * chars.length);
        } else {
          const h = (((c * 73856093) ^ (r * 19349663)) >>> 0) % 1000;
          if (h < 28) {
            alpha = 0.05 + (h % 7) * 0.01;
            if (Math.random() < 0.06) grid[i] = Math.floor(Math.random() * chars.length);
          }
        }
        if (alpha > 0.012 && !covered(rects, x + cell / 2, y + cell / 2)) {
          ctx.fillStyle = "rgba(" + rgb + "," + alpha.toFixed(3) + ")";
          ctx.fillText(chars[grid[i]], x, y);
        }
      }
    }
  }

  function loop(now) {
    if (now - last > 45) {
      last = now;
      draw(now);
    }
    requestAnimationFrame(loop);
  }

  let pending = false;
  addEventListener("scroll", () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame((t) => {
      pending = false;
      draw(t);
    });
  }, { passive: true });

  let timer = 0;
  addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(resize, 150);
  });

  const start = () => {
    resize();
    if (!reduce) requestAnimationFrame(loop);
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else start();
})();
