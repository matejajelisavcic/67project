// Wires the map, tabs, search and dashboard together.
(function () {
  const M = window.MCAP, data = window.MCAP_DATA;
  if (!data) { document.getElementById("dash").innerHTML = "<p>data/mcap_data.js is missing. Run tools/build_data.py.</p>"; return; }

  const $ = id => document.getElementById(id);
  const svg = $("map"), dash = $("dash"), tip = $("tip"), tabs = $("tabs"), search = $("search"), tl = $("timeline");
  const byName = Object.fromEntries(data.counties.map(c => [c.name, c]));
  const YEARS = M.yearsOf(data), PROJ = data.meta.proj_year;

  const state = { metric: "projmarg", county: null, year: PROJ };
  let specs = M.map.metrics(data, state.year);
  let counts = countsFor(state.year);

  function countsFor(year) {
    const n = { Blue: 0, Purple: 0, Red: 0 };
    data.counties.forEach(c => n[M.classify(M.marginAt(data, c.name, year))]++);
    return n;
  }

  // ---------------------------------------------------------- map
  const { paths, zoom, refreshSelection } = M.map.build(svg, data, name => state.county === name ? clear() : select(name));

  $("zoomIn").addEventListener("click", () => zoom.in());
  $("zoomOut").addEventListener("click", () => zoom.out());
  $("zoomReset").addEventListener("click", () => zoom.reset());

  function paint() {
    const spec = specs[state.metric];
    data.counties.forEach(c => paths[c.name].setAttribute("fill", spec.color(spec.value(c.name))));
    $("mapTitle").textContent = spec.title;
    $("mapSub").textContent = spec.sub + ". Hover for the number, click a county to open its dashboard.";
    $("legend").innerHTML = M.map.legendHtml(spec, counts);
    tabs.querySelectorAll("button").forEach(b => {
      const sp = specs[b.dataset.key];
      b.textContent = sp.tabLabel || b.dataset.label;
      b.setAttribute("aria-selected", b.dataset.key === state.metric);
      b.disabled = !!sp.unavailable;
      b.title = sp.unavailable || "";
    });
    tl.querySelectorAll(".tl-pt").forEach(b => b.setAttribute("aria-pressed", +b.dataset.year === state.year));
  }

  // tooltip
  svg.addEventListener("mousemove", e => {
    const p = e.target.closest(".cty");
    if (!p) { tip.style.display = "none"; return; }
    const n = p.dataset.n, spec = specs[state.metric], marg = M.marginAt(data, n, state.year);
    const main = spec.tip ? spec.tip(n) : `${spec.title}: ${(+spec.value(n)).toFixed(2)}`;
    const extra = spec.tip ? "" : ` · ${M.fmtMargin(marg)}`;
    tip.innerHTML = `<b>${M.esc(n)} County</b>${M.esc(main)} · ${M.classify(marg)}${extra}`;
    tip.style.display = "block";
    const x = Math.min(e.clientX + 14, window.innerWidth - 240), y = e.clientY + 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  });
  svg.addEventListener("mouseleave", () => { tip.style.display = "none"; });

  // ---------------------------------------------------------- tabs
  M.map.TABS.forEach(([key, label]) => {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.key = key; b.dataset.label = label; b.textContent = label; b.setAttribute("role", "tab");
    b.addEventListener("click", () => { state.metric = key; paint(); writeHash(); });
    tabs.appendChild(b);
  });

  // ---------------------------------------------------------- timeline
  YEARS.forEach(y => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tl-pt" + (y === PROJ ? " proj" : "");
    b.dataset.year = y;
    b.innerHTML = `<i></i><span>${y}</span>`;
    b.title = y === PROJ ? `${y} model projection` : `${y} actual result`;
    b.addEventListener("click", () => setYear(y));
    tl.appendChild(b);
  });
  tl.addEventListener("keydown", e => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    // Step from whichever point has focus, falling back to the selected year,
    // so arrowing after tabbing in starts where the reader is looking.
    const from = e.target.closest(".tl-pt");
    const i = YEARS.indexOf(from ? +from.dataset.year : state.year) + step;
    if (i < 0 || i >= YEARS.length) return;
    setYear(YEARS[i]);
    tl.children[i].focus();
  });

  function setYear(year) {
    if (year === state.year) return;
    state.year = year;
    specs = M.map.metrics(data, year);
    counts = countsFor(year);
    if (specs[state.metric].unavailable) state.metric = "projmarg";
    paint();
    // Re-render the dashboard in place; the page should not jump under the
    // reader just because they stepped along the timeline.
    if (state.county) select(state.county, true); else clear();
    writeHash();
  }

  // ---------------------------------------------------------- search
  const dl = $("countyList");
  data.counties.map(c => c.name).sort().forEach(n => { const o = document.createElement("option"); o.value = n; dl.appendChild(o); });
  function trySearch() {
    const q = search.value.trim().toLowerCase().replace(/\s+county$/, "");
    if (!q) return;
    const hit = data.counties.find(c => c.name.toLowerCase() === q) ||
                data.counties.find(c => c.name.toLowerCase().startsWith(q));
    if (hit) { select(hit.name); search.value = ""; search.blur(); }
  }
  search.addEventListener("change", trySearch);
  search.addEventListener("keydown", e => { if (e.key === "Enter") trySearch(); });

  // ---------------------------------------------------------- selection
  function select(name, keepScroll) {
    if (!byName[name]) return;
    state.county = name;
    Object.values(paths).forEach(p => p.classList.remove("sel"));
    const p = paths[name];
    p.classList.add("sel");
    p.parentNode.appendChild(p);              // draw selected outline on top
    refreshSelection();
    dash.innerHTML = M.panels.dashboard(byName[name], data, state.year);
    positionEduLegend();
    document.title = `${name} County — Pennsylvania County Outlook`;
    writeHash();
    // Stacked layout: scroll the dashboard up to just below the sticky header,
    // whose height changes as it wraps, so nothing lands underneath it.
    if (!keepScroll && window.innerWidth <= 1100) {
      const head = document.querySelector(".top").offsetHeight;
      window.scrollTo({ top: dash.getBoundingClientRect().top + window.scrollY - head - 10, behavior: "smooth" });
    }
  }
  function clear() {
    state.county = null;
    Object.values(paths).forEach(p => p.classList.remove("sel"));
    refreshSelection();
    dash.innerHTML = M.panels.statewide(data, state.year);
    document.title = "Pennsylvania County Outlook — MCAP";
    writeHash();
  }

  dash.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.county) select(b.dataset.county);
    if (b.dataset.act === "print") window.print();
    if (b.dataset.act === "clear") clear();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && state.county) clear(); });

  $("mapPng").addEventListener("click", () => {
    M.map.downloadPng(svg, `pa_${state.metric}${state.county ? "_" + state.county : ""}.png`);
  });

  // Legend label 2 follows label 1's rendered width, so it never overlaps
  // regardless of county name length (measured, not estimated).
  function positionEduLegend() {
    dash.querySelectorAll('svg.chart').forEach(svg => {
      const t1 = svg.querySelector('#lbl1'), l2 = svg.querySelector('#lbl2line'), t2 = svg.querySelector('#lbl2');
      if (!t1 || !l2 || !t2) return;
      const x = t1.getBBox().x + t1.getBBox().width + 14;
      l2.setAttribute('x1', x); l2.setAttribute('x2', x + 18);
      t2.setAttribute('x', x + 24);
    });
  }

  // ---------------------------------------------------------- URL hash
  function writeHash() {
    const parts = [];
    if (state.metric !== "projmarg") parts.push("view=" + state.metric);
    if (state.year !== PROJ) parts.push("year=" + state.year);
    if (state.county) parts.push("county=" + encodeURIComponent(state.county));
    const h = parts.length ? "#" + parts.join("&") : "";
    if (h !== location.hash) history.replaceState(null, "", location.pathname + location.search + h);
  }
  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    const v = q.get("view"), c = q.get("county"), y = +q.get("year");
    state.year = YEARS.includes(y) ? y : PROJ;
    specs = M.map.metrics(data, state.year);
    counts = countsFor(state.year);
    state.metric = v && specs[v] && !specs[v].unavailable ? v : "projmarg";
    paint();
    if (c && byName[c]) select(c); else clear();
  }
  window.addEventListener("hashchange", readHash);

  // ---------------------------------------------------------- boot
  if (data.meta.demo) $("demoChip").hidden = false;
  readHash();
})();
