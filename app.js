// 🚀 Weather Rider: Ultimate Edition (Interactive Charts & Themes)

const API = {
  GEO: 'https://geocoding-api.open-meteo.com/v1/search',
  WEATHER: 'https://api.open-meteo.com/v1/forecast',
  ROUTE: 'https://router.project-osrm.org/route/v1/driving'
};

const ui = {
  buddy: { wrap: document.getElementById('buddyWrapper'), chat: document.getElementById('buddyChat') },
  tabs: document.querySelectorAll('.tab-btn'),
  inputs: { start: document.getElementById('startLoc'), end: document.getElementById('endLoc'), go: document.getElementById('goBtn'), locate: document.getElementById('locateBtn') },
  insight: { panel: document.getElementById('insightPanel'), text: document.getElementById('missionText'), temp: document.getElementById('briefTemp'), wind: document.getElementById('briefWind'), rain: document.getElementById('briefRain'), gear: document.getElementById('gearRow') },
  charts: { area: document.getElementById('chartsArea'), rain: document.getElementById('rainChart'), temp: document.getElementById('tempChart'), wind: document.getElementById('windChart') },
  sim: { overlay: document.getElementById('simOverlay'), close: document.getElementById('closeSim'), fill: document.getElementById('trackFill'), rider: document.getElementById('trackRider'), dist: document.getElementById('simDist'), temp: document.getElementById('simTemp'), wind: document.getElementById('simWind') },
  glance: { city: document.getElementById('lastCity'), temp: document.getElementById('lastTemp'), icon: document.getElementById('lastIcon') }
};

const state = {
  mode: 'ride',
  coords: { start: null, end: null },
  weather: null,
  simTimer: null
};

// --- 🎬 INIT ---
document.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('wr_last') || 'London';
  ui.inputs.start.value = last;
  refreshGlance(last);
  buddySay("Systems Online. 👁️");
});

// --- 👁️ INTERACTIONS ---
// Buddy Click: Toggle Theme
ui.buddy.wrap.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  buddySay(isLight ? "Light Mode Active ☀️" : "Dark Mode Active 🌙");
});

// Buddy Eyes (HTML Mouse movement handled in previous steps or CSS, simple JS follower here)
document.addEventListener('mousemove', (e) => {
  const eyes = document.querySelectorAll('.eye');
  eyes.forEach(eye => {
    const rect = eye.getBoundingClientRect();
    const x = (rect.left) + (rect.width / 2);
    const y = (rect.top) + (rect.height / 2);
    const rad = Math.atan2(e.pageX - x, e.pageY - y);
    const rot = (rad * (180 / Math.PI) * -1) + 180;
    eye.style.transform = `rotate(${rot}deg)`;
  });
});

ui.tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    ui.tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.type;
    const icons = { ride: '🏍️', run: '🏃', cycle: '🚴' };
    ui.sim.rider.textContent = icons[state.mode];
    buddySay(`Switching to ${state.mode.toUpperCase()}`);
  });
});

ui.inputs.go.addEventListener('click', async () => {
  const dest = ui.inputs.end.value;
  if (!dest) return buddySay("Destination Required! 🎯");

  ui.inputs.go.textContent = "🔁 SCANNING...";
  ui.inputs.go.style.opacity = "0.7";

  try {
    if (!ui.inputs.start.value) ui.inputs.start.value = 'London';
    const s = await resolve(ui.inputs.start.value);
    const e = await resolve(dest);
    if (!s || !e) throw new Error("Location Error");

    state.coords.start = s;
    state.coords.end = e;
    localStorage.setItem('wr_last', s.name);

    // Route & Weather
    let route;
    try { route = await fetchRoute(s, e); } catch { route = calcFallback(s, e); }

    const weather = await fetchWeather(e);
    state.weather = weather;

    // RENDER
    generateBriefing(weather, route);
    renderCharts(weather.hourly);

    // Switch to Sim Launch
    ui.inputs.go.textContent = "🚀 LAUNCH SIMULATION";
    ui.inputs.go.style.opacity = "1";
    ui.inputs.go.onclick = () => startSim(route, weather);

  } catch (err) {
    console.error(err);
    buddySay("Nav Failure. Check Names.");
    ui.inputs.go.textContent = "ANALYZE CONDITIONS";
    ui.inputs.go.style.opacity = "1";
  }
});

function generateBriefing(data, route) {
  ui.insight.panel.classList.remove('hidden');
  const cur = data.current_weather;
  const hr = data.hourly;
  const idx = new Date().getHours();

  ui.insight.temp.textContent = Math.round(cur.temperature) + '°';
  ui.insight.wind.textContent = cur.windspeed + 'k';
  ui.insight.rain.textContent = (hr.precipitation_probability[idx] || 0) + '%';

  // Advanced Advice
  let advice = "";
  let gear = [];

  if (state.mode === 'run') {
    advice = cur.temperature > 20 ? "High Heat. Maintain Hydration." : "Conditions Optimal.";
    gear = ["Shoes 👟", "Water 💧"];
  } else if (state.mode === 'cycle') {
    advice = cur.windspeed > 15 ? "Strong Headwind. Power Up." : "Aero Green.";
    gear = ["Helmet ⛑️", "Gloves 🧤"];
  } else {
    advice = (hr.precipitation_probability[idx] > 30) ? "Wet Asphalt. Engagement Caution." : "Tarmac Dry. Send it.";
    gear = ["Jacket 🧥", "Visor 🧽"];
  }

  ui.insight.text.textContent = `Dist: ${Math.round(route.distance / 1000)}km. ${advice}`;
  ui.insight.gear.innerHTML = gear.map(g => `<span class="gear-tag">${g}</span>`).join('');
}

