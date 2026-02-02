// 🚀 Weather Rider Ultimate - AI Simulation Logic

// Endpoints
const API = {
  GEO: 'https://geocoding-api.open-meteo.com/v1/search',
  WEATHER: 'https://api.open-meteo.com/v1/forecast',
  ROUTE: 'https://router.project-osrm.org/route/v1/driving'
};

// State
const state = {
  active: false,
  coords: { start: null, end: null },
  weather: null,
  simInterval: null
};

// DOM Refs
const ui = {
  screens: {
    login: document.getElementById('loginScreen'),
    dash: document.getElementById('dashboardScreen')
  },
  buddy: {
    body: document.getElementById('buddyBody'),
    chat: document.getElementById('buddyChat')
  },
  inputs: {
    start: document.getElementById('startLocation'),
    end: document.getElementById('endLocation'),
    locate: document.getElementById('locateMeBtn'),
    calc: document.getElementById('calculateRideBtn')
  },
  sim: {
    overlay: document.getElementById('simOverlay'),
    close: document.getElementById('closeSim'),
    title: document.getElementById('simTitleText'),
    progress: document.getElementById('trackProgress'),
    avatar: document.getElementById('simAvatar'),
    dist: document.getElementById('simDist'),
    temp: document.getElementById('simTemp'),
    wind: document.getElementById('simWind'),
    uv: document.getElementById('simUV'),
    aiText: document.getElementById('aiText')
  }
};

// --- 🎬 Lifecycle ---

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('rider_active')) {
    switchScreen('dash');
    buddySay("Welcome back! Ready for a mission? 🏍️");
  } else {
    buddySay("I'm cloudBuddy! Start your engines! 🌤️");
  }
});

document.getElementById('enterBtn').addEventListener('click', () => {
  localStorage.setItem('rider_active', 'true');
  switchScreen('dash');
  buddySay("Let's plan a route. Where are we heading?");
});

// --- 🧠 Actions ---

ui.inputs.locate.addEventListener('click', () => {
  if (navigator.geolocation) {
    ui.inputs.start.value = "Scanning...";
    navigator.geolocation.getCurrentPosition(pos => {
      ui.inputs.start.value = "Current Location";
      state.coords.start = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Current Location" };
      buddySay("Got your coords! 🛰️");
    }, () => {
      ui.inputs.start.value = "London";
      buddySay("Couldn't find you. Using London for now.");
    });
  }
});

ui.inputs.calc.addEventListener('click', async () => {
  const dest = ui.inputs.end.value;
  if (!dest) return buddySay("Hey! We need a destination! 🏁");

  setLoading(true);
  buddySay("Calculating optimal trajectory... 📡");

  try {
    // 1. Resolve Locations
    if (!state.coords.start) state.coords.start = await resolveCity(ui.inputs.start.value);
    state.coords.end = await resolveCity(dest);

    if (!state.coords.start || !state.coords.end) throw new Error("Location lost.");

    // 2. Get Route Info
    const route = await fetchRoute(state.coords.start, state.coords.end);

    // 3. Get Forecast
    const weather = await fetchWeather(state.coords.end);
    state.weather = weather;

    // 4. Start Simulation
    setLoading(false);
    startSimulation(route, weather);

  } catch (err) {
    console.error(err);
    buddySay("Error: " + err.message);
    setLoading(false);
  }
});

ui.sim.close.addEventListener('click', stopSimulation);

// --- 🎮 Simulation Engine ---

function startSimulation(route, weather) {
  // Show Overlay
  ui.sim.overlay.classList.remove('hidden');
  ui.sim.title.textContent = `${state.coords.start.name} ➔ ${state.coords.end.name}`;

  // AI Analysis Init
  generateAIInsight(route, weather);

  // Reset Bars
  ui.sim.progress.style.width = '0%';
  ui.sim.avatar.style.left = '0%';

  let progress = 0;
  const totalDist = route.distance / 1000; // km

  // Start Loop
  if (state.simInterval) clearInterval(state.simInterval);

  state.simInterval = setInterval(() => {
    progress += 0.5; // Speed of sim

    // 1. Visual Update
    ui.sim.progress.style.width = `${progress}%`;
    ui.sim.avatar.style.left = `${progress}%`;

    // 2. Data Update (Interpolate/Randomize slightly to feel "live")
    updateLiveTelemetry(progress, totalDist, weather);

    // 3. End Condition
    if (progress >= 100) {
      clearInterval(state.simInterval);
      buddySay("Mission Complete! Ride looks solid. 🏎️");
    }

  }, 50); // 20fps
}

