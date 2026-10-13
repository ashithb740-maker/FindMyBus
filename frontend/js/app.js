const API_BASE = window.location.origin;
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchMessage = document.getElementById('searchMessage');
const plannerMessage = document.getElementById('plannerMessage');
const busCount = document.getElementById('busCount');
const mapStatus = document.getElementById('mapStatus');
const popularRoutes = document.getElementById('popularRoutes');
const searchResults = document.getElementById('searchResults');
const routeResultsSection = document.getElementById('routeResultsSection');
const routeResultsGrid = document.getElementById('routeResultsGrid');
let searchMode = 'bus';
let routesCache = [];

const busMarkers = new Map();
const map = L.map('liveMap', { zoomControl: true }).setView([12.9716, 77.5946], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function routeStops(route) {
  const stops = Array.isArray(route.stops) ? route.stops.slice().sort((a,b) => (a.sequence||0)-(b.sequence||0)).map(s => typeof s === 'string' ? s : s.name).filter(Boolean) : [];
  if (!stops.length) return [route.source, route.destination].filter(Boolean);
  if (route.source && !stops.some(s => s.toLowerCase() === route.source.toLowerCase())) stops.unshift(route.source);
  if (route.destination && !stops.some(s => s.toLowerCase() === route.destination.toLowerCase())) stops.push(route.destination);
  return stops;
}
function routeDescription(route) {
  const stops = routeStops(route);
  return stops.length ? stops.join(' → ') : 'Stops not added yet';
}
function renderRouteChips(routes) {
  if (!popularRoutes) return;
  if (!routes.length) {
    popularRoutes.innerHTML = '<span>Routes:</span><span class="route-loading">No routes published yet</span>';
    return;
  }
  popularRoutes.innerHTML = '<span>Routes:</span>' + routes.slice(0,5).map(r =>
    '<button type="button" class="popular-chip" data-route-search="' + escapeHTML(r.routeNumber || r.name || '') + '">' + escapeHTML(r.routeNumber || r.name || 'Route') + '</button>'
  ).join('');
  popularRoutes.querySelectorAll('[data-route-search]').forEach(chip => chip.addEventListener('click', () => {
    searchInput.value = chip.dataset.routeSearch;
    searchMode = 'route';
    searchRoutes(chip.dataset.routeSearch);
  }));
}
function renderRouteResults(routes) {
  if (!routeResultsSection || !routeResultsGrid) return;
  routeResultsSection.hidden = false;
  if (!routes.length) {
    routeResultsGrid.innerHTML = '<p class="route-empty">No matching routes were found. Try another route number or stop name.</p>';
    return;
  }
  routeResultsGrid.innerHTML = routes.map(route => {
    const stops = routeStops(route);
    return '<article class="route-result-card"><div class="route-result-top"><span class="route-number">' + escapeHTML(route.routeNumber || 'Route') + '</span><span class="route-stop-count">' + stops.length + ' stops</span></div><h3>' + escapeHTML(route.name || ((route.source || 'Start') + ' → ' + (route.destination || 'Destination'))) + '</h3><p>' + escapeHTML(routeDescription(route)) + '</p><div class="route-result-meta"><span>⏱ ' + escapeHTML(route.estimatedDurationMinutes ? route.estimatedDurationMinutes + ' min' : 'Timing on request') + '</span><span>₹' + escapeHTML(route.fare ?? '—') + '</span></div><a href="routes.html">View route details →</a></article>';
  }).join('');
}
function busIcon(busNumber = 'BUS') {
  return L.divIcon({ className:'bus-map-icon', html:'<div>🚌<span>' + escapeHTML(busNumber) + '</span></div>', iconSize:[52,42], iconAnchor:[26,21] });
}
function updateCount() { if (busCount) busCount.textContent = busMarkers.size + ' bus' + (busMarkers.size === 1 ? '' : 'es'); }
function upsertBusMarker(bus) {
  const latitude = Number(bus.latitude ?? bus.location?.latitude);
  const longitude = Number(bus.longitude ?? bus.location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  const id = String(bus.busId || bus._id || (latitude + '-' + longitude));
  let marker = busMarkers.get(id);
  const label = bus.busNumber || id.slice(0,8);
  if (!marker) {
    marker = L.marker([latitude,longitude],{icon:busIcon(label)}).addTo(map);
    marker.bindPopup('<strong>🚌 ' + escapeHTML(label) + '</strong><br>Speed: ' + escapeHTML(bus.speed ?? bus.location?.speed ?? '—') + ' km/h');
    busMarkers.set(id,marker);
  } else {
    marker.setLatLng([latitude,longitude]);
    marker.setPopupContent('<strong>🚌 ' + escapeHTML(label) + '</strong><br>Speed: ' + escapeHTML(bus.speed ?? bus.location?.speed ?? '—') + ' km/h');
  }
  updateCount();
}
async function loadBuses() {
  try {
    const response = await fetch(API_BASE + '/api/buses');
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Could not load buses');
    (result.data || []).forEach(upsertBusMarker);
    mapStatus.textContent = 'Live service connected';
  } catch (error) {
    mapStatus.textContent = 'Map ready — live buses appear when the driver GPS service is active';
    console.info('Bus API unavailable:', error.message);
  }
}
async function loadRoutes() {
  try {
    const response = await fetch(API_BASE + '/api/routes');
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Could not load routes');
    routesCache = result.data || [];
    renderRouteChips(routesCache);
  } catch (error) {
    renderRouteChips([]);
    if (searchMessage) searchMessage.textContent = 'Route service is unavailable. Please try again after the backend starts.';
  }
}
async function searchRoutes(query) {
  const value = String(query || '').trim();
  if (searchMode === 'nearby') {
    window.location.href = 'nearby.html';
    return;
  }
  if (!value) {
    searchMessage.textContent = 'Enter a bus number, route name, or stop to search.';
    searchInput.focus();
    return;
  }
  searchMessage.textContent = 'Searching…';
  if (searchResults) searchResults.innerHTML = '';
  if (routeResultsSection) routeResultsSection.hidden = true;
  try {
    if (searchMode === 'bus') {
      const response = await fetch(API_BASE + '/api/buses');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not load buses');
      const buses = (result.data || []).filter(bus => {
        const route = bus.routeId || {};
        const haystack = [bus.busNumber, bus.status, route.routeNumber, route.name, route.source, route.destination]
          .filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(value.toLowerCase());
      });
      if (!buses.length) {
        searchMessage.textContent = 'No registered bus matches “' + value + '”.';
        if (searchResults) searchResults.innerHTML = '<div class="route-empty">Bus records appear here after the administrator registers buses. Try searching by a route or stop instead.</div>';
        return;
      }
      searchMessage.textContent = buses.length + ' matching bus' + (buses.length === 1 ? '' : 'es') + ' found.';
      if (searchResults) searchResults.innerHTML = buses.map(bus => {
        const route = bus.routeId || {};
        const position = bus.location || {};
        return '<article class="route-result-card"><div class="route-result-top"><span class="route-number">' + escapeHTML(bus.busNumber || 'Bus') + '</span><span class="route-stop-count">' + escapeHTML(bus.status || 'inactive') + '</span></div><h3>' + escapeHTML(route.name || 'Route not assigned') + '</h3><p>' + escapeHTML((route.source || 'Start not set') + ' → ' + (route.destination || 'Destination not set')) + '</p><div class="route-result-meta"><span>GPS: ' + (Number.isFinite(Number(position.latitude)) && Number.isFinite(Number(position.longitude)) ? 'Location available' : 'Waiting for GPS') + '</span></div><a href="bus.html?id=' + encodeURIComponent(bus._id) + '">Track this bus →</a></article>';
      }).join('');
      searchResults.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    const response = await fetch(API_BASE + '/api/routes?search=' + encodeURIComponent(value));
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Search failed');
    const matches = result.data || [];
    searchMessage.textContent = matches.length ? 'Found ' + matches.length + ' matching route' + (matches.length === 1 ? '' : 's') + '.' : 'No configured route found for “' + value + '”.';
    renderRouteResults(matches);
    routeResultsSection?.scrollIntoView({behavior:'smooth',block:'start'});
  } catch (error) {
    searchMessage.textContent = 'Search service is unavailable. Please check the backend connection.';
  }
}
if (typeof io === 'function') {
  const socket = io(API_BASE, {transports:['websocket','polling']});
  socket.on('connect', () => { mapStatus.textContent = 'Live service connected'; });
  socket.on('bus:location', upsertBusMarker);
  socket.on('bus:status', data => {
    if (data.status !== 'inactive') return;
    const marker = busMarkers.get(String(data.busId));
    if (marker) { map.removeLayer(marker); busMarkers.delete(String(data.busId)); updateCount(); }
  });
}
searchForm?.addEventListener('submit', event => { event.preventDefault(); searchRoutes(searchInput.value); });
document.querySelectorAll('.search-tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.search-tab').forEach(item => item.classList.remove('active'));
  tab.classList.add('active');
  searchMode = tab.dataset.searchMode || 'bus';
  searchInput.placeholder = searchMode === 'bus' ? 'Enter bus number or route name...' : searchMode === 'route' ? 'Enter route number, source or destination...' : 'Enter a stop or area name...';
  searchInput.focus();
}));
document.getElementById('navSearchBtn')?.addEventListener('click', () => {
  searchInput.focus();
  document.getElementById('home')?.scrollIntoView({behavior:'smooth'});
});
document.getElementById('planBtn')?.addEventListener('click', async () => {
  const from = document.getElementById('fromInput').value.trim();
  const to = document.getElementById('toInput').value.trim();
  if (!from || !to) { plannerMessage.textContent = 'Enter both your starting point and destination.'; return; }
  plannerMessage.textContent = 'Finding configured routes from ' + from + ' to ' + to + '…';
  try {
    const response = await fetch(API_BASE + '/api/routes');
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error('Route API unavailable');
    const matching = (result.data || []).filter(route => {
      const stops = routeStops(route).map(s => s.toLowerCase());
      const a = stops.findIndex(s => s.includes(from.toLowerCase()));
      const b = stops.findIndex(s => s.includes(to.toLowerCase()));
      return a >= 0 && b > a;
    });
    if (!matching.length) {
      plannerMessage.textContent = 'No direct configured route found for these stops yet.';
      return;
    }
    plannerMessage.textContent = 'Matching route' + (matching.length > 1 ? 's' : '') + ': ' + matching.map(r => (r.routeNumber || r.name) + ' (' + r.source + ' → ' + r.destination + ')').join(' • ');
    renderRouteResults(matching);
    routeResultsSection?.scrollIntoView({behavior:'smooth',block:'start'});
  } catch (error) {
    plannerMessage.textContent = 'Journey planning needs the route service to be available.';
  }
});
document.getElementById('locateBtn')?.addEventListener('click', () => {
  if (!navigator.geolocation) { mapStatus.textContent = 'Location is not supported by this browser'; return; }
  navigator.geolocation.getCurrentPosition(({coords}) => {
    map.setView([coords.latitude,coords.longitude],15);
    L.circleMarker([coords.latitude,coords.longitude],{radius:8,color:'#07875f',fillOpacity:.9}).addTo(map).bindPopup('You are here').openPopup();
  },() => { mapStatus.textContent = 'Location permission was not granted'; },{enableHighAccuracy:true,timeout:10000});
});
loadRoutes();
loadBuses();
