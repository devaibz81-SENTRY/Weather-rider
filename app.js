// 🚀 Weather Rider App Logic (Powered by Open-Meteo)

// Open-Meteo API Endpoints (No Key Required!)
const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

// State Management
const state = {
  currentScreen: 'login',
  startLocation: 'London',
  destination: '',
  weatherData: null,
  lat: 51.5074,
  lon: -0.1278
};

// DOM Elements
const screens = {
  login: document.getElementById('loginScreen'),
  dashboard: document.getElementById('dashboardScreen')
};

const enterBtn = document.getElementById('enterBtn');
const calculateBtn = document.getElementById('calculateRideBtn');
const statsDrawer = document.getElementById('statsDrawer');
const closeDrawerBtn = document.getElementById('closeDrawer');
const locateMeBtn = document.getElementById('locateMeBtn');

const inputs = {
  start: document.getElementById('startLocation'),
  end: document.getElementById('endLocation')
};

const stats = {
  travelTime: document.getElementById('travelTime'),
  arrivalTemp: document.getElementById('arrivalTemp'),
  windGust: document.getElementById('windGust'),
  timeline: document.getElementById('hourlyTimeline')
};

const widget = {
  icon: document.getElementById('currentIcon'),
  temp: document.getElementById('currentTemp'),
  desc: document.getElementById('currentDesc')
};

// --- 🎬 Initialization & Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('rider_active')) {
    switchScreen('dashboard');
    getLiveWeather('London');
  }
});

enterBtn.addEventListener('click', () => {
  localStorage.setItem('rider_active', 'true');
  switchScreen('dashboard');
  getLiveWeather('London');
});

calculateBtn.addEventListener('click', async () => {
  const destination = inputs.end.value.trim();
  if (!destination) {
    alert("Please enter a destination!");
    return;
  }

  calculateBtn.textContent = "Calculating Route...";
  calculateBtn.style.opacity = "0.7";

  // 1. Get Coords for Destination
  const coords = await getCoordinates(destination);

  if (coords) {
    // 2. Fetch Detailed Forecast
    const weather = await fetchForecast(coords.latitude, coords.longitude);

    if (weather) {
      // 3. Simulate Route Calculation
      await simulateCalculation();

      // 4. Update Stats using REAL Hourly Data
      updateStats(weather, coords.name);

      // 5. Open Drawer
      openDrawer();
    }
  }

  calculateBtn.textContent = "Analyze Route";
  calculateBtn.style.opacity = "1";
});

closeDrawerBtn.addEventListener('click', closeDrawer);

locateMeBtn.addEventListener('click', () => {
  if (navigator.geolocation) {
    inputs.start.value = "Locating...";
    navigator.geolocation.getCurrentPosition(pos => {
      fetchForecast(pos.coords.latitude, pos.coords.longitude).then(data => {
        updateWidget(data);
        inputs.start.value = "Current Location";
      });
    }, err => {
      inputs.start.value = "London";
      alert("Could not pull location.");
    });
  }
});

// --- 🛠️ Core Functions (Open-Meteo) ---

function switchScreen(screenName) {
  if (screenName === 'dashboard') {
    screens.login.classList.add('hidden');
    screens.dashboard.classList.remove('hidden');
  } else {
    screens.dashboard.classList.add('hidden');
    screens.login.classList.remove('hidden');
  }
}

