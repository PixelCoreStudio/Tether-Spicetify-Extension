const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dialog = require('dialog');
const https = require('https');

const port = 6969;
let activeClients = [];
let lastSongData = null; // <-- HIER DEFINIERT, um den ReferenceError zu beheben!

const app = express();
app.use(cors());
app.use(express.json());

// ─── Setup paths ─────────────────────────────────────────────────────────────
const physicalDir = process.cwd();
const publicDir = path.join(__dirname, 'public');
const rootDir   = __dirname;

// Serve static assets from 'public' first, then fall back to root
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
}
app.use(express.static(rootDir));

// Helper to determine whether a requested file lives in /public or root
function getFilePath(fileName) {
    const publicPath = path.join(publicDir, fileName);
    if (fs.existsSync(publicPath)) {
        return publicPath;
    }
    return path.join(rootDir, fileName);
}

// ─── Sticky Routes for HTML files ────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(getFilePath('index.html'));
});

app.get('/widget.html', (req, res) => {
    res.sendFile(getFilePath('widget.html'));
});

app.get('/editor.html', (req, res) => {
    res.sendFile(getFilePath('editor.html'));
});

// ─── Main config (output path, format, update rate) ──────────────────────────
const mainConfigPath = path.join(physicalDir, 'config.json'); // Changed to physicalDir
let config = {
    outputPath: path.join(physicalDir, 'output'), // Changed to physicalDir
    format: '{artist} - {title}',
    updateRate: 1000
};
if (fs.existsSync(mainConfigPath)) {
    try { 
        config = { ...config, ...JSON.parse(fs.readFileSync(mainConfigPath, 'utf8')) }; 
    } catch (e) { 
        console.error('Fehler beim Laden der config.json, nutze Defaults.'); 
    }
}

// ─── Overlay config (widget styling) ─────────────────────────────────────────
const overlayConfigPath = path.join(physicalDir, 'overlay_config.json');
let overlayConfig = {
    bgColor: '#000000',
    bgOpacity: '0.75',
    textColor: '#ffffff',
    mutedColor: '#b3b3b3',
    accentColor: '#1db954',
    borderColor: '#282828',
    borderWidth: '0',
    borderStyle: 'solid',
    tlRadius: '12',
    trRadius: '12',
    blRadius: '12',
    brRadius: '12',
    widgetWidth: '400',
    widgetPadding: '15',
    widgetHeight: '120',
    widgetHeightAuto: true,
    widgetRotation: '0',
    coverSize: '70',
    ctlRadius: '6',
    ctrRadius: '6',
    cblRadius: '6',
    cbrRadius: '6',
    coverRotation: '0',
    coverSpin: false,
    showSeparator: true,
    separatorColor: '#282828',
    separatorHeight: '1',
    fontSizeTitle: '16',
    fontSizeArtist: '13',
    fontFamily: 'system-ui',
    animationType: 'fade',
    showCover: true,
    showProgress: true
};
if (fs.existsSync(overlayConfigPath)) {
    try { 
        overlayConfig = { ...overlayConfig, ...JSON.parse(fs.readFileSync(overlayConfigPath, 'utf8')) }; 
    } catch (e) { 
        console.error('Fehler beim Laden der overlay_config.json, nutze Defaults.'); 
    }
}

