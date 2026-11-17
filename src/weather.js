// Live conditions for the player's location from Open-Meteo (free, no API key).
import { timeOfDay, weatherFromCode } from "./spawn.js";

const hourOf = iso => { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; };

export async function fetchConditions(lat, lon, habitats = []) {
  const url = "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    "&current=temperature_2m,weather_code,wind_speed_10m" +
    "&daily=sunrise,sunset&forecast_days=1&timezone=auto";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
  const d = await res.json();
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    timeOfDay: timeOfDay(now.getHours() + now.getMinutes() / 60, hourOf(d.daily.sunrise[0]), hourOf(d.daily.sunset[0])),
    weather: weatherFromCode(d.current.weather_code),
    cold: d.current.temperature_2m < 0,
    windy: d.current.wind_speed_10m > 30,
    temperatureC: d.current.temperature_2m,
    habitats,
  };
}
