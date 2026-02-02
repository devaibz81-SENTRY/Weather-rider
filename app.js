// 🚀 Weather Rider App Logic (Powered by Open-Meteo & OSRM)

// APIs (Free & No Key Required!)
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const ROUTING_API = 'https://router.project-osrm.org/route/v1/driving';

// State
const state = {
  coords: { start: null, end: null },
  weather: null
};

// DOM Elements
const screens = {
  login: document.getElementById('loginScreen'),
  dashboard: document.getElementById('dashboardScreen')
};

const ui = {
  enterBtn: document.getElementById('enterBtn'),
  calcBtn: document.getElementById('calculateRideBtn'),
  drawer: document.getElementById('statsDrawer'),
  closeDrawer: document.getElementById('closeDrawer'),
  locateBtn: document.getElementById('locateMeBtn'),
  inputs: {
    start: document.getElementById('startLocation'),
    end: document.getElementById('endLocation')
  },
  stats: {
    time: document.getElementById('travelTime'),
    temp: document.getElementById('arrivalTemp'),
    wind: document.getElementById('windGust'),
    timeline: document.getElementById('hourlyTimeline'),
    dist: null, // Will create dynamically or add to HTML
    extra: document.querySelector('.stats-grid') // To append more cards
  },
  widget: {
    icon: document.getElementById('currentIcon'),
    temp: document.getElementById('currentTemp'),
    desc: document.getElementById('currentDesc')
  }
};

// --- 🎬 Init ---

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('rider_active')) {
    switchScreen('dashboard');
    initializeDashboard();
  }
});

ui.enterBtn.addEventListener('click', () => {
  localStorage.setItem('rider_active', 'true');
  switchScreen('dashboard');
  initializeDashboard();
});

function initializeDashboard() {
  // Try to load last known location or default to London
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        state.coords.start = { lat: latitude, lon: longitude, name: 'Current Location' };
        ui.inputs.start.value = 'Current Location';
        getLiveWeather(latitude, longitude);
      },
      () => getLiveWeather(51.5074, -0.1278) // Default London
    );
  } else {
    getLiveWeather(51.5074, -0.1278);
  }
}

// --- 🗺️ The Brains (Calculations) ---

ui.calcBtn.addEventListener('click', async () => {
  const startQuery = ui.inputs.start.value.trim();
  const endQuery = ui.inputs.end.value.trim();

  if (!endQuery) return alert("Where are we going?");

  ui.calcBtn.textContent = "📍 Routing...";
  ui.calcBtn.style.opacity = "0.7";

  try {
    // 1. Resolve Locations (if not already set via GPS)
    if (!state.coords.start || startQuery !== 'Current Location') {
      state.coords.start = await resolveLocation(startQuery);
    }
    state.coords.end = await resolveLocation(endQuery);

    if (!state.coords.start || !state.coords.end) throw new Error("Could not find locations");

    // 2. Get Real Route Data (OSRM)
    const route = await fetchRoute(state.coords.start, state.coords.end);

    // 3. Get Destination Weather (Open-Meteo)
    const weather = await fetchForecast(state.coords.end.lat, state.coords.end.lon);

    // 4. Update UI
    updateDashboard(route, weather);
    openDrawer();

  } catch (err) {
    console.error(err);
    alert(err.message || "Route calculation failed");
  } finally {
    ui.calcBtn.textContent = "Analyze Route";
    ui.calcBtn.style.opacity = "1";
  }
});

ui.locateBtn.addEventListener('click', () => {
  if (navigator.geolocation) {
    ui.inputs.start.value = "Locating...";
    navigator.geolocation.getCurrentPosition(pos => {
      state.coords.start = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        name: 'Current Location'
      };
      ui.inputs.start.value = "Current Location";
      getLiveWeather(pos.coords.latitude, pos.coords.longitude);
    });
  }
});

ui.closeDrawer.addEventListener('click', closeDrawer);

// --- 📡 API Calls ---

async function resolveLocation(query) {
  if (query === 'Current Location' && state.coords.start) return state.coords.start;

  const res = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
  const data = await res.json();
  if (!data.results) return null;
  return { lat: data.results[0].latitude, lon: data.results[0].longitude, name: data.results[0].name };
}

async function fetchRoute(start, end) {
  // OSRM expects: {lon},{lat};{lon},{lat}
  const url = `${ROUTING_API}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== 'Ok') throw new Error("No route found");

  // Duration is in seconds, Distance in meters
  return {
    duration: data.routes[0].duration,
    distance: data.routes[0].distance
  };
}

async function fetchForecast(lat, lon) {
  // Requesting extra metrics: UV, Humidity, Precip Prob, Visibility
  const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability,uv_index,relativehumidity_2m,visibility&windspeed_unit=kmh`;
  const res = await fetch(url);
  return await res.json();
}

