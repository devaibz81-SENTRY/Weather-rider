// 🚀 Weather Rider: V4.5 (Fixed Bar Charts)

const API = {
  GEO: 'https://geocoding-api.open-meteo.com/v1/search',
  WEATHER: 'https://api.open-meteo.com/v1/forecast',
  ROUTE: 'https://router.project-osrm.org/route/v1/driving'
};

const ui = {
  buddy: { wrap: document.getElementById('buddyWrapper'), chat: document.getElementById('buddyChat') },
  tabs: document.querySelectorAll('.tab-btn'),
  dock: document.querySelectorAll('.dock-btn'),
  views: {
    status: document.getElementById('viewStatus'),
    next: document.getElementById('viewNext'),
    outlook: document.getElementById('viewOutlook'),
    risks: document.getElementById('viewRisks'),
    deck: document.getElementById('commandDeck')
  },
  inputs: { start: document.getElementById('startLoc'), end: document.getElementById('endLoc'), time: document.getElementById('startTime'), go: document.getElementById('goBtn'), locate: document.getElementById('locateBtn') },
  status: { temp: document.getElementById('briefTemp'), wind: document.getElementById('briefWind'), rain: document.getElementById('briefRain'), gear: document.getElementById('gearRow') },
  charts: { rain: document.getElementById('rainChart'), temp: document.getElementById('tempChart'), wind: document.getElementById('windChart') },
  timeline: document.getElementById('rideTimeline'),
  outlook: document.getElementById('dailyGrid'),
  risks: document.getElementById('riskList'),
  sim: { overlay: document.getElementById('simOverlay'), close: document.getElementById('closeSim'), slider: document.getElementById('simSlider'), rider: document.getElementById('trackRider'), dist: document.getElementById('simDist'), temp: document.getElementById('simTemp'), wind: document.getElementById('simWind'), time: document.getElementById('simTime') },
  glance: { city: document.getElementById('lastCity'), temp: document.getElementById('lastTemp'), icon: document.getElementById('lastIcon') }
};

const state = {
  mode: 'ride',
  coords: { start: null, end: null },
  weather: null,
  route: null
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('wr_last') || 'London';
  ui.inputs.start.value = last;
  refreshGlance(last);
  buddySay("Charts Upgraded. 📊");
});

// --- INTERACTIONS ---
// Dock
ui.dock.forEach(btn => {
  btn.addEventListener('click', () => {
    ui.dock.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const targetId = btn.dataset.view;
    Object.values(ui.views).forEach(v => {
      if (v.id === 'commandDeck') return;
      v.classList.add('hidden');
    });
    document.getElementById(targetId).classList.remove('hidden');
  });
});

// Theme & Eyes
ui.buddy.wrap.addEventListener('click', () => document.body.classList.toggle('light-mode'));
document.addEventListener('mousemove', (e) => {
  const face = ui.buddy.wrap.getBoundingClientRect();
  const rad = Math.atan2(e.clientX - (face.left + face.width / 2), e.clientY - (face.top + face.height / 2));
  const dist = Math.min(4, Math.hypot(e.clientX - (face.left + face.width / 2), e.clientY - (face.top + face.height / 2)) / 15);
  const mx = Math.sin(rad) * dist; const my = Math.cos(rad) * dist;
  document.querySelectorAll('.eye').forEach(eye => eye.style.transform = `translate(${mx}px, ${my}px)`);
});

ui.tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    ui.tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.type;
    ui.sim.rider.textContent = { ride: '🏍️', run: '🏃', cycle: '🚴' }[state.mode];
  });
});

// --- EXECUTE ---
ui.inputs.go.addEventListener('click', async () => {
  const dest = ui.inputs.end.value;
  if (!dest) return buddySay("Target Required");
  ui.inputs.go.textContent = "📡 SCANNING...";
  ui.inputs.go.style.opacity = "0.7";

  try {
    if (!ui.inputs.start.value) ui.inputs.start.value = 'London';
    const s = await resolve(ui.inputs.start.value);
    const e = await resolve(dest);
    if (!s || !e) throw new Error("Loc Error");

    state.coords.start = s; state.coords.end = e;
    localStorage.setItem('wr_last', s.name);

    let route;
    try { route = await fetchRoute(s, e); } catch { route = calcFallback(s, e); }
    state.route = route;

    const wStart = await fetchWeather(s);
    const wEnd = await fetchWeather(e);
    state.weather = wEnd;

    ui.views.deck.classList.remove('hidden');

    renderStatus(wEnd, route);
    generate3CardSector(route, wStart, wEnd, s.name, e.name);

    // RENDER NEW BAR CHARTS
    renderCharts(wEnd.hourly);

    renderOutlook(wEnd.daily);
    renderRisks(wEnd);

    ui.inputs.go.textContent = "🚀 LAUNCH SIMULATION";
    ui.inputs.go.style.opacity = "1";
    ui.inputs.go.onclick = () => startSim();

    ui.dock[0].click(); // Goto Status

  } catch (err) {
    console.error(err);
    buddySay("Connection Limit. Retry.");
    ui.inputs.go.textContent = "INITIATE SCAN";
    ui.inputs.go.style.opacity = "1";
  }
});

