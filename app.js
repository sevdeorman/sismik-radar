// 1. Haritayı başlat
const map = L.map('map').setView([39.0, 35.3], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const turkeyBounds = [
  [35.0, 25.0],
  [43.0, 45.0]
];
map.fitBounds(turkeyBounds);

// Katmanlar & Değişkenler
const quakeLayer = L.layerGroup().addTo(map);
const assemblyLayer = L.layerGroup().addTo(map);
let heatLayer = null;
let routeLine = null;
let currentMode = 'points';
let rawEarthquakeData = [];
let minMagFilter = 0;
let searchQuery = "";
let userLocation = null;
let userMarker = null;

// Renk Belirleme
function getColor(magnitude) {
  if (magnitude >= 5.0) return '#ef4444';
  if (magnitude >= 4.0) return '#f97316';
  if (magnitude >= 3.0) return '#eab308';
  return '#10b981';
}

// Haversine Mesafe Formülü
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Deprem Verilerini Çek
async function getEarthquakes() {
  try {
    const response = await fetch('https://api.orhanaydogdu.com.tr/deprem/kandilli/live');
    const data = await response.json();

    if (!data || !data.result || data.result.length === 0) return;

    rawEarthquakeData = data.result;
    document.getElementById('last-update').innerText = `Son Güncelleme: ${new Date().toLocaleTimeString('tr-TR')}`;

    renderDashboard();

    if (userLocation) findNearestQuake();

  } catch (error) {
    console.error("Veri çekme hatası:", error);
  }
}

// Dashboard Çizim Motoru
function renderDashboard() {
  const listContainer = document.getElementById('quake-list');
  quakeLayer.clearLayers();
  if (heatLayer) map.removeLayer(heatLayer);
  listContainer.innerHTML = '';

  const filteredData = rawEarthquakeData.filter(eq => {
    const mag = parseFloat(eq.mag) || 0;
    const location = (eq.title || "").toLowerCase();
    return mag >= minMagFilter && location.includes(searchQuery.toLowerCase());
  });

  document.getElementById('quake-count').innerText = `${filteredData.length} Deprem`;

  if (filteredData.length === 0) {
    listContainer.innerHTML = `<p class="loading-text">Kriterlere uygun sarsıntı bulunamadı.</p>`;
    return;
  }

  const heatData = [];

  filteredData.forEach(eq => {
    try {
      const coords = eq.geojson?.coordinates || [eq.lng, eq.lat];
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      const mag = parseFloat(eq.mag);
      const location = eq.title || "Bilinmeyen Konum";
      const depth = eq.depth || "0";
      const date = eq.date || "";

      if (isNaN(lat) || isNaN(lng)) return;

      heatData.push([lat, lng, mag * 0.4]);

      const circle = L.circleMarker([lat, lng], {
        radius: Math.max(mag * 3, 5),
        fillColor: getColor(mag),
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75
      }).addTo(quakeLayer);

      circle.bindPopup(`
        <div style="color: #111; font-family: sans-serif; min-width: 160px;">
          <strong style="font-size: 13px; color: #0f172a;">${location}</strong>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;">
          <b>Büyüklük:</b> ${mag}<br>
          <b>Derinlik:</b> ${depth} km<br>
          <b>Zaman:</b> ${date}
        </div>
      `);

      const card = document.createElement('div');
      card.className = 'quake-card';
      card.style.cssText = `
        background: #1e293b;
        padding: 10px 14px;
        border-radius: 8px;
        border-left: 4px solid ${getColor(mag)};
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.15s ease;
      `;

      card.onmouseover = () => card.style.background = '#334155';
      card.onmouseout = () => card.style.background = '#1e293b';

      const timeOnly = date.includes(' ') ? date.split(' ')[1] : date;

      card.innerHTML = `
        <div style="max-width: 80%;">
          <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${location}</div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 3px;">Derinlik: ${depth} km | ${timeOnly}</div>
        </div>
        <div style="font-size: 1.15rem; font-weight: 800; color: ${getColor(mag)};">${mag}</div>
      `;

      card.addEventListener('click', () => {
        map.flyTo([lat, lng], 9, { duration: 1.2 });
        circle.openPopup();
      });

      listContainer.appendChild(card);
    } catch (err) {
      console.warn(err);
    }
  });

  heatLayer = L.heatLayer(heatData, {
    radius: 25,
    blur: 15,
    maxZoom: 10,
    gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
  });

  updateLayerVisibility();
}

// Görünüm Modu
function updateLayerVisibility() {
  const btnPoints = document.getElementById('btn-points');
  const btnHeat = document.getElementById('btn-heat');

  if (currentMode === 'points') {
    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    map.addLayer(quakeLayer);
    btnPoints.style.background = '#3b82f6';
    btnPoints.style.color = '#ffffff';
    btnHeat.style.background = 'transparent';
    btnHeat.style.color = '#94a3b8';
  } else {
    if (map.hasLayer(quakeLayer)) map.removeLayer(quakeLayer);
    if (heatLayer) map.addLayer(heatLayer);
    btnHeat.style.background = '#3b82f6';
    btnHeat.style.color = '#ffffff';
    btnPoints.style.background = 'transparent';
    btnPoints.style.color = '#94a3b8';
  }
}

document.getElementById('btn-points').addEventListener('click', () => {
  currentMode = 'points';
  updateLayerVisibility();
});

document.getElementById('btn-heat').addEventListener('click', () => {
  currentMode = 'heat';
  updateLayerVisibility();
});

// Slider & Arama
document.getElementById('mag-slider').addEventListener('input', (e) => {
  minMagFilter = parseFloat(e.target.value);
  document.getElementById('mag-filter-val').innerText = `${minMagFilter.toFixed(1)}+`;
  renderDashboard();
});

document.getElementById('search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderDashboard();
});

