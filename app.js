// OpenWeather API Configuration
const API_KEY = '83320e4d47175ac43be36081684ecf89'; // Your OpenWeather API key
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
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
cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

// Initialize with a default city
window.addEventListener('load', () => {
  getWeatherData('London');
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
 * Fetch weather data from OpenWeather API
 * @param {string} city - City name to search for
 */
async function getWeatherData(city) {
  try {
    // Show loading state
    showLoading();
    hideError();

    // Construct API URL
    const url = `${API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

    // Fetch data
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

    // Display weather data
    displayWeatherData(data);

  } catch (error) {
    console.error('Error fetching weather data:', error);
    showError(error.message);
    hideLoading();
  }
}

/**
 * Display weather data on the UI
 * @param {object} data - Weather data from API
 */
function displayWeatherData(data) {
  // Update city name and country
  cityName.textContent = `${data.name}, ${data.sys.country}`;

  // Update date
  const date = new Date();
  currentDate.textContent = formatDate(date);

  // Update temperature
  temperature.textContent = `${Math.round(data.main.temp)}°C`;

  // Update weather description
  weatherDescription.textContent = data.weather[0].description;

  // Update weather icon
  const iconCode = data.weather[0].icon;
  weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  weatherIcon.alt = data.weather[0].description;

  // Update weather details
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
  pressure.textContent = `${data.main.pressure} hPa`;

  // Show weather card
  hideLoading();
  weatherCard.classList.add('active');

  // Clear input
  cityInput.value = '';
}

/**
 * Format date to readable string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
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

/**
 * Show loading state
 */
function showLoading() {
  loadingState.style.display = 'block';
  weatherCard.classList.remove('active');
}

/**
 * Hide loading state
 */
function hideLoading() {
  loadingState.style.display = 'none';
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');

  // Auto-hide error after 5 seconds
  setTimeout(() => {
    hideError();
  }, 5000);
}

/**
 * Hide error message
 */
function hideError() {
  errorMessage.classList.remove('active');
}

// Add some visual enhancements
document.addEventListener('DOMContentLoaded', () => {
  // Add subtle parallax effect to the search card
  document.addEventListener('mousemove', (e) => {
    const searchCard = document.querySelector('.search-card');
    const x = (window.innerWidth - e.pageX * 2) / 100;
    const y = (window.innerHeight - e.pageY * 2) / 100;

    searchCard.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg)`;
  });

  // Reset transform on mouse leave
  document.addEventListener('mouseleave', () => {
    const searchCard = document.querySelector('.search-card');
    searchCard.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
  });
});
