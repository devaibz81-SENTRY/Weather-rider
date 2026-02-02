# Weather Rider

A simple MVP landing page for checking a quick forecast before your next ride.

## Local development

```bash
npm install
```

Create a `.env` file with your OpenWeather API key:

```bash
VITE_OPENWEATHER_API_KEY=your_key_here
```

Run the app:

```bash
npm run dev
```

## GitHub + Vercel launch

```bash
git init
git add .
git commit -m "Initial Weather Rider MVP"
git remote add origin git@github.com:YOUR_ACCOUNT/Weather-rider.git
git push -u origin main
```

Then import the GitHub repo into Vercel and set `VITE_OPENWEATHER_API_KEY` in the project
environment variables before deploying.

## Deploy

This project is Vercel-ready. Set the `VITE_OPENWEATHER_API_KEY` environment variable in your
project settings before deploying.
