loadStopsCsv();

let ws = null;
let trackingButton = false;
const vehicles = new Map();
const STREAM_URL = 'wss://gis.brno.cz/geoevent/ws/services/stream_kordis_26/StreamServer/subscribe';

const stopsMap = new Map(); // normalizedId (číslo jako string) -> název

// Načte stops.csv a uloží mapu s klíči normalizovanými tak, že z hodnot
// jako "U1234Z1" získá "1234".
async function loadStopsCsv(url = 'stops.csv') {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch stops.csv: ' + res.status);
        const txt = await res.text();
        const lines = txt.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i].trim();
            if (!rawLine) continue;
            const parts = rawLine.split(';');
            if (parts.length < 2) continue;
            let rawId = parts[0].trim().replace(/^"|"$/g, '');
            const name = parts.slice(1).join(';').trim().replace(/^"|"$/g, '');
            // Normalizace: najdeme první číslicovou posloupnost v rawId
            const m = rawId.match(/\d+/);
            if (!m) continue;
            const normalized = m[0]; // např. "1234"
            stopsMap.set(normalized, name);
        }
    } catch (e) {
        // ticho — nezapisovat do konzole podle požadavku
    }
}

// Barva podle LineID
function colorForLine(lineId, vtype, isInactive) {
    const id = Number(lineId) || 0;
    const vt = Number(vtype);
    if (vt == 5) return '#c66b4b';
    if (isInactive) return '#ffffff';
    if (id >= 1 && id <= 20) return '#d32d2a';       // červená
    if (id >= 21 && id <= 39) return '#4ca14c';      // zelená
    if (id >= 40 && id <= 88) return '#247ac8';      // modrá
    if (id >= 89 && id <= 99) return '#000000';      // černá
    if (id >= 100 && id <= 999) return '#878686';    // tmavě šedá
    return '#1978c8';
}

