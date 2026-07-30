let map;
let riderMarker;
let spotMarkers = [];
const skateSpots = [
  {
    name: "Downtown Bowl",
    description: "Popular concrete bowl for technical lines.",
    position: { lat: 37.7765, lng: -122.4167 }
  },
  {
    name: "Riverside Rail",
    description: "Street-style hub with rails and ledges.",
    position: { lat: 37.7694, lng: -122.4862 }
  },
  {
    name: "Harbor Plaza",
    description: "Wide plaza with smooth pavement and gaps.",
    position: { lat: 37.7924, lng: -122.3933 }
  },
  {
    name: "Southside Skate Plaza",
    description: "Street course designed for fast flow.",
    position: { lat: 37.7587, lng: -122.4148 }
  }
];

const elements = {
  status: document.getElementById("status"),
  latitude: document.getElementById("latitude"),
  longitude: document.getElementById("longitude"),
  speed: document.getElementById("speed"),
  heading: document.getElementById("heading"),
  accuracy: document.getElementById("accuracy"),
  spotList: document.getElementById("spotList")
};

function initMap() {
  map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
  }).setView([37.7749, -122.4194], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  riderMarker = L.circleMarker([37.7749, -122.4194], {
    radius: 10,
    color: "#ffffff",
    fillColor: "#00e5ff",
    fillOpacity: 1,
    weight: 2,
  })
    .bindPopup("You are here")
    .addTo(map);

  skateSpots.forEach((spot) => {
    const marker = L.marker([spot.position.lat, spot.position.lng], {
      title: spot.name
    }).addTo(map);

    marker.bindPopup(`<strong>${spot.name}</strong><br>${spot.description}`);
    spotMarkers.push(marker);
  });

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });
  } else {
    elements.status.textContent = "GPS unavailable in this browser.";
  }
}

function handlePosition(position) {
  const { latitude, longitude, speed, heading, accuracy } = position.coords;

  elements.status.textContent = "Live skate route active.";
  elements.latitude.textContent = latitude.toFixed(6);
  elements.longitude.textContent = longitude.toFixed(6);
  elements.speed.textContent = speed !== null ? `${(speed * 2.23694).toFixed(1)} mph` : "No speed data";
  elements.heading.textContent = heading !== null ? `${heading.toFixed(0)}°` : "No heading";
  elements.accuracy.textContent = `${accuracy.toFixed(0)} m`;

  const currentPosition = { lat: latitude, lng: longitude };

  riderMarker.setLatLng([latitude, longitude]);
  map.panTo([latitude, longitude]);
  map.setZoom(15);

  updateSpotList(currentPosition);
}

function updateSpotList(currentPosition) {
  const spotsWithDistance = skateSpots
    .map((spot) => ({
      ...spot,
      distance: calculateDistance(currentPosition, spot.position)
    }))
    .sort((a, b) => a.distance - b.distance);

  elements.spotList.innerHTML = "";

  spotsWithDistance.slice(0, 4).forEach((spot) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${spot.name}</strong><br>${spot.description}<br><em>${spot.distance.toFixed(1)} mi away</em>`;
    elements.spotList.appendChild(item);
  });
}

function calculateDistance(a, b) {
  const toRadians = (deg) => deg * (Math.PI / 180);
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  const distanceKm = 2 * R * Math.asin(Math.sqrt(h));
  return distanceKm * 0.621371;
}

function handleError(error) {
  let message = "Unable to access GPS.";
  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = "GPS permission denied. Allow location access to use SkateMap.";
      break;
    case error.POSITION_UNAVAILABLE:
      message = "GPS position unavailable. Try moving to an open area.";
      break;
    case error.TIMEOUT:
      message = "GPS request timed out. Please try again.";
      break;
  }
  elements.status.textContent = message;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/serviceworker.js")
      .then(() => console.log("Service worker registered."))
      .catch((error) => console.warn("Service worker failed:", error));
  });
}
