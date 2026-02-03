// 🚀 Weather Rider: Timeline Edition

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
  sim: { overlay: document.getElementById('simOverlay'), close: document.getElementById('closeSim'), fill: document.getElementById('trackFill'), rider: document.getElementById('trackRider'), dist: document.getElementById('simDist'), temp: document.getElementById('simTemp'), wind: document.getElementById('simWind') },
  glance: { city: document.getElementById('lastCity'), temp: document.getElementById('lastTemp'), icon: document.getElementById('lastIcon') }
};

const state = {
  mode: 'ride',
  coords: { start: null, end: null },
  weather: null,
  simTimer: null
};

document.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('wr_last') || 'London';
  ui.inputs.start.value = last;
  refreshGlance(last);
  buddySay("Timeline Logic Online. 🕒");
});

// --- INTERACTIONS ---
ui.buddy.wrap.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  buddySay(document.body.classList.contains('light-mode') ? "Light Mode ☀️" : "Dark Mode 🌙");
});

document.addEventListener('mousemove', (e) => {
  document.querySelectorAll('.eye').forEach(eye => {
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
    ui.sim.rider.textContent = { ride: '🏍️', run: '🏃', cycle: '🚴' }[state.mode];
    buddySay(`Mode: ${state.mode.toUpperCase()}`);
  });
});

ui.inputs.go.addEventListener('click', async () => {
  const dest = ui.inputs.end.value;
  if (!dest) return buddySay("Target Required! 🎯");

  ui.inputs.go.textContent = "🔁 CALCULATING...";
  ui.inputs.go.style.opacity = "0.7";

  try {
    if (!ui.inputs.start.value) ui.inputs.start.value = 'London';
    const s = await resolve(ui.inputs.start.value);
    const e = await resolve(dest);
    if (!s || !e) throw new Error("Location Error");

    state.coords.start = s;
    state.coords.end = e;
    localStorage.setItem('wr_last', s.name);

    let route;
    try { route = await fetchRoute(s, e); } catch { route = calcFallback(s, e); }

    const weather = await fetchWeather(e);
    state.weather = weather;

    // RENDER
    generateBriefing(weather, route);
    renderCharts(weather.hourly);

    // NEW: Generate Timeline
    generateRideTimeline(route, weather, s.name, e.name);

    ui.inputs.go.textContent = "🚀 LAUNCH SIMULATION";
    ui.inputs.go.style.opacity = "1";
    ui.inputs.go.onclick = () => startSim(route, weather);

  } catch (err) {
    console.error(err);
    buddySay("Sys Failure: Check Data");
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

  let advice = "";
  let gear = [];

  if (state.mode === 'run') {
    advice = cur.temperature > 20 ? "High Heat. Hydrate." : "Conditions Nominal.";
    gear = ["Shoes 👟", "Water 💧"];
  } else if (state.mode === 'cycle') {
    advice = cur.windspeed > 15 ? "High Drag Detected." : "Aero Green.";
    gear = ["Helmet ⛑️", "Gloves 🧤"];
  } else {
    advice = (hr.precipitation_probability[idx] > 30) ? "Wet Surface Warning." : "Tarmac Dry.";
    gear = ["Jacket 🧥", "Visor 🧽"];
  }

  ui.insight.text.textContent = `Dist: ${Math.round(route.distance / 1000)}km. ${advice}`;
  ui.insight.gear.innerHTML = gear.map(g => `<span class="gear-tag">${g}</span>`).join('');
}

// --- 🕒 TIMELINE ENGINE (NEW) ---
function generateRideTimeline(route, weather, startName, endName) {
  const container = ui.timeline;
  if (!container) return;

  container.innerHTML = '';
  container.classList.remove('hidden');

  // Parse Start Time
  const timeInput = ui.inputs.time.value || "10:00"; // Get value from input
  let [hours, mins] = timeInput.split(':').map(Number);

  // Duration in hours
  const durHours = route.duration / 3600;

  const nodes = [
    { label: `Depart ${startName}`, offset: 0 },
    { label: "Mid-Sector Check", offset: durHours / 2 },
    { label: `Arrive ${endName}`, offset: durHours }
  ];

  const w = weather.hourly;
  // Offset logic: simple relative lookahead from 'now' for demo
  // In prod, use real timestamps from API

  nodes.forEach((node, i) => {
    let nodeH = hours + Math.floor(node.offset);
    let nodeM = mins + Math.floor((node.offset % 1) * 60);
    if (nodeM >= 60) { nodeH++; nodeM -= 60; }
    const timeStr = `${nodeH % 24}:${nodeM.toString().padStart(2, '0')}`;

    // Look ahead in API data (approx)
    const apiIdx = new Date().getHours() + Math.floor(node.offset);
    const temp = w.temperature_2m[apiIdx] || "--";
    const code = w.weathercode[apiIdx] || 0;
    const rain = w.precipitation_probability[apiIdx] || 0;
    const wind = w.windspeed_10m[apiIdx] || 0;

    // Icon
    let icon = '☀️';
    if (code > 3) icon = '☁️';
    if (code > 50) icon = '🌧️';

    // Danger Check
    let statusClass = "good";
    if (rain > 30 || wind > 25) statusClass = "danger";

    const div = document.createElement('div');
    div.className = `timeline-node ${statusClass}`;
    div.innerHTML = `
      <span class="t-time">${timeStr}</span>
      <div class="t-cond" style="flex:1; margin-left:15px">
        <span>${node.label}</span>
      </div>
      <div class="t-cond">
        <span class="t-icon">${icon}</span>
        <span>${Math.round(temp)}°</span>
        ${rain > 0 ? `<span style="color:#00d2ff; margin-left:5px">💧${rain}%</span>` : ''}
      </div>
    `;
    container.appendChild(div);
  });
}

// --- 📊 CHART ENGINE ---
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
    bar.title = `+${i}h: ${val}% Rain`;
    ui.charts.rain.appendChild(bar);
  }

  drawInteractiveLine(ui.charts.temp, hourly.temperature_2m, now, range, 'temp');
  drawInteractiveLine(ui.charts.wind, hourly.windspeed_10m, now, range, 'wind');
}

function drawInteractiveLine(container, dataSet, startIdx, range, type) {
  const slice = dataSet.slice(startIdx, startIdx + range);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const diff = (max - min) || 1;
  const avg = slice.reduce((a, b) => a + b, 0) / range;

  let lineClass = 'line-ok';
  let icon = '📊';
  if (type === 'temp') {
    if (avg > 25) { lineClass = 'line-hot'; icon = '🔥'; }
    else if (avg < 10) { lineClass = 'line-cold'; icon = '❄️'; }
    else icon = '🌡️';
  } else {
    if (avg > 25) { lineClass = 'line-cold'; icon = '💨'; }
    else icon = '🍃';
  }

  const pts = slice.map((v, i) => {
    const x = (i / (range - 1)) * 100;
    const y = 40 - ((v - min) / diff) * 30 - 5;
    return `${x},${y}`;
  }).join(' ');

  const parent = container.parentNode;
  const label = type === 'temp' ? 'TEMP' : 'WIND';

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

// --- NETWORK (Safe) ---
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
  return await (await fetch(`${API.WEATHER}?latitude=${c.latitude}&longitude=${c.longitude}&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&windspeed_unit=kmh`)).json();
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