if (!fs.existsSync(config.outputPath)) {
    fs.mkdirSync(config.outputPath, { recursive: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ms) {
    if (isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function saveMainConfig() {
    fs.writeFileSync(mainConfigPath, JSON.stringify(config, null, 4), 'utf8');
}

function broadcastToAll(data) {
    const msg = JSON.stringify(data);
    activeClients.forEach(client => {
        if (client.readyState === 1) client.send(msg);
    });
}

// ─── Spotify status from Spicetify app ───────────────────────────────────────
app.post('/api/spotify-status', (req, res) => {
    const payload = req.body;
    if (!payload || !payload.item) {
        return res.status(400).json({ success: false, error: 'Ungültige Payload-Daten' });
    }

    let finalImageUrl = payload.item.album?.image || '';
    if (finalImageUrl.startsWith('spotify:image:')) {
        finalImageUrl = `https://i.scdn.co/image/${finalImageUrl.split(':').pop()}`;
    }

    const songData = {
        title: payload.item.name,
        artist: payload.item.artists && payload.item.artists.length > 0
            ? payload.item.artists.join(', ')
            : 'Unbekannter Künstler',
        imageUrl: finalImageUrl,
        isPaused: payload.isPaused,
        position: payload.position || 0,
        duration: payload.item.duration || 0
    };

    lastSongData = songData; // <-- Hier wird der Song-Status auf dem Server zwischengespeichert!

    handleSongChange(songData, payload.event === 'progress');
    broadcastToAll({ type: payload.event, data: songData });
    res.json({ success: true });
});

// ─── Playback control (GET – easy for Stream Deck, MacroDeck etc.) ────────────
app.get('/api/control/:action', (req, res) => {
    const { action } = req.params;
    const validActions = ['play', 'pause', 'toggle', 'next', 'prev', 'volume_up', 'volume_down'];
    if (!validActions.includes(action)) {
        return res.status(400).json({ success: false, error: `Unknown action "${action}". Valid: ${validActions.join(', ')}` });
    }
    broadcastToAll({ type: 'control', action });
    res.json({ success: true, action });
});

// ─── Playback control (POST – with optional value) ────────────────────────────
app.post('/api/control', (req, res) => {
    const { action, value } = req.body;
    broadcastToAll({ type: 'control', action, value });
    res.json({ success: true });
});

// ─── Volume control (0–100) ───────────────────────────────────────────────────
app.post('/api/volume', (req, res) => {
    const { volume } = req.body;
    const vol = Math.max(0, Math.min(100, parseInt(volume)));
    broadcastToAll({ type: 'control', action: 'set_volume', value: vol });
    res.json({ success: true, volume: vol });
});

// ─── Update rate ──────────────────────────────────────────────────────────────
app.post('/api/set-rate', (req, res) => {
    const { rate } = req.body;
    if (rate) {
        config.updateRate = parseInt(rate);
        saveMainConfig();
        broadcastToAll({ type: 'rate_changed', rate: config.updateRate });
        return res.json({ success: true, rate: config.updateRate });
    }
    res.status(400).json({ success: false, error: 'Keine Rate angegeben' });
});

// ─── Overlay config ───────────────────────────────────────────────────────────
app.post('/api/overlay-config', (req, res) => {
    overlayConfig = { ...overlayConfig, ...req.body };
    try {
        fs.writeFileSync(overlayConfigPath, JSON.stringify(overlayConfig, null, 4), 'utf8');
    } catch (e) {
        console.error('Fehler beim Speichern der overlay_config.json:', e);
    }
    broadcastToAll({ type: 'config_update', config: overlayConfig });
    res.json({ success: true, config: overlayConfig });
});

app.get('/api/overlay-config', (req, res) => {
    res.json(overlayConfig);
});

// ─── Folder picker ────────────────────────────────────────────────────────────
app.get('/api/select-folder', (req, res) => {
    dialog.dir('Select an Output folder', __dirname, (err, dirPath) => {
        if (err) return res.status(500).json({ error: 'Selection canceled' });
        config.outputPath = dirPath;
        saveMainConfig();
        res.json({ success: true, path: dirPath });
    });
});

// ─── Config read ──────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
    res.json(config);
});

app.post('/api/settings', (req, res) => {
    const { outputPath, format } = req.body;
    if (outputPath) config.outputPath = outputPath;
    if (format) config.format = format;
    saveMainConfig();
    res.json({ success: true, config });
});

// ─── HTTP server + WebSocket ──────────────────────────────────────────────────
const server = app.listen(port, () => console.log(`Server active on http://localhost:${port}`));
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    activeClients.push(ws);

    // Schicke dem neuen Client die aktuellste Musik/Design-Info falls vorhanden
    if (lastSongData) {
        ws.send(JSON.stringify({ type: 'songchange', data: lastSongData }));
    }
    // Sende die Styling-Konfiguration direkt beim Verbindungsaufbau an das Widget
    if (overlayConfig) {
        ws.send(JSON.stringify({ type: 'config_update', config: overlayConfig }));
    }

    ws.on('message', (message) => {
        try {
            const payload = JSON.parse(message);
            
            // Wenn der Editor eine neue Konfiguration sendet:
            if (payload.type === 'save_config' || payload.type === 'config_update') {
                overlayConfig = { ...overlayConfig, ...(payload.config || payload.data || {}) };

                // Auf Disk schreiben damit neue Widget-Verbindungen die aktuelle Config bekommen
                try {
                    fs.writeFileSync(overlayConfigPath, JSON.stringify(overlayConfig, null, 4), 'utf8');
                } catch (e) {
                    console.error('Fehler beim Speichern der overlay_config.json via WS:', e);
                }

                // An ALLE Clients broadcasten (inkl. Widget)
                activeClients.forEach(client => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({ type: 'config_update', config: overlayConfig }));
                    }
                });
            }
        } catch (e) {
            console.error("Fehler beim Verarbeiten der WS-Nachricht:", e);
        }
    });

    ws.on('close', () => {
        activeClients = activeClients.filter(c => c !== ws);
    });
});

// ─── File output helpers ──────────────────────────────────────────────────────
function handleSongChange(songData, isProgressOnly = false) {
    const { title, artist, imageUrl, position, duration } = songData;

    if (!fs.existsSync(config.outputPath)) {
        try { fs.mkdirSync(config.outputPath, { recursive: true }); } catch (e) { return; }
    }

    const titlePath     = path.join(config.outputPath, 'title.txt');
    const artistPath    = path.join(config.outputPath, 'artist.txt');
    const coverPath     = path.join(config.outputPath, 'cover.png');
    const positionPath  = path.join(config.outputPath, 'time_position.txt');
    const durationPath  = path.join(config.outputPath, 'time_duration.txt');
    const formattedPath = path.join(config.outputPath, 'now_playing.txt');

    fs.writeFile(positionPath, formatTime(position), 'utf8', () => {});
    fs.writeFile(durationPath, formatTime(duration),  'utf8', () => {});

    if (!isProgressOnly) {
        fs.writeFile(titlePath,  title,  'utf8', () => {});
        fs.writeFile(artistPath, artist, 'utf8', () => {});

        const formattedText = config.format
            .replace(/{title}/g,  title  || '')
            .replace(/{artist}/g, artist || '');
        fs.writeFile(formattedPath, formattedText, 'utf8', () => {});

        if (imageUrl) {
            const file = fs.createWriteStream(coverPath);
            const targetUrl = imageUrl.startsWith('spotify:image:')
                ? `https://i.scdn.co/image/${imageUrl.split(':').pop()}`
                : imageUrl;
            https.get(targetUrl, (response) => { response.pipe(file); }).on('error', () => {});
        }
    }
}