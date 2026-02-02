// 🚀 Weather Rider: Cockpit Edition (Charts & Graphs)

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

document.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('wr_last') || 'London';
  ui.inputs.start.value = last;
  refreshGlance(last);
  buddySay("Charts Online. 📊");
});

// --- INTERACTIONS ---
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

    // RENDER EVERYTHING
    generateBriefing(weather, route);
    renderCharts(weather.hourly);

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
    advice = cur.temperature > 20 ? "Heat Alert. Hydrate." : "Conditions Nominal.";
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

// --- 📊 CHART ENGINE ---
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
    bar.title = `${new Date().getHours() + i}:00 - ${val}%`;
    ui.charts.rain.appendChild(bar);
  }

  // 2. Line Graphs
  const drawLine = (set, cls) => {
    const slice = set.slice(now, now + range);
    const min = Math.min(...slice);
    const max = Math.max(...slice);
    const diff = (max - min) || 1;

    const pts = slice.map((v, i) => {
      const x = (i / (range - 1)) * 100;
      const y = 40 - ((v - min) / diff) * 30 - 5;
      return `${x},${y}`;
    }).join(' ');

    return `<polyline points="${pts}" class="chart-line ${cls}" />`;
  };

  ui.charts.temp.innerHTML = drawLine(hourly.temperature_2m, 'line-temp');
  ui.charts.wind.innerHTML = drawLine(hourly.windspeed_10m, 'line-wind');
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
    ui.sim.temp.textContent = (weather.current_weather.temperature + Math.random()).toFixed(1) + '°';
    ui.sim.wind.textContent = (weather.current_weather.windspeed + Math.random()).toFixed(0) + 'kph';
    if (pct >= 100) clearInterval(state.simTimer);
  }, 40);
}

// --- NETWORK ---
async function resolve(n) {
  if (n === "Current Location") return state.coords.start; // Cache hit
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

function calcFallback(s, e) {
  // Rough math fallback
  return { distance: 50000, duration: 3600 };
}

async function fetchWeather(c) {
  // Added windspeed_10m for the graph
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
      refreshGlance("London"); // Fallback
      buddySay("GPS Locked 🛰️");
    });
  }
});
