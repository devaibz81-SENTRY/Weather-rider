// 🚀 Weather Rider: Command Center Edition (Ops Ready)

const API = {
  GEO: 'https://geocoding-api.open-meteo.com/v1/search',
  WEATHER: 'https://api.open-meteo.com/v1/forecast',
  ROUTE: 'https://router.project-osrm.org/route/v1/driving'
};

const ui = {
  buddy: { wrap: document.getElementById('buddyWrapper'), chat: document.getElementById('buddyChat') },
  tabs: document.querySelectorAll('.tab-btn'), // Activity Tabs
  dock: document.querySelectorAll('.dock-btn'), // Bottom Dock Tabs
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

// --- 🎬 INIT ---
document.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('wr_last') || 'London';
  ui.inputs.start.value = last;
  refreshGlance(last);
  buddySay("Command Center Ready. 📡");
});

// --- ⚓ DOCK NAVIGATION ---
ui.dock.forEach(btn => {
  btn.addEventListener('click', () => {
    // 1. UI Toggle
    ui.dock.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 2. View Switch
    const targetId = btn.dataset.view;
    Object.values(ui.views).forEach(v => {
      if (v.id === 'commandDeck') return; // Skip wrapper
      v.classList.add('hidden');
    });
    document.getElementById(targetId).classList.remove('hidden');

    // 3. Buddy reaction
    const names = { viewStatus: "Status Check", viewNext: "Timeline", viewOutlook: "Long Range", viewRisks: "Threat Analysis" };
    buddySay(names[targetId] || "Aye Aye");
  });
});

// --- 👁️ EYE TRACKING & THEME ---
ui.buddy.wrap.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
});

document.addEventListener('mousemove', (e) => {
  const face = ui.buddy.wrap.getBoundingClientRect();
  const faceX = face.left + face.width / 2;
  const faceY = face.top + face.height / 2;
  const rad = Math.atan2(e.clientX - faceX, e.clientY - faceY);
  const dist = Math.min(4, Math.hypot(e.clientX - faceX, e.clientY - faceY) / 15);
  const moveX = Math.sin(rad) * dist;
  const moveY = Math.cos(rad) * dist;
  document.querySelectorAll('.eye').forEach(eye => eye.style.transform = `translate(${moveX}px, ${moveY}px)`);
});

ui.tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    ui.tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.type;
    ui.sim.rider.textContent = { ride: '🏍️', run: '🏃', cycle: '🚴' }[state.mode];
  });
});

// --- 🚀 MAIN EXECUTION ---
ui.inputs.go.addEventListener('click', async () => {
  const dest = ui.inputs.end.value;
  if (!dest) return buddySay("Target Required");

  ui.inputs.go.textContent = "📡 ACQUIRING DATA...";
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

    const weatherStart = await fetchWeather(s);
    const weatherEnd = await fetchWeather(e);
    state.weather = weatherEnd;

    // --- POPULATE COMMAND DECK ---
    ui.views.deck.classList.remove('hidden'); // Show deck area

    // View 1: Status
    renderStatus(weatherEnd, route);

    // View 2: Next (Timeline + Charts)
    generate3CardSector(route, weatherStart, weatherEnd, s.name, e.name);
    renderCharts(weatherEnd.hourly);

    // View 3: Outlook (Daily)
    renderOutlook(weatherEnd.daily);

    // View 4: Risks
    renderRisks(weatherEnd);

    // Ready
    ui.inputs.go.textContent = "🚀 LAUNCH SIMULATION";
    ui.inputs.go.style.opacity = "1";
    ui.inputs.go.onclick = () => startSim();

    // Auto-switch to Status tab
    ui.dock[0].click();

  } catch (err) {
    console.error(err);
    buddySay("Data Link Severed. Retry.");
    ui.inputs.go.textContent = "INITIATE SCAN";
    ui.inputs.go.style.opacity = "1";
  }
});

// --- RENDERERS ---

function renderStatus(data, route) {
  const cur = data.current_weather;
  ui.status.temp.textContent = Math.round(cur.temperature) + '°';
  ui.status.wind.textContent = cur.windspeed + 'k';

  // Rain is hourly-derived usually
  const hIdx = new Date().getHours();
  const rain = data.hourly.precipitation_probability[hIdx] || 0;
  ui.status.rain.textContent = rain + '%';

  // Gear
  let gear = [];
  if (state.mode === 'run') gear = ["Hydration Pack", "Run Shoes"];
  else if (state.mode === 'cycle') gear = ["Helmet", "Windbreaker"];
  else gear = ["Leather Jacket", "Clear Visor"]; // Moto default

  if (rain > 40) gear.push("Rain Gear");
  if (cur.temperature < 10) gear.push("Thermals");

  ui.status.gear.innerHTML = gear.map(g => `<span class="gear-tag">${g}</span>`).join('');
}

