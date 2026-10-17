(function () {
  const root = document.documentElement;
  const SPA = location.protocol !== "file:" && !!window.fetch && !!window.history && !!window.DOMParser;

  const items = [
    { key: "1", p: "home", en: "Main", ru: "Основное", href: "index.html" },
    { key: "2", p: "about", en: "About", ru: "Обо мне", href: "index.html#about" },
    { key: "3", p: "links", en: "Links", ru: "Ссылки", href: "links.html" },
    { key: "4", p: "portfolio", en: "Portfolio", ru: "Портфолио", href: "portfolio.html" }
  ];

  const glyphs = document.createElement("script");
  glyphs.src = "glyphs-fx.js";
  document.body.appendChild(glyphs);

  const header = document.createElement("header");
  header.innerHTML =
    '<div class="strip"><div class="wrap">' +
    '<span data-ru="— Москва">— Moscow</span>' +
    '<span class="clock"><span class="dot"></span><b data-clock>--:--:--</b><span>MSK</span></span>' +
    "</div></div>" +
    '<div class="wrap bar">' +
    '<a class="brand" href="index.html"><b>IgnoringLynx</b></a>' +
    '<button class="burger" id="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>' +
    '<nav id="nav">' +
    items.map((i) => '<a href="' + i.href + '" data-p="' + i.p + '" data-key="' + i.key + '" title="' + i.key + '" data-ru="' + i.ru + '">' + i.en + "</a>").join("") +
    '<div class="menu-tools">' +
    '<button class="theme" id="theme" type="button" aria-label="Toggle theme" data-ru="Тема">Theme</button>' +
    '<button class="theme" id="lang" type="button" aria-label="Switch language">RU</button>' +
    '<span class="menu-meta"><span data-ru="— Москва">— Moscow</span><b data-clock>--:--:--</b><span>MSK</span></span>' +
    "</div></nav></div>";  document.body.prepend(header);

  const footer = document.createElement("footer");
  footer.innerHTML =
    '<div class="wrap foot">' +
    '<div><span class="t">IgnoringLynx</span><span id="year" data-ru="x"></span></div>' +
    '<div class="keys">' +
    items.map((i) => '<span><kbd>' + i.key + '</kbd><span data-ru="' + i.ru + '">' + i.en + "</span></span>").join("") +
    "</div>" +
    '<a class="ul" href="#top" data-ru="Наверх ↑">Back to top ↑</a>' +
    "</div>";
  document.body.append(footer);

  const clocks = [...document.querySelectorAll("[data-clock]")];
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  function tick() {
    const v = fmt.format(new Date());
    clocks.forEach((c) => { c.textContent = v; });
  }
  tick();
  setInterval(tick, 1000);

  const year = document.getElementById("year");
  const langBtn = document.getElementById("lang");
  let nodes = [];
  let lang = (navigator.language || "").toLowerCase().startsWith("ru") ? "ru" : "en";
  try { const s = localStorage.getItem("lang"); if (s) lang = s; } catch (e) {}

  function collect() {
    nodes = [...document.querySelectorAll("[data-ru]")];
    nodes.forEach((n) => { if (!("en" in n.dataset)) n.dataset.en = n.innerHTML; });
  }
  function apply() {
    root.lang = lang;
    nodes.forEach((n) => {
      if (n === year) return;
      n.innerHTML = lang === "ru" ? n.dataset.ru : n.dataset.en;
    });
    year.textContent = "© " + new Date().getFullYear() + " — " + (lang === "ru" ? "Все права защищены" : "All rights reserved");
    langBtn.textContent = lang === "ru" ? "EN" : "RU";
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }
  langBtn.addEventListener("click", () => {
    lang = lang === "ru" ? "en" : "ru";
    apply();
    window.dispatchEvent(new Event("langchange"));
  });

  try {
    const saved = localStorage.getItem("theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch (e) {}
  document.getElementById("theme").addEventListener("click", () => {
    const cur = root.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  function legacyCopy(v) {
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = v;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      ok ? resolve() : reject();
    });
  }
  function copyText(v) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(v).catch(() => legacyCopy(v));
    return legacyCopy(v);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".copy");
    if (!b) return;
    copyText(b.dataset.copy).then(() => {
      b.textContent = lang === "ru" ? "Скопировано" : "Copied";
      b.classList.add("done");
      clearTimeout(b._t);
      b._t = setTimeout(() => {
        b.classList.remove("done");
        b.innerHTML = lang === "ru" ? b.dataset.ru : b.dataset.en;
      }, 1600);
    }).catch(() => {});
  });

  let visitsValue = null;
  function initVisits() {
    const el = document.getElementById("visits");
    if (!el) return;
    if (visitsValue !== null) {
      el.textContent = visitsValue;
      return;
    }
    const base = "https://abacus.jasoncameron.dev";
    const path = "ignoringlynx-site/visits";
    let counted = false;
    try { counted = localStorage.getItem("visited") === "1"; } catch (e) {}
    fetch(base + (counted ? "/get/" : "/hit/") + path)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        visitsValue = Number(d.value).toLocaleString("en-US");
        const target = document.getElementById("visits");
        if (target) target.textContent = visitsValue;
        try { localStorage.setItem("visited", "1"); } catch (e) {}
      })
      .catch(() => {});
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  function initReveal() {
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in", "instant");
      else io.observe(el);
    });
  }

  const navLinks = [...document.querySelectorAll("nav a[data-p]")];
  function setActive(p) { navLinks.forEach((a) => a.classList.toggle("active", a.dataset.p === p)); }
  function updateActive() {
    const page = document.body.dataset.page;
    if (page === "home") {
      const about = document.getElementById("about");
      const passed = about && about.getBoundingClientRect().top <= header.offsetHeight + 80;
      setActive(passed ? "about" : "home");
    } else {
      setActive(page);
    }
  }
  addEventListener("scroll", updateActive, { passive: true });

  function normPath(p) { return p.replace(/index\.html$/, ""); }
  let curPath = normPath(location.pathname);

  function scrollToHash(hash, smooth) {
    const id = (hash || "").replace(/^#/, "");
    const el = id ? document.getElementById(id) : null;
    const behavior = smooth ? "smooth" : "instant";
    if (!el || id === "top") {
      window.scrollTo({ top: 0, behavior: behavior });
      return;
    }
    const y = el.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
    window.scrollTo({ top: y, behavior: behavior });
  }

  const loadedScripts = new Set([...document.scripts].map((s) => s.getAttribute("src")).filter(Boolean));
  function ensureScripts(doc) {
    doc.querySelectorAll("script[src]").forEach((s) => {
      const src = s.getAttribute("src");
      if (loadedScripts.has(src)) return;
      loadedScripts.add(src);
      const n = document.createElement("script");
      n.src = src;
      document.body.appendChild(n);
    });
  }

  function initPage() {
    collect();
    apply();
    initReveal();
    initVisits();
    if (window.initGallery) window.initGallery();
    updateActive();
    window.dispatchEvent(new Event("pagechange"));
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let navigating = false;
  async function navigate(href, push) {
    if (navigating) return;
    navigating = true;
    const url = new URL(href, location.href);
    const main = document.querySelector("main");
    try {
      main.classList.add("leaving");
      const [res] = await Promise.all([fetch(url.pathname + url.search), wait(220)]);
      if (!res.ok) throw new Error("bad response");
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      const next = doc.querySelector("main");
      if (!next) throw new Error("no main");
      document.body.classList.remove("lb-open");
      document.title = doc.title;
      document.body.dataset.page = doc.body.dataset.page;
      main.innerHTML = next.innerHTML;
      curPath = normPath(url.pathname);
      if (push) history.pushState({}, "", url.pathname + url.search + url.hash);
      header.classList.remove("compact");
      window.scrollTo({ top: 0, behavior: "instant" });
      ensureScripts(doc);
      initPage();
      if (url.hash) scrollToHash(url.hash, false);
      requestAnimationFrame(() => main.classList.remove("leaving"));
    } catch (err) {
      location.href = url.href;
      return;
    } finally {
      navigating = false;
    }
  }

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const href = a.getAttribute("href");
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    if (normPath(url.pathname) === curPath) {
      e.preventDefault();
      scrollToHash(url.hash, true);
      return;
    }
    if (!SPA) return;
    e.preventDefault();
    navigate(url.href, true);
  });

  addEventListener("popstate", () => {
    if (!SPA) return;
    if (normPath(location.pathname) === curPath) {
      scrollToHash(location.hash, false);
      return;
    }
    navigate(location.href, false);
  });

  const burger = document.getElementById("burger");
  function setMenu(open) {
    header.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) header.classList.remove("compact");
    else if (header.contains(document.activeElement)) document.activeElement.blur();
  }
  burger.addEventListener("click", () => setMenu(!header.classList.contains("open")));
  addEventListener("pagechange", () => setMenu(false));
  addEventListener("resize", () => { if (window.innerWidth > 720) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && header.classList.contains("open")) setMenu(false); });

  let lastY = window.scrollY;
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = Math.max(0, window.scrollY);
      const dy = y - lastY;
      if (header.classList.contains("open")) {
        lastY = y;
      } else if (y < 80) {
        header.classList.remove("compact");
        lastY = y;
      } else if (dy > 8) {
        const f = document.activeElement;
        const typing = f && header.contains(f) && f.matches(":focus-visible");
        if (!typing) header.classList.add("compact");
        lastY = y;
      } else if (dy < -8) {
        header.classList.remove("compact");
        lastY = y;
      }
    });
  }, { passive: true });
  header.addEventListener("focusin", (e) => { if (e.target.matches(":focus-visible")) header.classList.remove("compact"); });

  const secret = ["KeyL", "KeyY", "KeyN", "KeyX"];
  let typed = [];
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.body.classList.contains("lb-open")) return;
    typed.push(e.code);
    typed = typed.slice(-secret.length);
    if (typed.length === secret.length && typed.every((c, i) => c === secret[i])) {
      typed = [];
      root.classList.add("lynx");
      clearTimeout(root._lynx);
      root._lynx = setTimeout(() => root.classList.remove("lynx"), 3600);
      window.dispatchEvent(new Event("lynx"));
      return;
    }
    const a = document.querySelector('nav a[data-key="' + e.key + '"]');
    if (a) { e.preventDefault(); a.click(); }
  });

  initPage();

  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => requestAnimationFrame(() => root.classList.remove("pending")));
})();
