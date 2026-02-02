// 🚀 Weather Rider: Cockpit Edition

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
  sim: { overlay: document.getElementById('simOverlay'), close: document.getElementById('closeSim'), fill: document.getElementById('trackFill'), rider: document.getElementById('trackRider'), dist: document.getElementById('simDist'), temp: document.getElementById('simTemp'), wind: document.getElementById('simWind') },
  glance: { city: document.getElementById('lastCity'), temp: document.getElementById('lastTemp'), icon: document.getElementById('lastIcon') }
};

const state = {
  mode: 'ride', // ride | run | cycle
  coords: { start: null, end: null },
  weather: null,
  simTimer: null
};

// --- 🎬 INIT ---
document.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('wr_last') || 'London';
  ui.inputs.start.value = last;
  refreshGlance(last);
  buddySay("Systems Online. 🌤️");
});

// --- 🎛️ TABS ---
ui.tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    ui.tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.type;

    // Update Rider Icon
    const icons = { ride: '🏍️', run: '🏃', cycle: '🚴' };
    ui.sim.rider.textContent = icons[state.mode];

    buddySay(`Switching to ${state.mode.toUpperCase()} mode.`);
  });
});

// --- 🚀 ANALYZE ---
ui.inputs.go.addEventListener('click', async () => {
  const dest = ui.inputs.end.value;
  if (!dest) return buddySay("Missing Danger Zone (Destination) 🚫");

  ui.inputs.go.textContent = "🔁 CALCULATING...";

  try {
    // 1. Resolve
    if (!state.coords.start) state.coords.start = await resolve(ui.inputs.start.value);
    state.coords.end = await resolve(dest);

    // 2. Data
    const route = await fetchRoute(state.coords.start, state.coords.end);
    const weather = await fetchWeather(state.coords.end);
    state.weather = weather; // Store for sim

    // 3. GENERATE BRIEFING (The "Stats" User Asked For)
    generateBriefing(weather, route);

    // 4. Change Button to Launch Sim
    ui.inputs.go.textContent = "🚀 LAUNCH SIMULATION";
    ui.inputs.go.onclick = () => startSim(route, weather); // Re-bind click

  } catch (e) {
    console.error(e);
    buddySay("Nav Error. Check City Names.");
    ui.inputs.go.textContent = "ANALYZE CONDITIONS";
  }
});

// --- 🧠 INTELLIGENCE ---
function generateBriefing(data, route) {
  ui.insight.panel.classList.remove('hidden');

  const cur = data.current_weather;
  const hr = data.hourly;
  const idx = new Date().getHours();

  // Fill Grid
  ui.insight.temp.textContent = Math.round(cur.temperature) + '°';
  ui.insight.wind.textContent = cur.windspeed + 'k';
  ui.insight.rain.textContent = (hr.precipitation_probability[idx] || 0) + '%';

  // Custom Advice per Mode
  let advice = "";
  const gear = [];

  if (state.mode === 'run') {
    if (cur.temperature > 20) advice = "High heat index. Hydrate every 2km.";
    else advice = "Optimum running temps through sector 4.";
    gear.push("Running Shoes 👟", "Water 💧");
  }
  else if (state.mode === 'cycle') {
    if (cur.windspeed > 15) advice = "Strong headwinds detected. Energy expenditure +20%.";
    else advice = "Tarmac checks out. Green light for speed.";
    gear.push("Helmet ⛑️", "Gloves 🧤");
  }
  else { // Ride
    if (hr.precipitation_probability[idx] > 30) advice = "Slick roads possible. TCS recommended.";
    else advice = "Dry tarmac. Lean angles optimal.";
    gear.push("Leather Jacket 🧥", "Visor Cleaner 🧽");
  }

  ui.insight.text.textContent = `Route: ${Math.round(route.distance / 1000)}km. ${advice}`;
  ui.insight.gear.innerHTML = gear.map(g => `<span class="gear-tag">${g}</span>`).join('');
}

// --- 🎮 SIMULATION ---
function startSim(route, weather) {
  ui.sim.overlay.classList.remove('hidden');
  ui.sim.close.onclick = () => {
    ui.sim.overlay.classList.add('hidden');
    clearInterval(state.simTimer);
    ui.inputs.go.textContent = "ANALYZE CONDITIONS"; // Reset button
    ui.inputs.go.addEventListener('click', () => { }); // Need to reload/reset properly
    location.reload(); // Simplest reset for this demo
  };

  let pct = 0;
  const total = route.distance / 1000;

  state.simTimer = setInterval(() => {
    pct += 0.5;
    ui.sim.fill.style.width = pct + '%';
    ui.sim.rider.style.left = pct + '%';

    // Live Stats
    ui.sim.dist.textContent = (total * (pct / 100)).toFixed(1) + 'km';
    ui.sim.temp.textContent = (weather.current_weather.temperature + (Math.random() - 0.5)).toFixed(1) + '°';
    ui.sim.wind.textContent = (weather.current_weather.windspeed + (Math.random() * 2)).toFixed(0) + 'kph';

    if (pct >= 100) clearInterval(state.simTimer);
  }, 40);
}

// --- UTILS ---
async function refreshGlance(city) {
  const c = await resolve(city);
  if (c) {
    state.coords.start = c; // Cache start
    const w = await fetchWeather(c);
    ui.glance.city.textContent = c.name;
    ui.glance.temp.textContent = Math.round(w.current_weather.temperature) + '°';
    ui.glance.icon.textContent = getWeatherIcon(w.current_weather.weathercode);
  }
}

async function resolve(name) {
  const r = await fetch(`${API.GEO}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
  const d = await r.json();
  if (!d.results) return null;
  return { lat: d.results[0].latitude, lon: d.results[0].longitude, name: d.results[0].name };
}

async function fetchRoute(s, e) {
  const r = await fetch(`${API.ROUTE}/${s.lon},${s.lat};${e.lon},${e.lat}?overview=false`);
  const d = await r.json();
  return { duration: d.routes[0].duration, distance: d.routes[0].distance };
}

async function fetchWeather(c) {
  return await (await fetch(`${API.WEATHER}?latitude=${c.lat}&longitude=${c.lon}&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode&windspeed_unit=kmh`)).json();
}

function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '☁️';
  if (code <= 69) return '🌧️';
  return '⚡';
}

function buddySay(t) {
  ui.buddy.chat.textContent = t;
  ui.buddy.chat.classList.remove('hidden');
  setTimeout(() => ui.buddy.chat.classList.add('hidden'), 4000);
}

ui.inputs.locate.addEventListener('click', () => {
  if (navigator.geolocation) {
    buddySay("Triangulating position...");
    navigator.geolocation.getCurrentPosition(pos => {
      ui.inputs.start.value = "Current Location";
      // Deep resolving logic skipped for brevity, simpler in production
      state.coords.start = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: "GPS Lock" };
      refreshGlance("London"); // Fallback usage for glance
      buddySay("GPS Locked. 🛰️");
    });
  }
});