function renderCharts(hourly) {
  // Rain (Simple Bars)
  ui.charts.rain.innerHTML = '';
  for (let i = 0; i < 6; i++) ui.charts.rain.innerHTML += `<div class="c-bar" style="height:${Math.max(hourly.precipitation_probability[new Date().getHours() + i] || 0, 5)}%"></div>`;

  // Temp & Wind (Advanced Bar Charts)
  drawBarChart(ui.charts.temp, hourly.temperature_2m, new Date().getHours(), 6, 'temp');
  drawBarChart(ui.charts.wind, hourly.windspeed_10m, new Date().getHours(), 6, 'wind');
}

function drawBarChart(container, data, start, len, type) {
  container.innerHTML = '';
  const slice = data.slice(start, start + len);

  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = (max - min) || 1;

  const row = document.createElement('div');
  row.className = 'bar-chart-row';

  slice.forEach(val => {
    let pct = 0;
    if (type === 'wind') {
      pct = Math.min(100, Math.max(10, (val / 40) * 100)); // 40kph = max height
    } else {
      pct = 20 + ((val - min) / range) * 80; // Relative scaling
    }

    let cls = type;
    if (type === 'temp' && val < 10) cls += ' cold';
    if (type === 'wind' && val > 20) cls += ' high';

    const col = document.createElement('div');
    col.className = 'b-col';
    col.innerHTML = `
      <span class="b-val">${Math.round(val)}${type === 'temp' ? '°' : 'k'}</span>
      <div class="b-visual ${cls}" style="height:${pct}%"></div>
    `;
    row.appendChild(col);
  });
  container.appendChild(row);
}

// ... Keep other Renderers ...

function renderStatus(data, route) {
  const cur = data.current_weather;
  ui.status.temp.textContent = Math.round(cur.temperature) + '°';
  ui.status.wind.textContent = cur.windspeed + 'k';
  const hIdx = new Date().getHours();
  ui.status.rain.textContent = (data.hourly.precipitation_probability[hIdx] || 0) + '%';
  let gear = [];
  if (state.mode === 'run') gear = ["Hydration Pack", "Run Shoes"];
  else if (state.mode === 'cycle') gear = ["Helmet", "Windbreaker"];
  else gear = ["Leather Jacket", "Visor"];
  if (data.hourly.precipitation_probability[hIdx] > 40) gear.push("Rain Gear");
  ui.status.gear.innerHTML = gear.map(g => `<span class="gear-tag">${g}</span>`).join('');
}

function renderOutlook(daily) {
  const c = ui.outlook; c.innerHTML = '';
  if (!daily) return;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < 7; i++) {
    const dObj = new Date(daily.time[i]);
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const code = daily.weathercode[i];
    let icon = '☀️'; if (code > 3) icon = '☁️'; if (code >= 51) icon = '🌧️';
    c.innerHTML += `<div class="day-row"><span class="day-name">${i === 0 ? "Today" : days[dObj.getDay()]}</span><span class="day-icon">${icon}</span><div class="day-temp"><span>${max}°</span> <small>/ ${min}°</small></div></div>`;
  }
}

function renderRisks(data) {
  const c = ui.risks; c.innerHTML = '';
  const h = data.hourly;
  let risks = 0;
  if (Math.max(...h.windspeed_10m.slice(0, 24)) > 30) { risks++; c.innerHTML += riskHTML("GUSTS", "High winds detected.", "high"); }
  if (Math.max(...h.precipitation_probability.slice(0, 24)) > 50) { risks++; c.innerHTML += riskHTML("RAIN", "Heavy rain expected.", "high"); }
  if (risks === 0) c.innerHTML = `<div class="risk-card" style="border-color:#00ff9d"><div class="r-head">ALL CLEAR</div></div>`;
}
function riskHTML(t, d, l) { return `<div class="risk-card ${l}"><div class="r-head">🚨 ${t}</div><div class="r-desc">${d}</div></div>`; }