function renderOutlook(daily) {
  const container = ui.outlook;
  container.innerHTML = '';
  if (!daily) return;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    // If API gives dates, parse them. OpenMeteo gives array of dates.
    // We assume index 0 is today.
    const dateStr = daily.time[i];
    const dObj = new Date(dateStr);
    const dayName = i === 0 ? "Today" : days[dObj.getDay()];

    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const code = daily.weathercode[i];

    let icon = '☀️';
    if (code > 3) icon = '☁️';
    if (code >= 51) icon = '🌧️';
    if (code >= 71) icon = '❄️';

    container.innerHTML += `
      <div class="day-row">
        <span class="day-name">${dayName}</span>
        <span class="day-icon">${icon}</span>
        <div class="day-temp">
          <span>${max}°</span> <small>/ ${min}°</small>
        </div>
      </div>
    `;
  }
}

function renderRisks(data) {
  const container = ui.risks;
  container.innerHTML = '';

  const h = data.hourly;
  let risksFound = 0;

  // 1. Wind Checks
  const maxWind = Math.max(...h.windspeed_10m.slice(0, 24));
  if (maxWind > 30) {
    risksFound++;
    addRisk("GUST RISK", `High gusts of ${Math.round(maxWind)}kph detected in next 24h. Stability compromised.`, "high");
  } else if (maxWind > 20) {
    risksFound++;
    addRisk("WIND ACTIVITY", `Moderate winds (${Math.round(maxWind)}kph). Minor drag expected.`, "med");
  }

  // 2. Rain Checks
  const maxRain = Math.max(...h.precipitation_probability.slice(0, 24));
  if (maxRain > 60) {
    risksFound++;
    addRisk("RAIN IMPACT", `Heavy rain (${maxRain}%) inbound. Traction critical.`, "high");
  } else if (maxRain > 20) {
    risksFound++;
    addRisk("PRECIPITATION", `Scattered showers (${maxRain}%). Visor drops.`, "med");
  }

  // 3. Temp Checks
  const curT = data.current_weather.temperature;
  if (curT < 5) {
    risksFound++;
    addRisk("COLD STRESS", "Low tarmac temps. Reduced grip.", "med");
  }

  if (risksFound === 0) {
    container.innerHTML = `<div class="risk-card" style="border-color:#00ff9d"><div class="r-head">ALL CLEAR</div><div class="r-desc">No significant operational risks detected.</div></div>`;
  }

  function addRisk(title, desc, level) {
    container.innerHTML += `
      <div class="risk-card ${level}">
        <div class="r-head">🚨 ${title}</div>
        <div class="r-desc">${desc}</div>
      </div>
    `;
  }
}

// ... Keep Timeline, Chart, Sim Functions ...
function generate3CardSector(route, wStart, wEnd, startName, endName) {
  const container = ui.timeline;
  container.innerHTML = '';
  const timeInput = ui.inputs.time.value || "10:00";
  let [h, m] = timeInput.split(':').map(Number);
  const durH = route.duration / 3600;

  const getCond = (wObj, offsetH) => {
    const idx = (new Date().getHours() + Math.floor(offsetH)) % 24;
    return {
      t: wObj.hourly.temperature_2m[idx] || 0,
      r: wObj.hourly.precipitation_probability[idx] || 0,
    };
  };

  const sectors = [
    { label: "DEPARTURE", name: startName, cond: getCond(wStart, 0), timeOff: 0 },
    { label: "MID-POINT", name: "Sector 2", cond: { t: (getCond(wStart, 0).t + getCond(wEnd, durH).t) / 2, r: Math.max(getCond(wStart, 0).r, getCond(wEnd, durH).r) }, timeOff: durH / 2 },
    { label: "ARRIVAL", name: endName, cond: getCond(wEnd, durH), timeOff: durH }
  ];

  const row = document.createElement('div');
  row.style.cssText = "display:flex; gap:10px; margin-bottom:15px;";

  sectors.forEach(s => {
    let finalH = h + Math.floor(s.timeOff);
    let finalM = m + Math.floor((s.timeOff % 1) * 60);
    if (finalM >= 60) { finalH++; finalM -= 60; }

    let icon = s.cond.r > 20 ? (s.cond.r > 50 ? '🌧️' : '☁️') : '☀️';
    let status = s.cond.r > 40 ? "rgba(255, 77, 77, 0.1)" : "rgba(255,255,255,0.05)";
    let border = s.cond.r > 40 ? "#ff4d4d" : "var(--border)";

    row.innerHTML += `
      <div style="flex:1; background:${status}; border:1px solid ${border}; border-radius:12px; padding:10px; text-align:center;">
        <div style="font-size:0.6rem; opacity:0.6;">${s.label}</div>
        <div style="font-weight:700; margin:5px 0;">${finalH % 24}:${finalM.toString().padStart(2, '0')}</div>
        <div style="font-size:1.4rem;">${icon}</div>
        <div>${Math.round(s.cond.t)}°</div>
      </div>`;
  });
  container.appendChild(row);
}