function stopSimulation() {
  ui.sim.overlay.classList.add('hidden');
  if (state.simInterval) clearInterval(state.simInterval);
}

function updateLiveTelemetry(pct, totalDist, weather) {
  const currentDist = (totalDist * (pct / 100)).toFixed(1);
  const w = weather.current_weather;

  // Mock Variation: Add slight noise to temp/wind based on position
  const noise = (Math.sin(pct / 10) * 2).toFixed(1);
  const liveTemp = (parseFloat(w.temperature) + parseFloat(noise)).toFixed(1);
  const liveWind = (parseFloat(w.windspeed) + Math.random()).toFixed(1);

  ui.sim.dist.textContent = `${currentDist} km`;
  ui.sim.temp.textContent = `${liveTemp}°`;
  ui.sim.wind.textContent = `${liveWind} km/h`;

  // Find UV from hourly array (approx)
  const hour = new Date().getHours();
  const uv = weather.hourly.uv_index[hour] || 0;
  ui.sim.uv.textContent = uv;
}

function generateAIInsight(route, weather) {
  const w = weather.current_weather;
  const time = (route.duration / 60).toFixed(0);
  const code = w.weathercode;

  let mood = "Neutral";
  let advice = "";

  // Simple AI Logic
  if (code === 0) {
    mood = "Great";
    advice = "Perfect conditions! UV might be high, wear shades. 😎";
    setBuddyMood('happy');
  } else if (code >= 60) {
    mood = "Caution";
    advice = "Rain expected. Slick roads ahead. Engage traction control. 🌧️";
    setBuddyMood('sad');
  } else {
    advice = "Standard ride. Watch for crosswinds on highways.";
    setBuddyMood('neutral');
  }

  const text = `
    <strong>Target:</strong> ${state.coords.end.name}<br>
    <strong>Est. Duration:</strong> ${time} mins<br>
    <strong>Strategy:</strong> ${advice}
  `;

  typewriterEffect(ui.sim.aiText, text);
}

// --- 🛠️ Helpers ---

function switchScreen(name) {
  if (name === 'dash') {
    ui.screens.login.classList.add('hidden');
    ui.screens.dash.classList.remove('hidden');
  } else {
    ui.screens.dash.classList.add('hidden');
    ui.screens.login.classList.remove('hidden');
  }
}

function buddySay(msg) {
  ui.buddy.chat.classList.remove('hidden');
  ui.buddy.chat.textContent = msg;
  ui.buddy.body.classList.add('talking');

  // Hide Bubble after 4s
  setTimeout(() => {
    ui.buddy.chat.classList.add('hidden');
    ui.buddy.body.classList.remove('talking');
  }, 4000);
}

function setBuddyMood(mood) {
  // Can expand simply by changing colors or eyes in CSS classes
  // For now we just animate
  ui.buddy.body.style.animationDuration = mood === 'happy' ? '2s' : '5s';
}

function typewriterEffect(el, html) {
  el.innerHTML = html; // Simple insert for now to support HTML tags
}

function setLoading(isLoading) {
  const loader = ui.inputs.calc.querySelector('.btn-loader');
  const text = ui.inputs.calc.querySelector('.btn-text');

  if (isLoading) {
    text.classList.add('hidden');
    loader.classList.remove('hidden');
  } else {
    text.classList.remove('hidden');
    loader.classList.add('hidden');
  }
}

// --- 📡 API Utils (Same as before) ---

async function resolveCity(name) {
  const res = await fetch(`${API.GEO}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
  const data = await res.json();
  if (!data.results) return null;
  return { lat: data.results[0].latitude, lon: data.results[0].longitude, name: data.results[0].name };
}

async function fetchRoute(start, end) {
  const res = await fetch(`${API.ROUTE}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`);
  const data = await res.json();
  return { duration: data.routes[0].duration, distance: data.routes[0].distance };
}

async function fetchWeather(coords) {
  const url = `${API.WEATHER}?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,weathercode,uv_index&windspeed_unit=kmh`;
  const res = await fetch(url);
  return await res.json();
}