// Konum & Acil Toplanma Alanı Motoru
document.getElementById('locate-btn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert("Konum desteklenmiyor.");
    return;
  }

  const infoBox = document.getElementById('nearest-quake-info');
  infoBox.innerText = "Konumunuz alınıyor...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      userLocation = { lat: userLat, lng: userLng };

      if (userMarker) map.removeLayer(userMarker);

      userMarker = L.circleMarker([userLat, userLng], {
        radius: 8,
        fillColor: '#38bdf8',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).addTo(map);

      userMarker.bindPopup("<b>Buradasınız!</b>").openPopup();
      map.setView([userLat, userLng], 14);
      document.getElementById('locate-btn').style.display = 'none';

      findNearestQuake();
      generateAssemblyPoints(userLat, userLng);
    },
    () => {
      infoBox.innerText = "Konum izni alınamadı.";
    }
  );
});

function findNearestQuake() {
  if (!userLocation || rawEarthquakeData.length === 0) return;

  let nearestDistance = Infinity;

  rawEarthquakeData.forEach(eq => {
    const coords = eq.geojson?.coordinates || [eq.lng, eq.lat];
    const lng = parseFloat(coords[0]);
    const lat = parseFloat(coords[1]);
    const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
    if (dist < nearestDistance) nearestDistance = dist;
  });

  const infoBox = document.getElementById('nearest-quake-info');
  if (nearestDistance !== Infinity) {
    infoBox.innerHTML = `📍 En yakın sarsıntı size yaklaşık <span style="color: #38bdf8;">${nearestDistance} km</span> mesafede gerçekleşti.`;
  }
}

// Toplanma Alanları & Tahliye Rotası
function generateAssemblyPoints(userLat, userLng) {
  assemblyLayer.clearLayers();
  if (routeLine) map.removeLayer(routeLine);

  const mockAssemblySpots = [
    { name: "Belediye Şehir Parkı & Açık Alanı", latOffset: 0.0035, lngOffset: 0.0030, capacity: "Yüksek" },
    { name: "Cumhuriyet Meydanı Toplanma Sahası", latOffset: -0.0028, lngOffset: 0.0042, capacity: "Orta" },
    { name: "Merkez Kapalı Spor Salonu Bahçesi", latOffset: 0.0040, lngOffset: -0.0035, capacity: "Yüksek" },
    { name: "Atatürk Parkı Güvenli Bölge", latOffset: -0.0032, lngOffset: -0.0025, capacity: "Geniş" }
  ];

  let nearestSpot = null;
  let minDistance = Infinity;

  mockAssemblySpots.forEach(spot => {
    const spotLat = userLat + spot.latOffset;
    const spotLng = userLng + spot.lngOffset;
    const distMeters = Math.round(calculateDistance(userLat, userLng, spotLat, spotLng) * 1000);

    const assemblyMarker = L.circleMarker([spotLat, spotLng], {
      radius: 9,
      fillColor: '#22c55e',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(assemblyLayer);

    assemblyMarker.bindPopup(`
      <div style="color: #0f172a; font-family: sans-serif;">
        <b style="color: #15803d; font-size: 13px;">🛡️ Acil Toplanma Alanı</b><br>
        <strong>${spot.name}</strong>
        <hr style="margin: 4px 0; border: none; border-top: 1px solid #e2e8f0;">
        <b>Yürüme Mesafesi:</b> ~${distMeters} metre<br>
        <b>Kapasite:</b> ${spot.capacity}<br>
        <button onclick="drawRouteToSpot(${userLat}, ${userLng}, ${spotLat}, ${spotLng})" style="margin-top: 6px; width: 100%; background: #15803d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
          Buraya Rota Çiz 🧭
        </button>
      </div>
    `);

    if (distMeters < minDistance) {
      minDistance = distMeters;
      nearestSpot = { ...spot, spotLat, spotLng, distMeters };
    }
  });

  if (nearestSpot) {
    const infoDiv = document.getElementById('assembly-area-info');
    infoDiv.style.display = 'block';
    document.getElementById('assembly-name').innerText = nearestSpot.name;
    document.getElementById('assembly-dist').innerText = `Mesafe: ~${nearestSpot.distMeters} m (En Yakın Güvenli Bölge)`;
    drawRouteToSpot(userLat, userLng, nearestSpot.spotLat, nearestSpot.spotLng);
  }
}

window.drawRouteToSpot = function(fromLat, fromLng, toLat, toLng) {
  if (routeLine) map.removeLayer(routeLine);

  routeLine = L.polyline([
    [fromLat, fromLng],
    [toLat, toLng]
  ], {
    color: '#22c55e',
    weight: 4,
    dashArray: '6, 8',
    opacity: 0.85
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
};

// Başlat ve 60 sn döngü
getEarthquakes();
setInterval(getEarthquakes, 60000);