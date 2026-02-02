import "./style.css";

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
    <main class="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <header class="flex flex-col gap-4">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Weather rider</p>
        <h1 class="text-4xl font-semibold text-white sm:text-5xl">
          Plan your next ride with a fast, focused forecast.
        </h1>
        <p class="max-w-2xl text-lg text-slate-300">
          Search any location to see a clean, five-period snapshot from OpenWeather. Perfect for
          checking a quick MVP before heading out.
        </p>
      </header>

      <section class="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg">
        <form id="search-form" class="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="location" class="text-sm font-medium text-slate-200">Search location</label>
            <input
              id="location"
              name="location"
              type="text"
              required
              placeholder="Try: Nairobi, New York, Tokyo"
              class="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </div>
          <button
            type="submit"
            class="rounded-2xl bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Get forecast
          </button>
        </form>
        <div class="mt-4 text-sm text-slate-400">
          <p>
            Add <span class="font-semibold text-slate-200">VITE_OPENWEATHER_API_KEY</span> to your
            environment. We never store keys in the browser.
          </p>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.2em] text-slate-400">Current snapshot</p>
              <h2 id="location-name" class="mt-2 text-2xl font-semibold text-white">Search to begin</h2>
            </div>
            <span id="last-updated" class="text-xs text-slate-500"></span>
          </div>
          <div id="summary" class="mt-6 grid gap-6 sm:grid-cols-3"></div>
        </div>

        <div class="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h3 class="text-lg font-semibold text-white">Next 5 periods</h3>
          <ul id="forecast-list" class="mt-4 space-y-4"></ul>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
        <div class="grid gap-6 md:grid-cols-3">
          <div class="rounded-2xl bg-slate-900/60 p-5">
            <p class="text-sm text-slate-400">Fast launch</p>
            <p class="mt-2 text-lg font-semibold text-white">Vite + Tailwind ready for Vercel.</p>
          </div>
          <div class="rounded-2xl bg-slate-900/60 p-5">
            <p class="text-sm text-slate-400">Simple inputs</p>
            <p class="mt-2 text-lg font-semibold text-white">Location search only, no GPS.</p>
          </div>
          <div class="rounded-2xl bg-slate-900/60 p-5">
            <p class="text-sm text-slate-400">Open weather</p>
            <p class="mt-2 text-lg font-semibold text-white">Powered by OpenWeather forecast.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
`;

const form = document.querySelector("#search-form");
const locationName = document.querySelector("#location-name");
const summary = document.querySelector("#summary");
const forecastList = document.querySelector("#forecast-list");
const lastUpdated = document.querySelector("#last-updated");

const formatTemp = (temp) => `${Math.round(temp)}°C`;

const getApiKey = () => import.meta.env.VITE_OPENWEATHER_API_KEY;

const updateSummary = (forecast) => {
  summary.innerHTML = "";

  const items = [
    {
      label: "Conditions",
      value: forecast.weather[0]?.description ?? "-"
    },
    {
      label: "Temperature",
      value: formatTemp(forecast.main.temp)
    },
    {
      label: "Wind",
      value: `${Math.round(forecast.wind.speed)} m/s`
    }
  ];

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "rounded-2xl bg-slate-900/70 p-4";
    card.innerHTML = `
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">${item.label}</p>
      <p class="mt-2 text-lg font-semibold text-white">${item.value}</p>
    `;
    summary.appendChild(card);
  });
};

const updateForecastList = (list) => {
  forecastList.innerHTML = "";

  list.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3";
    item.innerHTML = `
      <div>
        <p class="text-sm font-semibold text-white">${new Date(entry.dt * 1000).toLocaleString()}</p>
        <p class="text-xs text-slate-400">${entry.weather[0]?.description ?? "-"}</p>
      </div>
      <div class="text-right">
        <p class="text-lg font-semibold text-white">${formatTemp(entry.main.temp)}</p>
        <p class="text-xs text-slate-400">Feels like ${formatTemp(entry.main.feels_like)}</p>
      </div>
    `;
    forecastList.appendChild(item);
  });
};

const updateUI = ({ city, list }) => {
  if (!list?.length) {
    locationName.textContent = "No data available";
    summary.innerHTML = "";
    forecastList.innerHTML = "";
    return;
  }

  locationName.textContent = `${city.name}, ${city.country}`;
  lastUpdated.textContent = `Updated ${new Date(list[0].dt * 1000).toLocaleTimeString()}`;
  updateSummary(list[0]);
  updateForecastList(list.slice(0, 5));
};

const showError = (message) => {
  locationName.textContent = message;
  summary.innerHTML = "";
  forecastList.innerHTML = "";
};

const fetchForecast = async (location) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    showError("Missing API key. Add VITE_OPENWEATHER_API_KEY to run the app.");
    return;
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("q", location);
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Unable to fetch forecast. Try another location.");
    }

    const data = await response.json();
    updateUI(data);
  } catch (error) {
    showError(error.message);
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const location = formData.get("location");

  if (location) {
    fetchForecast(location.toString().trim());
  }
});

fetchForecast("Nairobi");
