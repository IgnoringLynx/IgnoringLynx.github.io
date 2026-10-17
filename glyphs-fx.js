(function () {
  const canvas = document.createElement("canvas");
  canvas.className = "glyphs blueprint";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  let page = document.body.dataset.page || "home";
  const charSets = {
    home: Array.from("01abcdefghijklmnopqrstuvwxyz23456789#/*+=<>{}[]"),
    links: Array.from("01abcdefghijklmnopqrstuvwxyz23456789#/*+=<>{}[]"),
    portfolio: Array.from("░▒▓█▀▄▌▐■□▪▫▢▣▤▥▦▧▨▩┌┐└┘├┤┬┴┼─│╭╮╯╰▭▯")
  };
  let chars = charSets[page] || charSets.home;
  const cell = 13;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ICON_IN = 1200;
  const ICON_HOLD = 3200;
  const ICON_OUT = 1500;
  const SCRAMBLE_MS = 1200;

  let W = 0, H = 0, cols = 0, rows = 0;
  let phone = false;
  let grid = new Uint8Array(0);
  let fx = new Float32Array(0);
  let mask = new Uint8Array(0);
  let mw = 0, mh = 0, bx = 0, by = 0;
  let rgb = "241,241,246";
  const tints = ["74,133,240", "138,116,184", "217,96,111"];
  let colorAt = 0;
  let last = 0;
  let lastT = 0;
  let drops = [];
  let rnd = new Float32Array(0);
  let seed = 0;
  let scrambleAt = -1e9;
  let iconMask = new Uint8Array(0);
  let isz = 0, ix = 0, iy = 0;
  const icon = { phase: "idle", at: 0, next: 0, last: -1 };
  const LYNX_MS = 3600;
  let lynxUntil = 0;

  function rand() { return Math.floor(Math.random() * chars.length); }

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
    c.font = "700 " + size + 'px "Fira Code", Arial, sans-serif';
    const w = c.measureText("IL").width;
    if (w > mw * 0.92) {
      size = Math.floor(size * (mw * 0.92) / w);
      c.font = "700 " + size + 'px "Fira Code", Arial, sans-serif';
    }
    c.fillText("IL", mw / 2, mh / 2 + size * 0.04);
    const data = c.getImageData(0, 0, mw, mh).data;
    mask = new Uint8Array(mw * mh);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3];
    bx = narrow ? (W - mw) / 2 : W - mw - 24;
    by = (H - mh) / 2;
  }

  const iconKinds = ["plane", "bubble", "link", "play", "heart", "at"];

  function drawIcon(c, kind, s) {
    c.fillStyle = "#fff";
    c.strokeStyle = "#fff";
    c.lineCap = "round";
    c.lineJoin = "round";
    c.lineWidth = s * 0.09;
    if (kind === "plane") {
      c.beginPath();
      const pts = [[0.06, 0.47], [0.94, 0.1], [0.74, 0.9], [0.48, 0.64], [0.33, 0.86], [0.31, 0.6]];
      pts.forEach((q, k) => (k ? c.lineTo(q[0] * s, q[1] * s) : c.moveTo(q[0] * s, q[1] * s)));
      c.closePath();
      c.fill();
    } else if (kind === "bubble") {
      c.beginPath();
      c.roundRect(0.08 * s, 0.14 * s, 0.84 * s, 0.58 * s, 0.14 * s);
      c.moveTo(0.26 * s, 0.72 * s);
      c.lineTo(0.26 * s, 0.9 * s);
      c.lineTo(0.46 * s, 0.72 * s);
      c.stroke();
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc((0.32 + k * 0.18) * s, 0.43 * s, 0.045 * s, 0, Math.PI * 2);
        c.fill();
      }
    } else if (kind === "link") {
      [[-0.14, -0.14], [0.14, 0.14]].forEach((o) => {
        c.save();
        c.translate((0.5 + o[0]) * s, (0.5 + o[1]) * s);
        c.rotate(-Math.PI / 4);
        c.beginPath();
        c.roundRect(-0.3 * s, -0.12 * s, 0.6 * s, 0.24 * s, 0.12 * s);
        c.stroke();
        c.restore();
      });
    } else if (kind === "play") {
      c.beginPath();
      c.roundRect(0.08 * s, 0.2 * s, 0.84 * s, 0.6 * s, 0.16 * s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.42 * s, 0.36 * s);
      c.lineTo(0.42 * s, 0.64 * s);
      c.lineTo(0.66 * s, 0.5 * s);
      c.closePath();
      c.fill();
    } else if (kind === "heart") {
      c.beginPath();
      c.moveTo(0.5 * s, 0.86 * s);
      c.bezierCurveTo(0.05 * s, 0.55 * s, 0.1 * s, 0.14 * s, 0.34 * s, 0.14 * s);
      c.bezierCurveTo(0.44 * s, 0.14 * s, 0.5 * s, 0.22 * s, 0.5 * s, 0.3 * s);
      c.bezierCurveTo(0.5 * s, 0.22 * s, 0.56 * s, 0.14 * s, 0.66 * s, 0.14 * s);
      c.bezierCurveTo(0.9 * s, 0.14 * s, 0.95 * s, 0.55 * s, 0.5 * s, 0.86 * s);
      c.fill();
    } else {
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = "800 " + s * 0.95 + "px Arial, sans-serif";
      c.fillText("@", s / 2, s * 0.54);
    }
  }

  function buildIcon() {
    let k = Math.floor(Math.random() * iconKinds.length);
    if (k === icon.last) k = (k + 1) % iconKinds.length;
    icon.last = k;
    isz = phone ? 160 : 230;
    const m = document.createElement("canvas");
    m.width = isz;
    m.height = isz;
    const c = m.getContext("2d");
    if ("filter" in c) c.filter = "blur(1px)";
    drawIcon(c, iconKinds[k], isz);
    const data = c.getImageData(0, 0, isz, isz).data;
    iconMask = new Uint8Array(isz * isz);
    for (let i = 0; i < iconMask.length; i++) iconMask[i] = data[i * 4 + 3];
    const pad = 60;
    for (let tries = 0; tries < 30; tries++) {
      ix = W * 0.06 + Math.random() * Math.max(0, W * 0.88 - isz);
      iy = H * 0.14 + Math.random() * Math.max(0, H * 0.78 - isz);
      if (phone) break;
      const clearX = ix + isz < bx - pad || ix > bx + mw + pad;
      const clearY = iy + isz < by - pad || iy > by + mh + pad;
      if (clearX || clearY) break;
    }
  }

  function iconStrength(now) {
    if (reduce || page !== "links") return 0;
    if (icon.phase === "idle") {
      if (now < icon.next) return 0;
      buildIcon();
      icon.phase = "in";
      icon.at = now;
    }
    const t = now - icon.at;
    if (icon.phase === "in") {
      if (t >= ICON_IN) {
        icon.phase = "hold";
        icon.at = now;
        return 1;
      }
      return t / ICON_IN;
    }
    if (icon.phase === "hold") {
      if (t >= ICON_HOLD) {
        icon.phase = "out";
        icon.at = now;
      }
      return 1;
    }
    if (t >= ICON_OUT) {
      icon.phase = "idle";
      icon.next = now + 2500 + Math.random() * 2500;
      return 0;
    }
    return 1 - t / ICON_OUT;
  }

  function scramble() {
    if (reduce) return;
    scrambleAt = performance.now();
    seed = Math.floor(Math.random() * 1e9);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    buildDrops();
    icon.phase = "idle";
    icon.next = performance.now() + 900;
  }

  function newDrop(initial) {
    const len = 8 + Math.random() * 10;
    return {
      col: Math.floor(Math.random() * cols),
      y: initial ? Math.random() * (rows + len) - len : -len - Math.random() * rows * 0.6,
      speed: 4 + Math.random() * 5,
      len: len
    };
  }

  function buildDrops() {
    const target = Math.max(5, Math.round(cols / (W < 700 ? 12 : 9)));
    drops = [];
    for (let i = 0; i < target; i++) drops.push(newDrop(true));
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    phone = W < 700 || matchMedia("(hover: none)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / cell);
    rows = Math.ceil(H / cell);
    grid = new Uint8Array(cols * rows);
    fx = new Float32Array(cols * rows);
    rnd = new Float32Array(cols * rows);
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    icon.phase = "idle";
    icon.next = performance.now() + 1800;
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    buildMask();
    buildDrops();
    draw(performance.now());
  }

  function buildEffects(now, dt) {
    fx.fill(0);
    if (reduce) return;

    for (const d of drops) {
      d.y += d.speed * dt;
      if (d.y - d.len > rows) {
        Object.assign(d, newDrop(false));
        continue;
      }
      const head = Math.floor(d.y);
      for (let j = 0; j < d.len; j++) {
        const r = head - j;
        if (r < 0 || r >= rows) continue;
        const t = 1 - j / d.len;
        const a = (j === 0 ? 0.3 : 0.2) * Math.pow(t, 1.4);
        const i = r * cols + d.col;
        if (a > fx[i]) fx[i] = a;
        if (j === 0 && Math.random() < 0.5) grid[i] = rand();
      }
    }
  }

  function draw(now) {
    if (document.documentElement.getAttribute("data-theme") === "light") {
      ctx.clearRect(0, 0, W, H);
      return;
    }
    const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    readColor(now);
    buildEffects(now, dt);
    const is = iconStrength(now);
    const sc = Math.max(0, 1 - (now - scrambleAt) / SCRAMBLE_MS);
    ctx.clearRect(0, 0, W, H);
    ctx.font = (cell - 1) + 'px "Fira Code", ui-monospace, Consolas, monospace';
    ctx.textBaseline = "top";
    const left = lynxUntil - now;
    const k = left > 0 ? Math.min(1, (LYNX_MS - left) / 500, left / 2200) : 0;
    const jit = sc * 36;
    const ox = bx + Math.sin(now / 5200) * 22 + (sc ? (Math.random() - 0.5) * jit : 0);
    const oy = by + Math.sin(now / 4300 + 1) * 30 + (sc ? (Math.random() - 0.5) * jit : 0);
    const narrow = W < 700;
    const gain = narrow ? 0.16 : 0.26;
    for (let r = 0; r < rows; r++) {
      const y = r * cell;
      for (let c = 0; c < cols; c++) {
        const x = c * cell;
        const mx = Math.floor(x + cell / 2 - ox);
        const my = Math.floor(y + cell / 2 - oy);
        let a = 0;
        if (!phone && mx >= 0 && my >= 0 && mx < mw && my < mh) a = mask[my * mw + mx] / 255;
        const i = r * cols + c;
        const inIL = a > 0.08;
        let alpha = 0;
        if (a > 0.08) {
          alpha = a * (gain * 0.55 + Math.random() * gain * 0.45);
          if (Math.random() < 0.07) grid[i] = rand();
        } else {
          const h = (((c * 73856093) ^ (r * 19349663) ^ seed) >>> 0) % 1000;
          if (h < 28) {
            alpha = 0.05 + (h % 7) * 0.01;
            if (Math.random() < 0.06) grid[i] = rand();
          }
        }
        if (is > 0 && !inIL) {
          const imx = Math.floor(x + cell / 2 - ix);
          const imy = Math.floor(y + cell / 2 - iy);
          if (imx >= 0 && imy >= 0 && imx < isz && imy < isz) {
            const ia = iconMask[imy * isz + imx] / 255;
            if (ia > 0.08) {
              const v = Math.min(1, Math.max(0, (is - rnd[i] * 0.7) / 0.3));
              const wa = ia * v * 0.4;
              if (wa > alpha) {
                alpha = wa;
                if (Math.random() < (v < 1 ? 0.5 : 0.03)) grid[i] = rand();
              }
            }
          }
        }
        if (sc > 0 && !inIL && rnd[i] < 0.55 * sc) {
          const sa = 0.05 + 0.17 * sc * (0.4 + 0.6 * rnd[i] / 0.55);
          if (sa > alpha) alpha = sa;
          grid[i] = rand();
        }
        const f = fx[i];
        if (f > alpha && !inIL) {
          alpha = f;
          if (f > 0.1 && Math.random() < 0.3) grid[i] = rand();
        }
        if (alpha > 0.012) {
          const hue = (((c * 2654435761) ^ (r * 40503)) >>> 0) % 100;
          const limit = 25 + 65 * k;
          const tint = hue < limit * 0.36 ? tints[0] : hue < limit * 0.68 ? tints[1] : hue < limit ? tints[2] : rgb;
          const shown = Math.min(0.9, alpha * (1 + 0.9 * k));
          ctx.fillStyle = "rgba(" + tint + "," + shown.toFixed(3) + ")";
          ctx.fillText(chars[grid[i]], x, y);
        }
      }
    }
  }

  function loop(now) {
    if (now - last > 33) {
      last = now;
      draw(now);
    }
    requestAnimationFrame(loop);
  }

  let pending = false;
  addEventListener("scroll", () => {
    if (pending || !reduce) return;
    pending = true;
    requestAnimationFrame((t) => {
      pending = false;
      draw(t);
    });
  }, { passive: true });

  addEventListener("langchange", scramble);
  addEventListener("lynx", () => {
    lynxUntil = performance.now() + LYNX_MS;
    scramble();
  });
  addEventListener("pagechange", () => {
    const next = document.body.dataset.page || "home";
    if (next === page) return;
    page = next;
    chars = charSets[page] || charSets.home;
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    icon.phase = "idle";
    icon.next = performance.now() + 1800;
  });

  let timer = 0;
  addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(resize, 150);
  });

  const start = () => {
    resize();
    if (!reduce) requestAnimationFrame(loop);
  };
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load("700 20px \"Fira Code\""), document.fonts.load("13px \"Fira Code\"")]).then(start, start);
  } else {
    start();
  }
})();