function renderCharts(hourly) {
  ui.charts.rain.innerHTML = '';
  for (let i = 0; i < 6; i++) ui.charts.rain.innerHTML += `<div class="c-bar" style="height:${Math.max(hourly.precipitation_probability[new Date().getHours() + i] || 0, 5)}%"></div>`;
  drawLine(ui.charts.temp, hourly.temperature_2m, new Date().getHours(), 6, 'temp');
  drawLine(ui.charts.wind, hourly.windspeed_10m, new Date().getHours(), 6, 'wind');
}

function drawLine(container, data, start, len, type) {
  const slice = data.slice(start, start + len);
  const min = Math.min(...slice);
  const diff = (Math.max(...slice) - min) || 1;
  const pts = slice.map((v, i) => `${(i / (len - 1)) * 100},${40 - ((v - min) / diff) * 30 - 5}`).join(' ');
  const avg = slice.reduce((a, b) => a + b, 0) / len;
  let cls = 'line-ok';
  if (type === 'temp') cls = avg > 25 ? 'line-hot' : (avg < 10 ? 'line-cold' : 'line-ok');
  if (type === 'wind' && avg > 25) cls = 'line-cold';
  container.innerHTML = `<div class="chart-container-relative"><svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="${pts}" class="chart-line ${cls}" vector-effect="non-scaling-stroke"></polyline></svg></div>`;
}

// SIMULATION
function startSim() {
  ui.sim.overlay.classList.remove('hidden');
  ui.sim.close.onclick = () => ui.sim.overlay.classList.add('hidden');
  ui.sim.slider.value = 0; updateSim(0);
  ui.sim.slider.oninput = (e) => updateSim(e.target.value);
}
function updateSim(val) {
  ui.sim.rider.style.left = val + '%';
  if (!state.route || !state.weather) return;
  const pct = val / 100;
  // Sim Logic same as before...
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
  const url = `${API.WEATHER}?latitude=${c.latitude}&longitude=${c.longitude}&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&windspeed_unit=kmh`;
  const res = await fetch(url);
  if (!res.ok) throw new Error();
  const d = await res.json();
  if (!d.hourly.windspeed_10m) d.hourly.windspeed_10m = new Array(100).fill(10);
  return d;
}
async function resolve(n) { /* Same */ if (n === "Current Location") return state.coords.start; try { const r = await fetch(`${API.GEO}?name=${n}&count=1`); const d = await r.json(); return d.results ? d.results[0] : null; } catch { return null; } }
async function fetchRoute(s, e) { const r = await fetch(`${API.ROUTE}/${s.longitude},${s.latitude};${e.longitude},${e.latitude}?overview=false`); const d = await r.json(); return { duration: d.routes[0].duration, distance: d.routes[0].distance }; }
function calcFallback(s, e) { return { distance: 50000, duration: 3600 }; }
function refreshGlance(c) { resolve(c).then(l => { if (l) { state.coords.start = l; ui.glance.city.textContent = l.name; fetchWeather(l).then(w => ui.glance.temp.textContent = Math.round(w.current_weather.temperature) + '°'); } }); }
function buddySay(t) { ui.buddy.chat.textContent = t; ui.buddy.chat.classList.remove('hidden'); setTimeout(() => ui.buddy.chat.classList.add('hidden'), 4000); }
ui.inputs.locate.addEventListener('click', () => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => { ui.inputs.start.value = "Current Location"; state.coords.start = { latitude: p.coords.latitude, longitude: p.coords.longitude, name: "GPS" }; refreshGlance("London"); buddySay("Located 🛰️"); }) });
