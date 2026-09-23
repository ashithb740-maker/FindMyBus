const API_BASE = window.location.origin;
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchMessage = document.getElementById('searchMessage');
const plannerMessage = document.getElementById('plannerMessage');
const busCount = document.getElementById('busCount');
const mapStatus = document.getElementById('mapStatus');

const busMarkers = new Map();
const map = L.map('liveMap', { zoomControl: true }).setView([12.9716, 77.5946], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

function busIcon(busNumber = 'BUS') {
  return L.divIcon({
    className: 'bus-map-icon',
    html: `<div>🚌<span>${busNumber}</span></div>`,
    iconSize: [52, 42],
    iconAnchor: [26, 21]
  });
}

function updateCount() {
  busCount.textContent = `${busMarkers.size} bus${busMarkers.size === 1 ? '' : 'es'}`;
}

function upsertBusMarker(bus) {
  if (!Number.isFinite(bus.latitude) || !Number.isFinite(bus.longitude)) return;
  const id = bus.busId || `${bus.latitude}-${bus.longitude}`;
  let marker = busMarkers.get(id);
  const label = bus.busNumber || id.slice(0, 8);

  if (!marker) {
    marker = L.marker([bus.latitude, bus.longitude], { icon: busIcon(label) }).addTo(map);
    marker.bindPopup(`<strong>🚌 ${label}</strong><br>Speed: ${bus.speed ?? '—'} km/h`);
    busMarkers.set(id, marker);
  } else {
    marker.setLatLng([bus.latitude, bus.longitude]);
    marker.setPopupContent(`<strong>🚌 ${label}</strong><br>Speed: ${bus.speed ?? '—'} km/h`);
  }
  updateCount();
}

async function loadBuses() {
  try {
    const response = await fetch(`${API_BASE}/api/buses`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Could not load buses');

    result.data.forEach((bus) => {
      if (bus.location?.latitude != null && bus.location?.longitude != null) {
        upsertBusMarker({
          busId: bus._id,
          busNumber: bus.busNumber,
          latitude: bus.location.latitude,
          longitude: bus.location.longitude,
          speed: bus.location.speed
        });
      }
    });
    mapStatus.textContent = 'Live service connected';
  } catch (error) {
    mapStatus.textContent = 'Demo map ready — start the API to receive buses';
    console.warn(error.message);
  }
}

if (typeof io === 'function') {
  const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    mapStatus.textContent = 'Live service connected';
  });
  socket.on('bus:location', upsertBusMarker);
  socket.on('bus:status', (data) => {
    if (data.status === 'inactive') {
      const marker = busMarkers.get(data.busId);
      if (marker) {
        map.removeLayer(marker);
        busMarkers.delete(data.busId);
        updateCount();
      }
    }
  });
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    searchMessage.textContent = 'Enter a bus number, route, or stop to search.';
    searchInput.focus();
    return;
  }

  searchMessage.textContent = 'Searching...';
  try {
    const response = await fetch(`${API_BASE}/api/routes?search=${encodeURIComponent(query)}`);
    const result = await response.json();
    if (result.success && result.data.length) {
      searchMessage.textContent = `Found ${result.data.length} matching route${result.data.length > 1 ? 's' : ''}.`;
      document.getElementById('routes').scrollIntoView({ behavior: 'smooth' });
    } else {
      searchMessage.textContent = `No route found for “${query}”.`;
    }
  } catch (error) {
    searchMessage.textContent = 'Search service is unavailable. Please start the backend.';
  }
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const target = action === 'tracking' ? '#tracking' : action === 'planner' ? '#planner' : '#routes';
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('planBtn').addEventListener('click', () => {
  const from = document.getElementById('fromInput').value.trim();
  const to = document.getElementById('toInput').value.trim();
  if (!from || !to) {
    plannerMessage.textContent = 'Enter both your starting point and destination.';
    return;
  }
  plannerMessage.textContent = `Journey requested: ${from} → ${to}. Route matching will use the available route database.`;
});

document.getElementById('locateBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    mapStatus.textContent = 'Location is not supported by this browser';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      map.setView([coords.latitude, coords.longitude], 15);
      L.circleMarker([coords.latitude, coords.longitude], { radius: 8 }).addTo(map).bindPopup('You are here').openPopup();
    },
    () => { mapStatus.textContent = 'Location permission was not granted'; }
  );
});

document.getElementById('loginBtn').addEventListener('click', () => {
  window.location.href = '/login.html';
});

loadBuses();