async function getLiveWeather(lat, lon) {
  const data = await fetchForecast(lat, lon);
  updateWidget(data);
}

// --- 🎨 UI Updates ---

function updateDashboard(route, weather) {
  const current = weather.current_weather;
  const hourly = weather.hourly;

  // 1. Travel Time (Real!)
  const hrs = Math.floor(route.duration / 3600);
  const mins = Math.floor((route.duration % 3600) / 60);
  ui.stats.time.textContent = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

  // 2. Weather Stats
  ui.stats.temp.textContent = Math.round(current.temperature) + '°';
  ui.stats.wind.textContent = current.windspeed + ' km/h';

  // 3. Inject Extra Cards (UV, Rain, etc) if not exists
  let extraHtml = '';
  // Rain Chance (next hour)
  const rainChance = hourly.precipitation_probability[new Date().getHours()] || 0;
  extraHtml += createStatCard('☔', 'Rain Risk', `${rainChance}%`);

  // UV Index
  const uv = hourly.uv_index[new Date().getHours()] || 0;
  extraHtml += createStatCard('☀️', 'UV Index', uv);

  // Replace the grid content but keep original structure reference if possible
  // For simplicity, let's re-build the grid content carefully
  // Actually, let's just Append/Update specific IDs if we added them to HTML. 
  // Since we didn't add them yet, let's insert them into the grid.

  // Update Logic: Clear grid, add core + extra
  ui.stats.extra.innerHTML = `
    <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-info"><span class="stat-label">Est. Time</span><span class="stat-value">${hrs}h ${mins}m</span></div></div>
    <div class="stat-card"><div class="stat-icon">🌤️</div><div class="stat-info"><span class="stat-label">Arrv. Weather</span><span class="stat-value">${Math.round(current.temperature)}°</span></div></div>
    <div class="stat-card"><div class="stat-icon">💨</div><div class="stat-info"><span class="stat-label">Wind Gusts</span><span class="stat-value">${current.windspeed} km/h</span></div></div>
    ${createStatCard('☔', 'Rain Chance', rainChance + '%')}
    ${createStatCard('👁️', 'Visibility', (hourly.visibility[new Date().getHours()] / 1000).toFixed(1) + ' km')}
    ${createStatCard('🛣️', 'Distance', (route.distance / 1000).toFixed(1) + ' km')}
  `;

  // 4. Timeline
  generateTimeline(hourly);
}

function createStatCard(icon, label, value) {
  return `
    <div class="stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-info">
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value}</span>
      </div>
    </div>
  `;
}

function updateWidget(data) {
  const w = data.current_weather;
  const info = getWeatherDescription(w.weathercode);
  ui.widget.temp.textContent = Math.round(w.temperature) + '°';
  ui.widget.desc.textContent = info.desc;
  ui.widget.icon.textContent = info.icon;
  updateBackground(w.weathercode);
}

function generateTimeline(hourly) {
  ui.stats.timeline.innerHTML = '';
  const startIdx = new Date().getHours();

  for (let i = 1; i <= 6; i++) {
    const idx = startIdx + i;
    if (idx >= hourly.time.length) break;

    const time = hourly.time[idx].slice(11, 16);
    const temp = Math.round(hourly.temperature_2m[idx]);
    const code = hourly.weathercode[idx];
    const icon = getWeatherDescription(code).icon;

    const div = document.createElement('div');
    div.className = 'timeline-item';
    div.innerHTML = `<span class="timeline-time">${time}</span><span class="timeline-icon">${icon}</span><span class="timeline-temp">${temp}°</span>`;
    ui.stats.timeline.appendChild(div);
  }
}

// Helpers
function switchScreen(name) {
  if (name === 'dashboard') {
    screens.login.classList.add('hidden');
    screens.dashboard.classList.remove('hidden');
  } else {
    screens.dashboard.classList.add('hidden');
    screens.login.classList.remove('hidden');
  }
}

function openDrawer() { ui.drawer.classList.add('open'); }
function closeDrawer() { ui.drawer.classList.remove('open'); }

function getWeatherDescription(code) {
  if (code === 0) return { desc: 'Clear', icon: '☀️' };
  if (code <= 3) return { desc: 'Cloudy', icon: '☁️' };
  if (code <= 48) return { desc: 'Fog', icon: '🌫️' };
  if (code <= 67) return { desc: 'Rain', icon: '🌧️' };
  if (code <= 77) return { desc: 'Snow', icon: '❄️' };
  if (code <= 82) return { desc: 'Showers', icon: '☔' };
  if (code <= 99) return { desc: 'Storm', icon: '⚡' };
  return { desc: 'Unknown', icon: '❓' };
}

function updateBackground(code) {
  let g = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
  if (code === 0) g = 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)';
  else if (code >= 61) g = 'linear-gradient(135deg, #232526 0%, #414345 100%)';
  else if (code >= 1) g = 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)';
  document.body.style.background = g;
}
