# SOLARIS — Space Weather Monitor

A real-time space weather monitoring dashboard pulling live data from NOAA's Space Weather Prediction Center (SWPC).

![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)

## Features

- **NOAA R/S/G Scales** — Real-time radio blackout, solar radiation, and geomagnetic storm levels
- **Planetary Kp Index** — 24-hour observed values + 3-day forecast
- **10.7cm Solar Radio Flux** — Current reading with 30-day sparkline trend
- **Sunspot Activity** — Daily sunspot numbers and active region count
- **Dst Index** — Disturbance storm time with hourly sparkline
- **Solar Flare Probabilities** — C/M/X class 3-day forecast
- **X-Ray Flares** — Recent flare events with classification
- **Active Solar Regions** — Table with magnetic type, spot count, area
- **SWPC Alerts & Warnings** — Live feed color-coded by severity
- Auto-refresh every 5 minutes

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (check with `node -v`)
- npm (comes with Node.js)

### Setup

```bash
# 1. cd into the project folder
cd solaris-space-weather

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Vite will start on `http://localhost:3000` and open your browser automatically.

### Running from VS Code

1. Open the `solaris-space-weather` folder in VS Code
2. Open the integrated terminal (`Ctrl + ~`)
3. Run `npm install` then `npm run dev`
4. Click the localhost URL in the terminal output

### Production Build

```bash
npm run build     # outputs to /dist
npm run preview   # preview the production build locally
```

## Data Sources

All data is fetched client-side from NOAA/SWPC public JSON endpoints:

| Endpoint | Data |
|----------|------|
| `/products/noaa-scales.json` | R/S/G scale levels |
| `/products/noaa-planetary-k-index.json` | Observed Kp index |
| `/products/noaa-planetary-k-index-forecast.json` | Kp 3-day forecast |
| `/products/alerts.json` | Alerts & warnings |
| `/json/f107_cm_flux.json` | 10.7cm solar flux |
| `/json/sunspot_report.json` | Sunspot numbers |
| `/json/solar_regions.json` | Active regions |
| `/json/solar_probabilities.json` | Flare probabilities |
| `/json/goes/primary/xray-flares-latest.json` | X-ray flares |
| `/products/kyoto-dst.json` | Dst index |
| `/products/10cm-flux-30-day.json` | 30-day flux |

Base URL: `https://services.swpc.noaa.gov`

## License

MIT
