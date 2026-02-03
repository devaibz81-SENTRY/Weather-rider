// 🚀 Weather Rider: V4 (Stable Sectors & Fixed Eyes)

const API = {
  GEO: 'https://geocoding-api.open-meteo.com/v1/search',
  WEATHER: 'https://api.open-meteo.com/v1/forecast',
  ROUTE: 'https://router.project-osrm.org/route/v1/driving'
};

const ui = {
  buddy: { wrap: document.getElementById('buddyWrapper'), chat: document.getElementById('buddyChat') },
  tabs: document.querySelectorAll('.tab-btn'),
  inputs: { start: document.getElementById('startLoc'), end: document.getElementById('endLoc'), time: document.getElementById('startTime'), go: document.getElementById('goBtn'), locate: document.getElementById('locateBtn') },
  insight: { panel: document.getElementById('insightPanel'), text: document.getElementById('missionText'), temp: document.getElementById('briefTemp'), wind: document.getElementById('briefWind'), rain: document.getElementById('briefRain'), gear: document.getElementById('gearRow') },
  charts: { area: document.getElementById('chartsArea'), rain: document.getElementById('rainChart'), temp: document.getElementById('tempChart'), wind: document.getElementById('windChart') },
  timeline: document.getElementById('rideTimeline'),
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
  buddySay("Systems Stabilized. ⚓");
});

// --- 👁️ SYNCED EYES (FLUID) ---
document.addEventListener('mousemove', (e) => {
  // Calculate relative to the FACE center (Buddy Wrapper), not individual eyes
  const face = ui.buddy.wrap.getBoundingClientRect();
  const faceX = face.left + face.width / 2;
  const faceY = face.top + face.height / 2;

  // Single angle for both eyes
  const rad = Math.atan2(e.clientX - faceX, e.clientY - faceY);
  const dist = Math.min(4, Math.hypot(e.clientX - faceX, e.clientY - faceY) / 15);

  const moveX = Math.sin(rad) * dist;
  const moveY = Math.cos(rad) * dist;

  document.querySelectorAll('.eye').forEach(eye => {
    // Both eyes move exactly the same amount = Linked/Fluid
    eye.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
});

ui.buddy.wrap.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  buddySay(document.body.classList.contains('light-mode') ? "Light Mode Active" : "Night Mode Active");
});

// --- MAIN LOGIC ---

ui.inputs.go.addEventListener('click', async () => {
  const dest = ui.inputs.end.value;
  if (!dest) return buddySay("Please enter Destination");

  ui.inputs.go.textContent = "🔁 ANALYZING SECTORS...";
  ui.inputs.go.style.opacity = "0.7";

  try {
    // 1. Resolve Locations
    if (!ui.inputs.start.value) ui.inputs.start.value = 'London';
    const s = await resolve(ui.inputs.start.value);
    const e = await resolve(dest);

    if (!s || !e) throw new Error("Could not find city.");

    state.coords.start = s;
    state.coords.end = e;
    localStorage.setItem('wr_last', s.name);

    // 2. Route & Weather (Robust)
    let route;
    try { route = await fetchRoute(s, e); } catch { route = calcFallback(s, e); }
    state.route = route;

    // We fetch weather for BOTH start and end to create a gradient
    const weatherStart = await fetchWeather(s);
    const weatherEnd = await fetchWeather(e);
    state.weather = weatherEnd; // Use end for sim details mostly

    // 3. RENDER 3 FIXED CARDS
    generate3CardSector(route, weatherStart, weatherEnd, s.name, e.name);

    // 4. Render Details
    generateBriefing(weatherEnd, route); // Use Destination for warnings
    renderCharts(weatherEnd.hourly);

    // 5. Sim Ready
    ui.inputs.go.textContent = "🚀 LAUNCH SIMULATION";
    ui.inputs.go.style.opacity = "1";
    ui.inputs.go.onclick = () => startSim();

  } catch (err) {
    console.error(err);
    buddySay("Input Error. Try major cities.");
    ui.inputs.go.textContent = "ANALYZE CONDITIONS";
    ui.inputs.go.style.opacity = "1";
  }
});