// 1. Geocoding: City -> Lat/Lon
async function getCoordinates(city) {
  try {
    const url = `${GEOCODING_API_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) throw new Error('City not found');

    return data.results[0]; // { latitude, longitude, name, country }
  } catch (error) {
    alert("Could not find location: " + city);
    return null;
  }
}

// 2. Weather: Lat/Lon -> Forecast
async function fetchForecast(lat, lon) {
  try {
    const url = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&windspeed_unit=kmh`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getLiveWeather(city) {
  const coords = await getCoordinates(city);
  if (coords) {
    const data = await fetchForecast(coords.latitude, coords.longitude);
    if (data) updateWidget(data);
  }
}

function updateWidget(data) {
  const current = data.current_weather;
  widget.temp.textContent = Math.round(current.temperature) + '°';
  const weatherInfo = getWeatherDescription(current.weathercode);
  widget.desc.textContent = weatherInfo.desc;
  widget.icon.textContent = weatherInfo.icon;

  updateBackground(current.weathercode);
}

function updateStats(data, cityName) {
  const current = data.current_weather;

  // Update Stats
  stats.arrivalTemp.textContent = Math.round(current.temperature) + '°';
  stats.windGust.textContent = current.windspeed + ' km/h'; // Open-Meteo gives wind speed directly

  // Mock Travel Time
  const randomTime = Math.floor(Math.random() * (90 - 25 + 1) + 25);
  const hours = Math.floor(randomTime / 60);
  const mins = randomTime % 60;
  stats.travelTime.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  // Generate Timeline from REAL Hourly Data
  generateTimeline(data.hourly);
}

function generateTimeline(hourlyData) {
  stats.timeline.innerHTML = '';

  // We want the next 5 hours relative to now
  // Open-Meteo returns iso8601 times array. We just grab indices for now.
  const currentHourIndex = new Date().getHours();

  for (let i = 1; i <= 6; i++) {
    // Handle array wrapping next day is simple in Open-Meteo (it usually returns 7 days)
    // but array is linear (0 to 167 usually). currentHourIndex maps to array index roughly if aligned to UTC/Local.
    // For simplicity in this demo, we'll just grab the next few indices assuming response starts at 00:00 today (usually does).
    // Better path: find index where time > now.

    // Simple Approximation:
    const targetIndex = currentHourIndex + i;

    if (targetIndex < hourlyData.time.length) {
      const timeStr = hourlyData.time[targetIndex].slice(11, 16); // Extract "HH:MM"
      const temp = Math.round(hourlyData.temperature_2m[targetIndex]);
      const code = hourlyData.weathercode[targetIndex];
      const info = getWeatherDescription(code);

      const div = document.createElement('div');
      div.className = 'timeline-item';
      div.innerHTML = `
        <span class="timeline-time">${timeStr}</span>
        <span class="timeline-icon">${info.icon}</span>
        <span class="timeline-temp">${temp}°</span>
      `;
      stats.timeline.appendChild(div);
    }
  }
}

// 3. WMO Weather Code Mapper (The "Decoder Ring" for Open-Meteo)
function getWeatherDescription(code) {
  // WMO Codes: https://open-meteo.com/en/docs
  if (code === 0) return { desc: 'Clear Sky', icon: '☀️' };
  if (code >= 1 && code <= 3) return { desc: 'Partly Cloudy', icon: '⛅' };
  if (code >= 45 && code <= 48) return { desc: 'Foggy', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { desc: 'Drizzle', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { desc: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { desc: 'Snow', icon: '❄️' };
  if (code >= 80 && code <= 82) return { desc: 'Showers', icon: '☔' };
  if (code >= 95 && code <= 99) return { desc: 'Thunderstorm', icon: '⚡' };
  return { desc: 'Unknown', icon: '❓' };
}

function updateBackground(code) {
  let gradient = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';

  if (code === 0) gradient = 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)'; // Clear
  else if (code >= 61 || (code >= 80 && code <= 99)) gradient = 'linear-gradient(135deg, #232526 0%, #414345 100%)'; // Storm/Rain
  else if (code >= 71) gradient = 'linear-gradient(135deg, #83a4d4 0%, #b6fbff 100%)'; // Snow
  else if (code >= 1) gradient = 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)'; // Clouds/Fog

  document.body.style.background = gradient;
}

// Drawer Controls
function openDrawer() {
  statsDrawer.classList.add('open');
}

function closeDrawer() {
  statsDrawer.classList.remove('open');
}

function simulateCalculation() {
  return new Promise(resolve => setTimeout(resolve, 1500));
}