function generate3CardSector(route, wStart, wEnd, startName, endName) {
  const c = ui.timeline; c.innerHTML = '';
  const timeInput = ui.inputs.time.value || "10:00";
  let [h, m] = timeInput.split(':').map(Number);
  const durH = route.duration / 3600;

  // Helper
  const getD = (w, off) => {
    const idx = (new Date().getHours() + Math.floor(off)) % 24;
    return { t: w.hourly.temperature_2m[idx], r: w.hourly.precipitation_probability[idx] };
  };

  const sectors = [
    { l: "DEPART", n: startName, d: getD(wStart, 0), off: 0 },
    { l: "MID", n: "Checkpoint", d: getD(wEnd, durH / 2), off: durH / 2 },
    { l: "ARRIVE", n: endName, d: getD(wEnd, durH), off: durH }
  ];

  const row = document.createElement('div');
  row.style.cssText = "display:flex; gap:10px; margin-bottom:15px;";
  sectors.forEach(s => {
    let finalH = h + Math.floor(s.off);
    let finalM = m + Math.floor((s.off % 1) * 60);
    if (finalM >= 60) { finalH++; finalM -= 60; }
    let icon = s.d.r > 30 ? '🌧️' : '☀️';
    row.innerHTML += `<div style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:12px; padding:10px; text-align:center;">
      <div style="font-size:0.6rem; opacity:0.6;">${s.l}</div>
      <div style="font-weight:700; margin:5px 0;">${finalH % 24}:${finalM.toString().padStart(2, '0')}</div>
      <div style="font-size:1.4rem;">${icon}</div>
      <div>${Math.round(s.d.t)}°</div>
    </div>`;
  });
  c.appendChild(row);
}

// SIM
function startSim() { ui.sim.overlay.classList.remove('hidden'); ui.sim.close.onclick = () => ui.sim.overlay.classList.add('hidden'); ui.sim.slider.value = 0; updateSim(0); ui.sim.slider.oninput = (e) => updateSim(e.target.value); }
function updateSim(val) {
  ui.sim.rider.style.left = val + '%';
  if (!state.route || !state.weather) return;
  const pct = val / 100;
  const dist = (state.route.distance / 1000) * pct;
  const secs = state.route.duration * pct;
  const [h, m] = (ui.inputs.time.value || "10:00").split(':').map(Number);
  const mins = (h * 60) + m + (secs / 60);
  ui.sim.time.textContent = `${Math.floor(mins / 60) % 24}:${Math.floor(mins % 60).toString().padStart(2, '0')}`;
  ui.sim.dist.textContent = dist.toFixed(1) + 'km';
  const idx = Math.floor(mins / 60) % 24;
  ui.sim.temp.innerHTML = (state.weather.hourly.temperature_2m[idx] || 0).toFixed(1) + '<small>°</small>';
  ui.sim.wind.innerHTML = (state.weather.hourly.windspeed_10m[idx] || 0).toFixed(0) + '<small>k</small>';
}

// API
async function fetchWeather(c) {
  try {
    const url = `${API.WEATHER}?latitude=${c.latitude}&longitude=${c.longitude}&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&windspeed_unit=kmh`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const d = await res.json();
    if (!d.hourly.windspeed_10m) d.hourly.windspeed_10m = new Array(100).fill(10);
    return d;
  } catch { return { current_weather: { temperature: 20, windspeed: 10 }, hourly: { temperature_2m: Array(48).fill(20), precipitation_probability: Array(48).fill(0), windspeed_10m: Array(48).fill(10) }, daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], weathercode: [] } }; }
}
async function resolve(n) { if (n === "Current Location") return state.coords.start; try { const r = await fetch(`${API.GEO}?name=${n}&count=1`); const d = await r.json(); return d.results ? d.results[0] : null; } catch { return null; } }
async function fetchRoute(s, e) { const r = await fetch(`${API.ROUTE}/${s.longitude},${s.latitude};${e.longitude},${e.latitude}?overview=false`); const d = await r.json(); return { duration: d.routes[0].duration, distance: d.routes[0].distance }; }
function calcFallback(s, e) { return { distance: 50000, duration: 3600 }; }
function refreshGlance(c) { resolve(c).then(l => { if (l) { state.coords.start = l; ui.glance.city.textContent = l.name; fetchWeather(l).then(w => ui.glance.temp.textContent = Math.round(w.current_weather.temperature) + '°'); } }); }
function buddySay(t) { ui.buddy.chat.textContent = t; ui.buddy.chat.classList.remove('hidden'); setTimeout(() => ui.buddy.chat.classList.add('hidden'), 4000); }
ui.inputs.locate.addEventListener('click', () => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => { ui.inputs.start.value = "Current Location"; state.coords.start = { latitude: p.coords.latitude, longitude: p.coords.longitude, name: "GPS" }; refreshGlance("London"); buddySay("Located 🛰️"); }) });