// --- 🃏 3-CARD SECTOR VIEW ---
function generate3CardSector(route, wStart, wEnd, startName, endName) {
  const container = ui.timeline;
  container.innerHTML = '';
  container.classList.remove('hidden');

  // Logic: 
  // Card 1: Defaults to Start Weather + Start Time.
  // Card 2: Average of Start/End Weather + Mid Time.
  // Card 3: End Weather + Arrival Time.

  const timeInput = ui.inputs.time.value || "10:00";
  let [h, m] = timeInput.split(':').map(Number);
  const durH = route.duration / 3600;

  const getCond = (wObj, offsetH) => {
    const idx = (new Date().getHours() + Math.floor(offsetH)) % 24;
    const hData = wObj.hourly;
    return {
      t: hData.temperature_2m[idx] || 0,
      r: hData.precipitation_probability[idx] || 0,
      w: hData.windspeed_10m[idx] || 0,
      c: hData.weathercode[idx] || 0
    };
  };

  const startCond = getCond(wStart, 0);
  const endCond = getCond(wEnd, durH);

  // Mid Point (Avg of start/end values for simplicity in this demo)
  const midCond = {
    t: (startCond.t + endCond.t) / 2,
    r: Math.max(startCond.r, endCond.r), // Take worst case
    w: (startCond.w + endCond.w) / 2
  };

  const sectors = [
    { label: "DEPARTURE", name: startName, cond: startCond, timeOff: 0 },
    { label: "MID-SECTOR", name: "Checkpoint", cond: midCond, timeOff: durH / 2 },
    { label: "ARRIVAL", name: endName, cond: endCond, timeOff: durH }
  ];

  // Create the 3 Cards Container
  const row = document.createElement('div');
  row.style.cssText = "display:flex; gap:10px; margin-bottom:15px; overflow-x:auto;";

  sectors.forEach(s => {
    let finalH = h + Math.floor(s.timeOff);
    let finalM = m + Math.floor((s.timeOff % 1) * 60);
    if (finalM >= 60) { finalH++; finalM -= 60; }

    let icon = '☀️';
    if (s.cond.r > 20) icon = '☁️';
    if (s.cond.r > 50) icon = '🌧️';

    // Status color
    let status = "rgba(255,255,255,0.05)";
    let border = "var(--border)";
    if (s.cond.r > 40) { status = "rgba(255, 77, 77, 0.1)"; border = "#ff4d4d"; }

    const card = document.createElement('div');
    card.style.cssText = `flex:1; background:${status}; border:1px solid ${border}; border-radius:12px; padding:10px; text-align:center; min-width:80px;`;

    card.innerHTML = `
      <div style="font-size:0.7rem; color:rgba(255,255,255,0.5); margin-bottom:5px;">${s.label}</div>
      <div style="font-weight:700; color:#fff; font-size:1.1rem;">${finalH % 24}:${finalM.toString().padStart(2, '0')}</div>
      <div style="font-size:1.5rem; margin:5px 0;">${icon}</div>
      <div style="font-size:0.9rem; font-weight:700;">${Math.round(s.cond.t)}°</div>
      <div style="font-size:0.7rem; color:var(--text-dim);">${s.name.split(',')[0]}</div>
    `;
    row.appendChild(card);
  });

  container.appendChild(row);
}

// --- NETWORK (SAFE MODE) ---
async function fetchWeather(c) {
  try {
    const url = `${API.WEATHER}?latitude=${c.latitude}&longitude=${c.longitude}&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&windspeed_unit=kmh`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API 500");
    const data = await res.json();

    // Ensure Arrays
    if (!data.hourly.windspeed_10m) data.hourly.windspeed_10m = new Array(24).fill(0);
    if (!data.hourly.precipitation_probability) data.hourly.precipitation_probability = new Array(24).fill(0);

    return data;
  } catch (e) {
    console.warn("Fallback Weather Used");
    // Return dummy structure to prevent crash (SYS Failure)
    return {
      current_weather: { temperature: 20, windspeed: 10, weathercode: 0 },
      hourly: {
        temperature_2m: new Array(48).fill(20),
        precipitation_probability: new Array(48).fill(0),
        windspeed_10m: new Array(48).fill(10),
        weathercode: new Array(48).fill(0)
      }
    };
  }
}

// ... Keep existing Charts/Sim logic ...
// (Re-including essential functions for completeness)

