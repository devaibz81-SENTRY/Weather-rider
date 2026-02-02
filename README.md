# 🌤️ Weather Rider - Modern Weather App

*Ride along weather buddy to plan your rides*

A beautiful, modern weather application built with vanilla HTML, CSS, and JavaScript, powered by the OpenWeather API.

![Weather Rider](https://img.shields.io/badge/version-1.0.0-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ Features

- 🎨 **Stunning UI Design** - Modern glassmorphism design with smooth gradients and animations
- 🌍 **Real-time Weather Data** - Get accurate weather information for any city worldwide
- 📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile devices
- 🎭 **Interactive Animations** - Floating weather icons, parallax effects, and smooth transitions
- 🔍 **Smart Search** - Easy city search with error handling and validation
- 📊 **Detailed Metrics** - Temperature, feels like, humidity, wind speed, and pressure

## 🚀 Getting Started

### Prerequisites

You'll need an API key from [OpenWeather](https://openweathermap.org/api):

1. Sign up for a free account at [OpenWeather](https://openweathermap.org/api)
2. Generate your API key from the dashboard
3. Copy your API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/devaibz81-SENTRY/Weather-rider.git
cd Weather-rider
```

2. Open `app.js` and replace `YOUR_API_KEY_HERE` with your OpenWeather API key:
```javascript
const API_KEY = 'your_actual_api_key_here';
```

3. Open `index.html` in your browser or use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server
```

4. Navigate to `http://localhost:8000` in your browser

## 🎯 Usage

1. Enter a city name in the search box
2. Click the "Search" button or press Enter
3. View detailed weather information including:
   - Current temperature
   - Weather description
   - Feels like temperature
   - Humidity percentage
   - Wind speed
   - Atmospheric pressure

## 🛠️ Technologies Used

- **HTML5** - Semantic structure
- **CSS3** - Modern styling with:
  - CSS Variables for theming
  - Flexbox & Grid for layouts
  - Keyframe animations
  - Glassmorphism effects
  - Backdrop filters
- **JavaScript (ES6+)** - Application logic with:
  - Async/Await for API calls
  - DOM manipulation
  - Event handling
  - Error handling

## 📁 Project Structure

```
Weather-rider/
├── index.html          # Main HTML file
├── index.css           # Styling and animations
├── app.js              # Application logic
└── README.md           # Project documentation
```

## 🎨 Design Features

- **Color Palette**: Vibrant purple-blue gradients
- **Typography**: Inter font family for modern readability
- **Effects**: 
  - Glassmorphism cards with backdrop blur
  - Floating animation for weather icons
  - Smooth hover transitions
  - Parallax mouse movement
  - Animated background gradients

## 🔧 Configuration

The app uses the OpenWeather API with the following endpoints:
- Current Weather Data: `https://api.openweathermap.org/data/2.5/weather`

Default units: Metric (Celsius, km/h)

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 👨‍💻 Author

**devaibz81-SENTRY**

- GitHub: [@devaibz81-SENTRY](https://github.com/devaibz81-SENTRY)

## 🌟 Acknowledgments

- Weather data provided by [OpenWeather](https://openweathermap.org/)
- Icons from OpenWeather API
- Design inspiration from modern web applications

---

Made with ❤️ and ☕
