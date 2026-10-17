(function () {
  const MAX_ZOOM = 5;
  let works = [];
  let lb = null;
  let stage = null;
  let title = null;
  let tag = null;
  let count = null;
  let zoomLabel = null;
  let idx = 0;
  let zoom = 1;
  let base = 0;
  let drag = null;

  function pad(n) { return String(n).padStart(2, "0"); }

  function setZoom(z, cx, cy) {
    const img = stage.querySelector("img");
    if (!img) return;
    z = Math.min(MAX_ZOOM, Math.max(1, Math.round(z * 100) / 100));
    if (z === zoom) return;
    const rect = stage.getBoundingClientRect();
    if (cx === undefined) cx = rect.width / 2;
    if (cy === undefined) cy = rect.height / 2;
    const px = (stage.scrollLeft + cx) / stage.scrollWidth;
    const py = (stage.scrollTop + cy) / stage.scrollHeight;
    if (zoom === 1) base = img.getBoundingClientRect().width;
    zoom = z;
    if (z === 1) {
      img.style.cssText = "";
    } else {
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.width = base * z + "px";
    }
    stage.classList.toggle("zoomed", z > 1);
    stage.scrollLeft = px * stage.scrollWidth - cx;
    stage.scrollTop = py * stage.scrollHeight - cy;
    zoomLabel.textContent = Math.round(z * 100) + "%";
  }

  function resetZoom() {
    zoom = 1;
    base = 0;
    stage.classList.remove("zoomed", "dragging");
    zoomLabel.textContent = "100%";
  }

  function show(i) {
    idx = (i + works.length) % works.length;
    const w = works[idx];
    resetZoom();
    stage.innerHTML = w.querySelector(".art").outerHTML;
    stage.querySelectorAll("img").forEach((im) => { im.draggable = false; });
    stage.classList.toggle("tall", w.hasAttribute("data-tall"));
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
    title.innerHTML = w.querySelector(".cap b").innerHTML;
    tag.textContent = w.dataset.tag || "";
    count.textContent = pad(idx + 1) + " / " + pad(works.length);
  }

  function open(i) {
    show(i);
    lb.hidden = false;
    document.body.classList.add("lb-open");
    lb.querySelector(".lb-close").focus();
  }

  function close() {
    if (document.fullscreenElement) document.exitFullscreen();
    lb.hidden = true;
    document.body.classList.remove("lb-open");
    works[idx].focus();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (lb.requestFullscreen) lb.requestFullscreen();
  }

  function endDrag() {
    drag = null;
    if (stage) stage.classList.remove("dragging");
  }

  function init() {
    works = [...document.querySelectorAll(".work[data-tag]")];
    lb = document.getElementById("lb");
    if (!lb || !works.length) {
      lb = null;
      return;
    }
    stage = lb.querySelector(".lb-stage");
    title = lb.querySelector(".lb-title");
    tag = lb.querySelector(".lb-tag");
    count = lb.querySelector(".lb-count");
    zoomLabel = lb.querySelector(".lb-zoom");
    const fsBtn = lb.querySelector(".lb-fs");
    idx = 0;
    zoom = 1;
    base = 0;
    drag = null;

    works.forEach((w, i) => w.addEventListener("click", () => open(i)));
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
    lb.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
    lb.querySelector(".lb-zin").addEventListener("click", () => setZoom(zoom * 1.5));
    lb.querySelector(".lb-zout").addEventListener("click", () => setZoom(zoom / 1.5));
    zoomLabel.addEventListener("click", () => setZoom(1));
    fsBtn.addEventListener("click", toggleFullscreen);

    stage.addEventListener("dblclick", (e) => {
      const r = stage.getBoundingClientRect();
      setZoom(zoom > 1 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top);
    });

    stage.addEventListener("wheel", (e) => {
      if (!stage.querySelector("img")) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    stage.addEventListener("dragstart", (e) => e.preventDefault());

    stage.addEventListener("pointerdown", (e) => {
      const scrollable = stage.scrollHeight > stage.clientHeight || stage.scrollWidth > stage.clientWidth;
      if (!scrollable || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add("dragging");
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag) return;
      stage.scrollLeft = drag.sl - (e.clientX - drag.x);
      stage.scrollTop = drag.st - (e.clientY - drag.y);
    });
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
  }

  addEventListener("keydown", (e) => {
    if (!lb || !document.body.contains(lb) || lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "f" || e.key === "F") toggleFullscreen();
    else if (e.key === "+" || e.key === "=") setZoom(zoom * 1.5);
    else if (e.key === "-" || e.key === "_") setZoom(zoom / 1.5);
    else if (e.key === "0") setZoom(1);
  });

  window.initGallery = init;
  init();
})();
