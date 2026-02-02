// 🚀 Weather Rider App Logic

// OpenWeather API Configuration
const API_KEY = '83320e4d47175ac43be36081684ecf89';
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// State Management
const state = {
  currentScreen: 'login',
  startLocation: 'London',
  destination: '',
  weatherData: null
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
  // Check local storage for previous session
  if (localStorage.getItem('rider_active')) {
    switchScreen('dashboard');
    // Load last known location weather
    getLiveWeather(inputs.start.value);
  } else {
    // Start animation for background if needed
  }
});

// Login Button
enterBtn.addEventListener('click', () => {
  localStorage.setItem('rider_active', 'true');
  switchScreen('dashboard');
  getLiveWeather('London'); // Default start
});

// Calculate Ride Button
calculateBtn.addEventListener('click', async () => {
  const destination = inputs.end.value.trim();
  if (!destination) {
    alert("Please enter a destination!");
    return;
  }

  // Visual Loading Feedback
  calculateBtn.textContent = "Calculating Route...";
  calculateBtn.style.opacity = "0.7";

  // 1. Fetch Real Weather for Destination
  const weather = await fetchWeatherData(destination);

  if (weather) {
    // 2. Simulate Route Calculation (since we don't have Maps API yet)
    await simulateCalculation();

    // 3. Update Stats with Real + Mock Data
    updateStats(weather);

    // 4. Open Drawer
    openDrawer();
  }

  // Reset Button
  calculateBtn.textContent = "Analyze Route";
  calculateBtn.style.opacity = "1";
});

// Close Stats Drawer
closeDrawerBtn.addEventListener('click', closeDrawer);

// Locate Me
locateMeBtn.addEventListener('click', () => {
  if (navigator.geolocation) {
    inputs.start.value = "Locating...";
    navigator.geolocation.getCurrentPosition(pos => {
      // For now, reverse geocoding is complex without another API 
      // so we will just use coords to get weather
      getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      inputs.start.value = "Current Location";
    }, err => {
      inputs.start.value = "London"; // Fallback
      alert("Could not pull location.");
    });
  }
});

// --- 🛠️ Core Functions ---

function switchScreen(screenName) {
  if (screenName === 'dashboard') {
    screens.login.classList.add('hidden');
    screens.dashboard.classList.remove('hidden');
  } else {
    screens.dashboard.classList.add('hidden');
    screens.login.classList.remove('hidden');
  }
}

async function fetchWeatherData(city) {
  try {
    const url = `${API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('City not found');
    return await res.json();
  } catch (error) {
    alert("Could not find weather for " + city);
    return null;
  }
}

async function getLiveWeather(city) {
  const data = await fetchWeatherData(city);
  if (data) updateWidget(data);
}

async function getWeatherByCoords(lat, lon) {
  const url = `${API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();
  updateWidget(data);
}

function updateWidget(data) {
  widget.temp.textContent = Math.round(data.main.temp) + '°';
  widget.desc.textContent = data.weather[0].main;

  // Dynamic Background based on weather
  updateBackground(data.weather[0].id);
}

function updateStats(weatherData) {
  // Real Data
  stats.arrivalTemp.textContent = Math.round(weatherData.main.temp) + '°';
  stats.windGust.textContent = (weatherData.wind.speed * 3.6).toFixed(1) + ' km/h';

  // Mock Data (Travel Time) - Random between 25 and 90 mins
  const randomTime = Math.floor(Math.random() * (90 - 25 + 1) + 25);
  const hours = Math.floor(randomTime / 60);
  const mins = randomTime % 60;
  stats.travelTime.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  // Generate Timeline Mockup
  generateTimeline(Math.round(weatherData.main.temp));
}

function generateTimeline(baseTemp) {
  stats.timeline.innerHTML = '';
  const now = new Date().getHours();

  for (let i = 1; i <= 5; i++) {
    const time = (now + i) % 24;
    const timeStr = time + ':00';
    // Simulate slight temp change
    const temp = baseTemp + Math.floor(Math.random() * 3) - 1;

    const div = document.createElement('div');
    div.className = 'timeline-item';
    div.innerHTML = `
      <span class="timeline-time">${timeStr}</span>
      <span class="timeline-icon">☁️</span>
      <span class="timeline-temp">${temp}°</span>
    `;
    stats.timeline.appendChild(div);
  }
}

function updateBackground(weatherId) {
  let gradient = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';

  if (weatherId >= 200 && weatherId < 600) {
    // Rain / Storm
    gradient = 'linear-gradient(135deg, #232526 0%, #414345 100%)';
  } else if (weatherId === 800) {
    // Clear
    gradient = 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)';
  } else if (weatherId > 800) {
    // Clouds
    gradient = 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)';
  }

  document.body.style.background = gradient;
}

// Drawer Controls
function openDrawer() {
  statsDrawer.classList.add('open');
}

function closeDrawer() {
  statsDrawer.classList.remove('open');
}

// Initial Animation Simulator (Just a delay)
function simulateCalculation() {
  return new Promise(resolve => setTimeout(resolve, 1500));
}