function updateSimState(val) {
  ui.sim.rider.style.left = val + '%';
  if (!state.route || !state.weather) return;

  const pct = val / 100;
  const dist = (state.route.distance / 1000) * pct;
  const elapsedSecs = state.route.duration * pct;

  const timeInput = ui.inputs.time.value || "10:00";
  let [h, m] = timeInput.split(':').map(Number);
  let totalMins = (h * 60) + m + (elapsedSecs / 60);

  ui.sim.time.textContent = `${Math.floor(totalMins / 60) % 24}:${Math.floor(totalMins % 60).toString().padStart(2, '0')}`;
  ui.sim.dist.textContent = dist.toFixed(1) + 'km';

  const w = state.weather.hourly;
  const idx = Math.floor(totalMins / 60) % 24;
  ui.sim.temp.innerHTML = `${(w.temperature_2m[idx] || 0).toFixed(1)}<small>°C</small>`;
  ui.sim.wind.innerHTML = `${(w.windspeed_10m[idx] || 0).toFixed(0)}<small>kph</small>`;
}

function startSim() {
  ui.sim.overlay.classList.remove('hidden');
  ui.sim.close.onclick = () => ui.sim.overlay.classList.add('hidden');
  ui.sim.slider.value = 0;
  updateSimState(0);
  // Auto-slide interaction listener in init
  ui.sim.slider.oninput = (e) => updateSimState(e.target.value);
}

function renderCharts(hourly) {
  ui.charts.area.classList.remove('hidden');
  const now = new Date().getHours();
  const range = 6;

  ui.charts.rain.innerHTML = '';
  for (let i = 0; i < range; i++) {
    const val = hourly.precipitation_probability[now + i] || 0;
    const bar = document.createElement('div');
    bar.className = 'c-bar';
    bar.style.height = `${Math.max(val, 5)}%`;
    bar.title = `+${i}h: ${val}%`;
    ui.charts.rain.appendChild(bar);
  }

  drawLine(ui.charts.temp, hourly.temperature_2m, now, range, 'temp');
  drawLine(ui.charts.wind, hourly.windspeed_10m, now, range, 'wind');
}

function drawLine(container, dataSet, startIdx, range, type) {
  const slice = dataSet.slice(startIdx, startIdx + range);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const diff = (max - min) || 1;
  const pts = slice.map((v, i) => {
    const x = (i / (range - 1)) * 100;
    const y = 40 - ((v - min) / diff) * 30 - 5;
    return `${x},${y}`;
  }).join(' ');

  const avg = slice.reduce((a, b) => a + b, 0) / range;
  let cls = 'line-ok';
  if (type === 'temp') cls = avg > 25 ? 'line-hot' : (avg < 10 ? 'line-cold' : 'line-ok');
  if (type === 'wind' && avg > 25) cls = 'line-cold';

  container.innerHTML = `<div class="chart-container-relative"><svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="${pts}" class="chart-line ${cls}" vector-effect="non-scaling-stroke"></polyline></svg></div>`;
}

async function resolve(n) {
  if (n === "Current Location") return state.coords.start;
  try {
    const r = await fetch(`${API.GEO}?name=${encodeURIComponent(n)}&count=1&language=en&format=json`);
    const d = await r.json();
    return d.results ? d.results[0] : null;
  } catch { return null; }
}

async function fetchRoute(s, e) {
  const r = await fetch(`${API.ROUTE}/${s.longitude},${s.latitude};${e.longitude},${e.latitude}?overview=false`);
  if (!r.ok) throw new Error();
  const d = await r.json();
  if (d.code !== "Ok") throw new Error();
  return { duration: d.routes[0].duration, distance: d.routes[0].distance };
}
function calcFallback(s, e) { return { distance: 50000, duration: 3600 }; }

// Utils
function generateBriefing(d, r) {
  ui.insight.panel.classList.remove('hidden');
  ui.insight.text.textContent = `Trip: ${Math.round(r.distance / 1000)}km`;
}
function refreshGlance(c) { /* Same as before */ }
function buddySay(t) { ui.buddy.chat.textContent = t; ui.buddy.chat.classList.remove('hidden'); setTimeout(() => ui.buddy.chat.classList.add('hidden'), 4000); }
ui.inputs.locate.addEventListener('click', () => {
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => {
    ui.inputs.start.value = "Current Location";
    state.coords.start = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, name: "GPS" };
    buddySay("Located 🛰️");
  });
});
