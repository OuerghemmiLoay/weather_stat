"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";

const COUNTRIES = [
  { name: "United States", code: "US", lat: 39.5, lon: -98.35, x: 20, y: 38 },
  { name: "Canada", code: "CA", lat: 56.13, lon: -106.35, x: 18, y: 24 },
  { name: "Mexico", code: "MX", lat: 23.63, lon: -102.55, x: 22, y: 50 },
  { name: "Brazil", code: "BR", lat: -10.33, lon: -53.2, x: 35, y: 70 },
  { name: "United Kingdom", code: "GB", lat: 55.38, lon: -3.44, x: 46, y: 33 },
  { name: "France", code: "FR", lat: 46.23, lon: 2.21, x: 48, y: 39 },
  { name: "Nigeria", code: "NG", lat: 9.08, lon: 8.68, x: 54, y: 58 },
  { name: "South Africa", code: "ZA", lat: -30.56, lon: 22.94, x: 57, y: 76 },
  { name: "India", code: "IN", lat: 20.59, lon: 78.96, x: 69, y: 54 },
  { name: "China", code: "CN", lat: 35.86, lon: 104.2, x: 74, y: 44 },
  { name: "Japan", code: "JP", lat: 36.2, lon: 138.25, x: 83, y: 45 },
  { name: "Australia", code: "AU", lat: -25.27, lon: 133.78, x: 80, y: 75 },
];

const STAT_LABELS = [
  { key: "temperature_2m", label: "Temp", unit: "°C" },
  { key: "relative_humidity_2m", label: "Humidity", unit: "%" },
  { key: "wind_speed_10m", label: "Wind", unit: "km/h" },
  { key: "precipitation_probability", label: "Precip", unit: "%" },
];

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return Number(value).toFixed(digits);
}

export default function Home() {
  const [selectedCode, setSelectedCode] = useState("US");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((country) => country.code === selectedCode),
    [selectedCode]
  );

  useEffect(() => {
    let isActive = true;
    async function loadWeather() {
      if (!selectedCountry) {
        return;
      }

      setLoading(true);
      setError("");

      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", selectedCountry.lat);
      url.searchParams.set("longitude", selectedCountry.lon);
      url.searchParams.set(
        "current",
        "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability"
      );
      url.searchParams.set(
        "daily",
        "temperature_2m_max,temperature_2m_min"
      );
      url.searchParams.set("forecast_days", "5");
      url.searchParams.set("timezone", "auto");

      try {
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error("Unable to load weather data.");
        }
        const data = await response.json();
        if (isActive) {
          setWeather(data);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(fetchError.message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadWeather();
    return () => {
      isActive = false;
    };
  }, [selectedCountry]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    let isMounted = true;

    async function initMap() {
      const L = await import("leaflet");
      if (!isMounted || !mapRef.current) {
        return;
      }
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
      }).setView([20, 0], 1.4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 5,
        minZoom: 1,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const trend = useMemo(() => {
    if (!weather?.daily?.temperature_2m_max) {
      return [];
    }
    return weather.daily.temperature_2m_max.map((maxValue, index) => ({
      day: weather.daily.time?.[index],
      max: maxValue,
      min: weather.daily.temperature_2m_min?.[index],
    }));
  }, [weather]);

  const maxValue = Math.max(
    ...trend.map((point) => point.max ?? -Infinity),
    -Infinity
  );
  const minValue = Math.min(
    ...trend.map((point) => point.min ?? Infinity),
    Infinity
  );
  const range = Math.max(maxValue - minValue, 1);

  const maxLine = trend
    .map((point, index) => {
      const x = (index / (trend.length - 1 || 1)) * 100;
      const y = 100 - ((point.max - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const minLine = trend
    .map((point, index) => {
      const x = (index / (trend.length - 1 || 1)) * 100;
      const y = 100 - ((point.min - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="min-h-full bg-hero text-slate-950">
      <div className="hero-glow" />
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <p className="label-chip">Weather Stat Atlas</p>
            <h1 className="headline">
              Live climate stats and 5-day trends by country.
            </h1>
            <p className="subtitle max-w-2xl">
              Tap a hotspot on the map or choose a country to view the latest
              temperature, humidity, wind, and precipitation outlooks.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:min-w-[240px]">
            <label className="text-xs uppercase tracking-[0.28em] text-slate-600">
              Country
            </label>
            <select
              className="select-field"
              value={selectedCode}
              onChange={(event) => setSelectedCode(event.target.value)}
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="map-shell">
            <div className="map-header">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Select on Map
                </p>
                <h2 className="text-2xl font-semibold">
                  {selectedCountry?.name || "Choose a country"}
                </h2>
              </div>
              <div className="map-pill">Atlas view</div>
            </div>
            <div className="map-canvas">
              <div ref={mapRef} className="map-leaflet" aria-hidden="true" />
              <div className="map-haze" aria-hidden="true" />
              <svg
                aria-hidden="true"
                className="map-shape"
                viewBox="0 0 900 450"
              >
                <path
                  d="M74 94C126 45 188 27 276 52C354 73 384 109 444 130C508 151 561 123 628 135C690 147 742 189 784 251C822 308 810 357 748 373C674 392 602 333 538 331C470 329 430 392 352 401C272 411 214 397 172 351C132 309 68 248 44 198C20 149 28 140 74 94Z"
                />
                <path d="M612 304C654 262 708 269 744 302C782 337 774 380 732 398C688 416 642 382 612 350Z" />
                <path d="M198 308C244 274 316 282 344 326C370 366 334 404 276 402C222 401 170 348 198 308Z" />
              </svg>
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className={`map-dot ${
                    country.code === selectedCode ? "active" : ""
                  }`}
                  style={{ left: `${country.x}%`, top: `${country.y}%` }}
                  onClick={() => setSelectedCode(country.code)}
                  aria-label={`Select ${country.name}`}
                />
              ))}
              <div className="map-grid" aria-hidden="true" />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Current Snapshot
                </p>
                <h2 className="text-2xl font-semibold">
                  {selectedCountry?.name}
                </h2>
              </div>
              <span className="panel-pill">
                {weather?.timezone ? weather.timezone : "Local time"}
              </span>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <div className="stat-grid">
              {STAT_LABELS.map((stat) => (
                <div key={stat.key} className="stat-card">
                  <p className="stat-label">{stat.label}</p>
                  <p className="stat-value">
                    {loading
                      ? "..."
                      : `${formatNumber(
                          weather?.current?.[stat.key],
                          0
                        )}${stat.unit}`}
                  </p>
                </div>
              ))}
            </div>

            <div className="trend-card">
              <div className="trend-header">
                <h3 className="text-base font-semibold">5-day temperature</h3>
                <p className="text-xs text-slate-500">
                  Max / Min °C
                </p>
              </div>
              <div className="trend-chart">
                {trend.length ? (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline className="trend-line max" points={maxLine} />
                    <polyline className="trend-line min" points={minLine} />
                  </svg>
                ) : (
                  <div className="trend-empty">Waiting for data...</div>
                )}
              </div>
              <div className="trend-grid">
                {trend.map((point) => (
                  <div key={point.day} className="trend-day">
                    <span className="trend-date">
                      {point.day?.slice(5) || "--"}
                    </span>
                    <span className="trend-temp">
                      {formatNumber(point.max, 0)} / {formatNumber(point.min, 0)}°
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            Data: Open-Meteo API · Updated {weather?.current?.time || "--"}
          </p>
          <p>Hover dots to explore regions, click to lock selection.</p>
        </footer>
      </main>
    </div>
  );
}
