// OpenWeather API Configuration
const API_KEY = '83320e4d47175ac43be36081684ecf89'; // Your OpenWeather API key
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherCard = document.getElementById('weatherCard');
const loadingState = document.getElementById('loadingState');
const errorMessage = document.getElementById('errorMessage');

// Weather Data Elements
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
locationBtn.addEventListener('click', handleLocation);
cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

// Initialize with saved city or default
window.addEventListener('load', () => {
  const savedCity = localStorage.getItem('lastCity');
  if (savedCity) {
    getWeatherData(savedCity);
  } else {
    getWeatherData('London');
  }
});

/**
 * Handle search button click
 */
function handleSearch() {
  const city = cityInput.value.trim();

  if (city === '') {
    showError('Please enter a city name');
    return;
  }

  getWeatherData(city);
}

/**
 * Handle location button click
 */
function handleLocation() {
  if (navigator.geolocation) {
    showLoading();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        getWeatherDataByCoords(latitude, longitude);
      },
      (error) => {
        hideLoading();
        showError('Unable to retrieve your location. Please check browser permissions.');
        console.error('Geolocation error:', error);
      }
    );
  } else {
    showError('Geolocation is not supported by your browser');
  }
}

/**
 * Fetch weather data by coordinates
 */
async function getWeatherDataByCoords(lat, lon) {
  try {
    showLoading();
    hideError();

    const url = `${API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to fetch weather data.');

    const data = await response.json();
    displayWeatherData(data);

    // Save to local storage
    localStorage.setItem('lastCity', data.name);

  } catch (error) {
    console.error('Error fetching weather data:', error);
    showError(error.message);
    hideLoading();
  }
}

/**
 * Fetch weather data from OpenWeather API by city name
 */
async function getWeatherData(city) {
  try {
    showLoading();
    hideError();

    const url = `${API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('City not found. Please try another city.');
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenWeather API key.');
      } else {
        throw new Error('Failed to fetch weather data. Please try again.');
      }
    }

    const data = await response.json();
    displayWeatherData(data);
    localStorage.setItem('lastCity', city);

  } catch (error) {
    console.error('Error fetching weather data:', error);
    showError(error.message);
    hideLoading();
  }
}

/**
 * Display weather data on the UI
 */
function displayWeatherData(data) {
  // Update UI elements
  cityName.textContent = `${data.name}, ${data.sys.country}`;

  const date = new Date();
  currentDate.textContent = formatDate(date);

  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  weatherDescription.textContent = data.weather[0].description;

  const iconCode = data.weather[0].icon;
  weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  weatherIcon.alt = data.weather[0].description;

  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
  pressure.textContent = `${data.main.pressure} hPa`;

  // Update background based on weather condition
  updateBackground(data.weather[0].id);

  hideLoading();
  weatherCard.classList.add('active');
  cityInput.value = '';
}

/**
 * Update background gradient based on weather condition code
 */
function updateBackground(weatherId) {
  let bgGradient;

  // Thunderstorm
  if (weatherId >= 200 && weatherId < 300) {
    bgGradient = 'linear-gradient(135deg, #232526 0%, #414345 100%)';
  }
  // Drizzle / Rain
  else if (weatherId >= 300 && weatherId < 600) {
    bgGradient = 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)';
  }
  // Snow
  else if (weatherId >= 600 && weatherId < 700) {
    bgGradient = 'linear-gradient(135deg, #83a4d4 0%, #b6fbff 100%)';
  }
  // Atmosphere (Fog, Mist, etc)
  else if (weatherId >= 700 && weatherId < 800) {
    bgGradient = 'linear-gradient(135deg, #3e5151 0%, #decba4 100%)';
  }
  // Clear
  else if (weatherId === 800) {
    bgGradient = 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%, #ffffff 100%)'; // Sunny/Clear
  }
  // Clouds
  else if (weatherId > 800) {
    bgGradient = 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)';
  }
  // Default (your original purple)
  else {
    bgGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }

  document.body.style.background = bgGradient;
}

/**
 * Format date to readable string
 */
function formatDate(date) {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
}

// Helpers
function showLoading() {
  loadingState.style.display = 'block';
  weatherCard.classList.remove('active');
}

function hideLoading() {
  loadingState.style.display = 'none';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
  setTimeout(() => hideError(), 5000);
}

function hideError() {
  errorMessage.classList.remove('active');
}

// Visual enhancements
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('mousemove', (e) => {
    const searchCard = document.querySelector('.search-card');
    if (!searchCard) return;

    const x = (window.innerWidth - e.pageX * 2) / 100;
    const y = (window.innerHeight - e.pageY * 2) / 100;

    searchCard.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg)`;
  });

  document.addEventListener('mouseleave', () => {
    const searchCard = document.querySelector('.search-card');
    if (searchCard) {
      searchCard.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    }
  });
});