// SVG trojúhelník s bílým outline (stroke) a číslem linky nezávislým na rotaci
function createTriangleHtml(bearing=0, size=36, fillColor='#1978c8', lineText='') {
    const half = size / 2;
    // trojúhelník orientovaný špičkou nahoru; polygon má bílý stroke pro outline
    // číslo linky vložíme jako <text> s opačnou rotací (rotate(-bearing)) tak, aby zůstalo rovné
    // ale protože text uvnitř rotovaného wrapperu by se také rotoval, vytvoříme dvě vrstvy:
    // - wrapper s rotací pro SVG trojúhelník
    // - nad ním absolutně pozicovaný text bez rotace
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="${half},2 ${size-2},${size-2} ${half},${size-6} 2,${size-2}"
                 fill="${fillColor}" stroke="#ffffff" stroke-width="1.5" />
      </svg>
    `;
    const textHtml = lineText ? `<div style="position:absolute;left:0;top:60%;width:${size}px;margin-top:-0.6em;text-align:center;font-weight:800;color:#ffffff;font-size:${Math.floor(size/3.4)}px;text-shadow:0 0 2px rgba(0,0,0,0.5);pointer-events:none;">${lineText}</div>` : '';
    const wrapper = `
      <div style="position:relative; width:${size}px; height:${size}px; display:inline-block; transform: rotate(${bearing}deg);">
        ${svg}
        ${textHtml}
      </div>
    `;
    return wrapper;
}

// vytvoří L.divIcon
function createTriangleIcon(bearing=0, size=36, fillColor='#1978c8', lineText='') {
    const html = createTriangleHtml(bearing, size, fillColor, lineText);
    return L.divIcon({
        html,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

// aktualizace ikony u existujícího markeru (přehození na novou divIcon)
function updateMarkerIcon(marker, bearing, lineId, lineName, size=36) {
    const color = colorForLine(lineId, vtype, isInactive);
    const txt = (lineName !== undefined && lineName !== null) ? String(lineName) : '';
    const newIcon = createTriangleIcon(bearing, size, color, txt);
    marker.setIcon(newIcon);
}

// --- Zpracování dat (stejné jako dříve) ---
function handleMessage(msgText) {
    try {
        const obj = JSON.parse(msgText);
        if (Array.isArray(obj)) obj.forEach(processEnvelope);
        else processEnvelope(obj);
    } catch (e) {
        msgText.trim().split(/\r?\n/).forEach(line => {
            if (!line) return;
            try { const o = JSON.parse(line); if (Array.isArray(o)) o.forEach(processEnvelope); else processEnvelope(o); }
            catch(err){ /* ignore */ }
        });
    }
}

function processEnvelope(envelope) {
    if (!envelope) return;
    const rec = envelope.attributes || envelope;
    processRecord(rec);
}

function processRecord(record) {
    if (!record || typeof record.ID === 'undefined') return;
    const id = String(record.ID);
    const isInactive = (record.IsInactive === "true" || record.IsInactive === true);
    //if (isInactive || record.Lat == null || record.Lng == null) {
    //    const m = vehicles.get(id);
    //    if (m) { map.removeLayer(m); vehicles.delete(id); }
    //    return;
    //}
    const lat = Number(record.Lat);
    const lng = Number(record.Lng);
    const bearing = Number(record.Bearing || 0);
    const lineId = record.LineID;
    const lineName = record.LineName;
    const vtype = record.VType;

    const rawFinalStop = record.FinalStopID != null ? String(record.FinalStopID).trim() : '';
    // rawFinalStop očekáváme už jako číslo nebo řetězec číslic, ale normalizujeme stejně
    const m = rawFinalStop.match(/\d+/);
    const lookupKey = m ? m[0] : rawFinalStop;
    const finalStopName = stopsMap.get(lookupKey) || rawFinalStop || '';

    const popup = `Linka: ${record.LineName || lineId || ''}, kurz: ${record.Course}<br>Do: ${finalStopName} <br>Zpoždění: ${record.Delay} min.`;

    if (vehicles.has(id)) {
        const marker = vehicles.get(id);
        marker.setLatLng([lat, lng]);
        updateMarkerIcon(marker, bearing, lineID, lineName);
        if (marker.getPopup()) marker.setPopupContent(popup);
    } else {
        const icon = createTriangleIcon(bearing, 36, colorForLine(lineId, vtype, isInactive), lineName !== undefined ? String(lineName) : '');
        const marker = L.marker([lat, lng], {icon});
        marker.bindPopup(popup);
        marker.addTo(map);
        vehicles.set(id, marker);
    }
}

// --- Filter a WS ---
function sendFilter(wsInstance, lineFilter = null) {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return;
    const where = lineFilter ? `LineID = ${Number(lineFilter)}` : "1=1";
    const filter = {
        filter: {
            where: where,
            outFields: "ID,Lat,Lng,Bearing,LineID,LineName,IsInactive,FinalStopID,VType,Course,Delay"
        }
    };
    wsInstance.send(JSON.stringify(filter));
}

function startWebsocket(lineFilter = null) {
    if (ws) return;
    ws = new WebSocket(STREAM_URL);
    ws.addEventListener('open', () => { sendFilter(ws, lineFilter); });
    ws.addEventListener('message', ev => {
        if (typeof ev.data === 'string') handleMessage(ev.data);
        else {
            const reader = new FileReader();
            reader.onload = () => handleMessage(reader.result);
            reader.readAsText(ev.data);
        }
    });
    ws.addEventListener('close', () => { ws = null; });
    ws.addEventListener('error', () => { /* ignore */ });
}

function stopWebsocket() {
    if (!ws) return;
    try { ws.close(); } catch(e) {}
    ws = null;
}

// --- UI ---
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

startBtn.addEventListener('click', () => {
    if (trackingButton) return;
    trackingButton = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    startWebsocket();
});

stopBtn.addEventListener('click', () => {
    if (!trackingButton) return;
    trackingButton = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stopWebsocket();
    for (const m of vehicles.values()) map.removeLayer(m);
    vehicles.clear();
});

vehicleButton.addEventListener('click', () => {
    if (!trackingButton) {
        trackingButton = true;
        startWebsocket();
        vehiclebutton.style.backgroundColor = 'orange';
    } else {
        trackingButton = false;
        stopWebsocket();
        for (const m of vehicles.values()) map.removeLayer(m);
        vehicles.clear();
        vehiclebutton.style.backgroundColor = 'white';
    }
});