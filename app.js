// 🚀 Weather Rider: Dark Mode Edition

// API (No Keys)
const API = {
  GEO: 'https://geocoding-api.open-meteo.com/v1/search',
  WEATHER: 'https://api.open-meteo.com/v1/forecast',
  ROUTE: 'https://router.project-osrm.org/route/v1/driving'
};

// DOM
const ui = {
  buddy: {
    wrap: document.getElementById('buddyWrapper'),
    chat: document.getElementById('buddyChat'),
    eyes: {
      left: document.getElementById('eyeLeft'),
      right: document.getElementById('eyeRight')
    }
  },
  glance: {
    temp: document.getElementById('quickTemp'),
    wind: document.getElementById('quickWind'),
    desc: document.getElementById('quickDesc'),
    icon: document.getElementById('quickIcon')
  },
  inputs: {
    start: document.getElementById('startLoc'),
    end: document.getElementById('endLoc'),
    go: document.getElementById('goBtn')
  },
  pack: {
    area: document.getElementById('packingList'),
    list: document.getElementById('packItems')
  },
  sim: {
    overlay: document.getElementById('simOverlay'),
    close: document.getElementById('closeSim'),
    title: document.getElementById('simRouteTitle'),
    fill: document.getElementById('trackFill'),
    rider: document.getElementById('trackRider'),
    temp: document.getElementById('simTemp'),
    dist: document.getElementById('simDist'),
    wind: document.getElementById('simWind'),
    ai: document.getElementById('aiMessage')
  }
};

const state = {
  coords: { start: null, end: null },
  weather: null,
  simTimer: null
};

// --- 🎬 INIT ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Load Last Location
  const lastLoc = localStorage.getItem('rider_last_loc') || 'London';
  ui.inputs.start.value = lastLoc;

  // 2. Fetch "Glance" Data immediately
  resolveCity(lastLoc).then(coords => {
    if (coords) {
      state.coords.start = coords;
      fetchWeather(coords).then(updateGlance);
    }
  });

  buddySay("Ready to ride? 🕶️");
});

// --- 👁️ EYE TRACKING ---
document.addEventListener('mousemove', (e) => {
  const eyes = [ui.buddy.eyes.left, ui.buddy.eyes.right];
  eyes.forEach(eye => {
    const rect = eye.getBoundingClientRect();
    const x = (rect.left) + (rect.width / 2);
    const y = (rect.top) + (rect.height / 2);
    const rad = Math.atan2(e.pageX - x, e.pageY - y);
    const rot = (rad * (180 / Math.PI) * -1) + 180;
    eye.style.transform = `rotate(${rot}deg)`;
  });
});

// Toggle Dark/Light (Just resets animation for now as requested)
ui.buddy.wrap.addEventListener('click', () => {
  document.body.style.filter = document.body.style.filter ? "" : "contrast(1.2) brightness(0.8)";
  buddySay("Dark mode engaged. 🌙");
});

// --- 🚀 ACTION ---
ui.inputs.go.addEventListener('click', async () => {
  const start = ui.inputs.start.value;
  const end = ui.inputs.end.value;

  if (!end) return buddySay("Where are we going? 🤷‍♂️");

  ui.inputs.go.innerHTML = "<span>📡 SCANNING...</span>";

  try {
    // 1. Resolve
    if (!state.coords.start) state.coords.start = await resolveCity(start);
    state.coords.end = await resolveCity(end);

    // Save
    localStorage.setItem('rider_last_loc', start);

    // 2. Route & Weather
    const route = await fetchRoute(state.coords.start, state.coords.end);
    const weather = await fetchWeather(state.coords.end);

    // 3. Show Packing List (Snarky)
    generatePackingList(weather);
    ui.pack.area.classList.remove('hidden');

    // 4. Start Sim
    startSimulation(route, weather);

  } catch (e) {
    console.error(e);
    buddySay("Navigation Error. Try again.");
  } finally {
    ui.inputs.go.innerHTML = "<span>🚀 PLAN MISSION</span>";
  }
});

ui.sim.close.addEventListener('click', () => {
  ui.sim.overlay.classList.add('hidden');
  clearInterval(state.simTimer);
});

// --- 🧠 LOGIC ---

function updateGlance(data) {
  const curr = data.current_weather;
  ui.glance.temp.textContent = Math.round(curr.temperature) + '°';
  ui.glance.wind.textContent = curr.windspeed + 'k';

  const code = curr.weathercode;
  const info = getWeatherInfo(code);
  ui.glance.desc.textContent = info.desc;
  ui.glance.icon.textContent = info.icon;
}

function generatePackingList(data) {
  const curr = data.current_weather;
  const temp = curr.temperature;
  const code = curr.weathercode;
  const items = [];

  // Logic
  if (temp < 10) items.push("Winter Jacket 🧥", "Frozen Tears ❄️");
  else if (temp > 25) items.push("Sunscreen 🧴", "Hydration 💧");
  else items.push("Light Jacket 🧥");

  if (code >= 51) items.push("Umbrella ☔", "Kayak 🛶");
  if (code === 0) items.push("Sunglasses 🕶️");

  // Render
  ui.pack.list.innerHTML = items.map(i => `<div class="gear-chip">${i}</div>`).join('');
}

function startSimulation(route, weather) {
  ui.sim.overlay.classList.remove('hidden');
  ui.sim.title.textContent = `${state.coords.start.name} ➔ ${state.coords.end.name}`;

  // AI Message
  const time = Math.round(route.duration / 60);
  ui.sim.ai.textContent = `Mission confirmed. ETA ${time} mins. Weather looks ${getWeatherInfo(weather.current_weather.weathercode).desc}. Watch your six.`;

  // Reset
  let progress = 0;
  const distTotal = route.distance / 1000;

  if (state.simTimer) clearInterval(state.simTimer);

  state.simTimer = setInterval(() => {
    progress += 0.4;

    ui.sim.fill.style.width = progress + '%';
    ui.sim.rider.style.left = progress + '%';

    // Live update
    ui.sim.dist.textContent = (distTotal * (progress / 100)).toFixed(1) + 'km';
    ui.sim.temp.textContent = weather.current_weather.temperature + '°';
    ui.sim.wind.textContent = weather.current_weather.windspeed + 'k';

    if (progress >= 100) clearInterval(state.simTimer);
  }, 30);
}

// --- API UTILS ---
async function resolveCity(name) {
  const res = await fetch(`${API.GEO}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
  const d = await res.json();
  if (!d.results) return null;
  return { lat: d.results[0].latitude, lon: d.results[0].longitude, name: d.results[0].name };
}

async function fetchRoute(start, end) {
  const res = await fetch(`${API.ROUTE}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`);
  const d = await res.json();
  return { duration: d.routes[0].duration, distance: d.routes[0].distance };
}

async function fetchWeather(coords) {
  const res = await fetch(`${API.WEATHER}?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,weathercode`);
  return await res.json();
}

// Map WMO codes
function getWeatherInfo(code) {
  if (code === 0) return { desc: 'Clear', icon: '☀️' };
  if (code <= 3) return { desc: 'Cloudy', icon: '☁️' };
  if (code <= 67) return { desc: 'Rain', icon: '🌧️' };
  if (code <= 99) return { desc: 'Storm', icon: '⚡' };
  return { desc: 'Unknown', icon: '❓' };
}

function buddySay(msg) {
  ui.buddy.chat.textContent = msg;
  ui.buddy.chat.classList.remove('hidden');
  setTimeout(() => ui.buddy.chat.classList.add('hidden'), 4000);
}
