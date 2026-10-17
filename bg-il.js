(function () {
  const layer = document.createElement("div");
  layer.className = "il-bg";
  layer.setAttribute("aria-hidden", "true");
  const rot = document.createElement("div");
  rot.className = "il-rot";
  layer.appendChild(rot);
  document.body.prepend(layer);

  const unit = "IL     ";
  const speeds = [18, 24, 30];
  const loopUnits = 16;

  function measure() {
    const probe = document.createElement("div");
    probe.className = "il-row";
    probe.style.animation = "none";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.textContent = unit.repeat(20);
    rot.appendChild(probe);
    const w = probe.getBoundingClientRect().width / 20;
    probe.remove();
    return w;
  }

  function build() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const size = w < 700 ? 40 : 60;
    const pitch = Math.round(size * 1.9);
    const diag = Math.ceil(Math.hypot(w, h));
    const count = Math.ceil(diag / pitch) + 2;
    layer.style.setProperty("--il-size", size + "px");
    layer.style.setProperty("--il-pitch", pitch + "px");
    rot.style.height = count * pitch + "px";
    rot.textContent = "";
    const unitW = measure() || size * 3;
    const shift = unitW * loopUnits;
    const repeats = Math.ceil((diag + shift) / unitW) + 4;
    const text = unit.repeat(repeats);
    for (let i = 0; i < count; i++) {
      const row = document.createElement("div");
      row.className = "il-row";
      row.textContent = text;
      const speed = speeds[i % speeds.length];
      row.style.setProperty("--il-shift", shift + "px");
      row.style.animationDuration = shift / speed + "s";
      row.style.animationDelay = -((i * 53) % Math.round(shift / speed)) + "s";
      row.style.marginLeft = -(diag / 2 + unitW * 2) - (i % 2 ? unitW * 0.5 : 0) + "px";
      rot.appendChild(row);
    }
  }

  let timer = 0;
  addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(build, 200);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  else build();
})();