// --- 📊 CHART ENGINE V2 ---
function renderCharts(hourly) {
  ui.charts.area.classList.remove('hidden');
  const now = new Date().getHours();
  const range = 6;

  // 1. Rain Bars
  ui.charts.rain.innerHTML = '';
  for (let i = 0; i < range; i++) {
    const val = hourly.precipitation_probability[now + i] || 0;
    const bar = document.createElement('div');
    bar.className = 'c-bar';
    bar.style.height = `${Math.max(val, 5)}%`;
    bar.title = `+${i}h: ${val}% Rain`; // Tooltip
    ui.charts.rain.appendChild(bar);
  }

  // 2. Interactive Lines
  drawInteractiveLine(ui.charts.temp, hourly.temperature_2m, now, range, 'temp');
  drawInteractiveLine(ui.charts.wind, hourly.windspeed_10m, now, range, 'wind');
}

function drawInteractiveLine(container, dataSet, startIdx, range, type) {
  // Clear container but ensure we keep wrapper structure intact or rebuild it
  // Simplest: rebuild content inside container (but container is SVG)
  // Wait, if I replace SVG with DIV wrapper, the reference ui.charts.temp (SVG) gets lost.
  // Fix: Target the parent div '.chart-box.half' and rebuild inside it. (A bit complex for selectors)
  // Easier Fix: ui.charts.temp is the SVG. I will clear it, AND append overlay siblings IF they don't exist? 
  // BETTER: Clear the parentNode's innerHTML and rebuild SVG + Overlay there.

  const parent = container.parentNode;

  // Calc Data
  const slice = dataSet.slice(startIdx, startIdx + range);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const diff = (max - min) || 1;
  const avg = slice.reduce((a, b) => a + b, 0) / range;

  // Colors
  let lineClass = 'line-ok';
  let icon = '📊';
  if (type === 'temp') {
    if (avg > 25) { lineClass = 'line-hot'; icon = '🔥'; }
    else if (avg < 10) { lineClass = 'line-cold'; icon = '❄️'; }
    else icon = '🌡️';
  } else {
    if (avg > 25) { lineClass = 'line-cold'; icon = '💨'; } // High wind
    else icon = '🍃';
  }

  // SVG Points
  const pts = slice.map((v, i) => {
    const x = (i / (range - 1)) * 100;
    const y = 40 - ((v - min) / diff) * 30 - 5;
    return `${x},${y}`;
  }).join(' ');

  // Rebuild DOM structure for Chart Box
  // We need label + wrapper(SVG + Overlay)
  const label = type === 'temp' ? 'TEMP TREND' : 'WIND FORCE';

  parent.innerHTML = `
    <label>${label}</label>
    <div class="chart-container-relative">
      <div class="chart-icon-overlay">${icon}</div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <polyline points="${pts}" class="chart-line ${lineClass}" vector-effect="non-scaling-stroke"></polyline>
      </svg>
      <div class="chart-overlay">
        ${slice.map(v => `
          <div class="chart-trigger">
            <div class="chart-tooltip">${Math.round(v)}${type === 'temp' ? '°' : 'k'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// --- SIMULATION ---
function startSim(route, weather) {
  ui.sim.overlay.classList.remove('hidden');
  ui.sim.close.onclick = () => location.reload();

  let pct = 0;
  const tot = route.distance / 1000;

  state.simTimer = setInterval(() => {
    pct += 0.5;
    ui.sim.fill.style.width = pct + '%';
    ui.sim.rider.style.left = pct + '%';
    ui.sim.dist.textContent = (tot * (pct / 100)).toFixed(1) + 'km';
    ui.sim.temp.textContent = (weather.current_weather.temperature + (Math.random() - 0.5)).toFixed(1) + '°';
    ui.sim.wind.textContent = (weather.current_weather.windspeed + (Math.random() * 2)).toFixed(0) + 'kph';
    if (pct >= 100) clearInterval(state.simTimer);
  }, 40);
}

// --- NETWORK (No Changes) ---
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

async function fetchWeather(c) {
  const url = `${API.WEATHER}?latitude=${c.latitude}&longitude=${c.longitude}&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&windspeed_unit=kmh`;
  return await (await fetch(url)).json();
}

async function refreshGlance(c) {
  const loc = await resolve(c);
  if (loc) {
    state.coords.start = loc;
    const w = await fetchWeather(loc);
    ui.glance.city.textContent = loc.name;
    ui.glance.temp.textContent = Math.round(w.current_weather.temperature) + '°';
  }
}

function buddySay(t) {
  ui.buddy.chat.textContent = t;
  ui.buddy.chat.classList.remove('hidden');
  setTimeout(() => ui.buddy.chat.classList.add('hidden'), 4000);
}

ui.inputs.locate.addEventListener('click', () => {
  if (navigator.geolocation) {
    buddySay("Locking on...");
    navigator.geolocation.getCurrentPosition(pos => {
      ui.inputs.start.value = "Current Location";
      state.coords.start = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, name: "GPS" };
      refreshGlance("London");
      buddySay("GPS Locked 🛰️");
    });
  }
});
