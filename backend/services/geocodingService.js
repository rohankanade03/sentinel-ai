import { env } from "../config/env.js";

const reverseGeocodeTimeoutMs = 3500;

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCoordinates(payload = {}) {
  const lat = parseNumber(payload.latitude ?? payload.lat);
  const lng = parseNumber(payload.longitude ?? payload.lng);

  if (lat === null || lng === null) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return {
    lat,
    lng,
    source: payload.locationSource || payload.coordinateSource || "browser",
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), reverseGeocodeTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function reverseWithGoogle({ lat, lng }) {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: env.googleMapsApiKey,
  });
  const payload = await fetchWithTimeout(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
  );
  const firstResult = payload.results?.[0];

  if (!firstResult?.formatted_address) {
    return null;
  }

  const addressParts = Object.fromEntries(
    firstResult.address_components.flatMap((component) =>
      component.types.map((type) => [type, component.long_name]),
    ),
  );

  return {
    address: firstResult.formatted_address,
    sector:
      addressParts.sublocality_level_1 ||
      addressParts.sublocality ||
      addressParts.neighborhood,
    city: addressParts.locality || addressParts.administrative_area_level_2,
    state: addressParts.administrative_area_level_1,
    pincode: addressParts.postal_code,
    provider: "google",
  };
}

async function reverseWithOpenStreetMap({ lat, lng }) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
  });
  const payload = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        "User-Agent": "CivicFlow/1.0 reverse-geocoding",
      },
    },
  );

  if (!payload.display_name) {
    return null;
  }

  return {
    address: payload.display_name,
    sector:
      payload.address?.suburb ||
      payload.address?.neighbourhood ||
      payload.address?.quarter ||
      payload.address?.road,
    city: payload.address?.city || payload.address?.town || payload.address?.county,
    state: payload.address?.state,
    pincode: payload.address?.postcode,
    provider: "openstreetmap",
  };
}

export async function reverseGeocodeCoordinates(coordinates) {
  if (!coordinates) {
    return null;
  }

  try {
    if (env.googleMapsApiKey) {
      return await reverseWithGoogle(coordinates);
    }

    return await reverseWithOpenStreetMap(coordinates);
  } catch {
    return null;
  }
}

export async function resolveComplaintLocation(payload = {}) {
  const coordinates = parseCoordinates(payload);
  const geocoded = await reverseGeocodeCoordinates(coordinates);
  const fallbackAddress = payload.address || payload.location || payload.sector;
  const address = geocoded?.address || fallbackAddress || "Unmapped location";
  const sector =
    payload.sector ||
    geocoded?.sector ||
    payload.location ||
    payload.address ||
    "Unmapped sector";

  return {
    address,
    sector,
    ward: payload.ward || sector,
    city: payload.city || geocoded?.city || "Delhi",
    state: payload.state || geocoded?.state || "Delhi",
    pincode: payload.pincode || geocoded?.pincode,
    coordinates,
    coordinateSource: coordinates?.source,
    geocodingProvider: geocoded?.provider,
  };
}
