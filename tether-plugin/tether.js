(async function() {
        while (!Spicetify.React || !Spicetify.ReactDOM) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        var tether = (() => {
  // src/app.tsx
  var Spicetify = window.Spicetify;
  var SERVER_URL = "http://localhost:6969/api/spotify-status";
  var progressInterval = null;
  var controlSocket = null;
  var updateRate = 1e3;
  (function init() {
    if (!window.Spicetify || !window.Spicetify.Player || !window.Spicetify.Platform) {
      setTimeout(init, 100);
      return;
    }
    main();
  })();
  async function main() {
    console.log("[Tether] Spicetify ready. Loading config from server\u2026");
    await fetchUpdateRate();
    Spicetify.Player.addEventListener("songchange", (event) => {
      sendFullUpdate("songchange", event == null ? void 0 : event.data);
      startProgressLoop();
    });
    Spicetify.Player.addEventListener("onplaypause", (event) => {
      sendFullUpdate("playpause", event == null ? void 0 : event.data);
      startProgressLoop();
    });
    connectControlSocket();
    startProgressLoop();
  }
  async function fetchUpdateRate() {
    try {
      const res = await fetch("http://localhost:6969/api/config");
      const config = await res.json();
      if (config.updateRate) {
        updateRate = config.updateRate;
        console.log(`[Tether] Update interval set to ${updateRate}ms`);
      }
    } catch (e) {
      console.error("[Tether] Could not load config, using 1000ms default.");
    }
  }
  function connectControlSocket() {
    try {
      controlSocket = new WebSocket("ws://localhost:6969/ws");
      controlSocket.onopen = () => {
        console.log("[Tether] Control WebSocket connected");
      };
      controlSocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "control") {
            handleControlAction(msg.action, msg.value);
          }
          if (msg.type === "rate_changed") {
            updateRate = msg.rate;
            startProgressLoop();
          }
        } catch (e) {
        }
      };
      controlSocket.onclose = () => {
        console.log("[Tether] Control WebSocket closed, reconnecting in 3s\u2026");
        setTimeout(connectControlSocket, 3e3);
      };
      controlSocket.onerror = () => {
        controlSocket == null ? void 0 : controlSocket.close();
      };
    } catch (e) {
      console.error("[Tether] WebSocket error:", e);
      setTimeout(connectControlSocket, 3e3);
    }
  }
  function handleControlAction(action, value) {
    switch (action) {
      case "play":
        Spicetify.Player.play();
        break;
      case "pause":
        Spicetify.Player.pause();
        break;
      case "toggle":
        Spicetify.Player.togglePlay();
        break;
      case "next":
        Spicetify.Player.next();
        break;
      case "prev":
        Spicetify.Player.back();
        break;
      case "heart":
        Spicetify.Player.toggleHeart();
        break;
      case "mute":
        Spicetify.Player.toggleMute();
        break;
      case "shuffle":
        Spicetify.Player.toggleShuffle();
        break;
      case "repeat":
        Spicetify.Player.toggleRepeat();
        break;
      case "skip-prev":
        Spicetify.Player.skipBack();
        break;
      case "skip-next":
        Spicetify.Player.skipForward();
        break;
      case "volume_up": {
        const current = Spicetify.Player.getVolume();
        Spicetify.Player.setVolume(Math.min(1, current + 0.1));
        break;
      }
      case "volume_down": {
        const current = Spicetify.Player.getVolume();
        Spicetify.Player.setVolume(Math.max(0, current - 0.1));
        break;
      }
      case "set_volume": {
        const vol = typeof value === "number" ? Math.max(0, Math.min(100, value)) / 100 : 0.5;
        Spicetify.Player.setVolume(vol);
        break;
      }
      default:
        console.warn("[Tether] Unknown control action:", action);
    }
  }
  function startProgressLoop() {
    clearInterval(progressInterval);
    if (!Spicetify.Player.isPlaying())
      return;
    progressInterval = setInterval(() => {
      if (!Spicetify.Player.isPlaying()) {
        clearInterval(progressInterval);
        return;
      }
      sendProgressUpdate();
    }, updateRate);
  }
  async function sendFullUpdate(eventType, data) {
    var _a, _b, _c, _d, _e, _f, _g;
    const item = (data == null ? void 0 : data.item) || ((_a = Spicetify.Player.data) == null ? void 0 : _a.item);
    if (!item)
      return;
    const payload = {
      event: eventType,
      timestamp: Date.now(),
      isPaused: !Spicetify.Player.isPlaying(),
      position: Spicetify.Player.getProgress(),
      item: {
        name: item.name,
        duration: ((_b = item.duration) == null ? void 0 : _b.milliseconds) || item.duration_ms,
        artists: ((_c = item.artists) == null ? void 0 : _c.map((a) => a.name)) || [],
        album: {
          image: ((_f = (_e = (_d = item.album) == null ? void 0 : _d.images) == null ? void 0 : _e[0]) == null ? void 0 : _f.url) || ((_g = item.metadata) == null ? void 0 : _g.image_url)
        }
      }
    };
    postToServer(payload);
  }
  async function sendProgressUpdate() {
    var _a, _b, _c, _d;
    const item = (_a = Spicetify.Player.data) == null ? void 0 : _a.item;
    if (!item)
      return;
    const payload = {
      event: "progress",
      isPaused: false,
      position: Spicetify.Player.getProgress(),
      item: {
        name: item.name,
        duration: ((_b = item.duration) == null ? void 0 : _b.milliseconds) || item.duration_ms,
        artists: ((_c = item.artists) == null ? void 0 : _c.map((a) => a.name)) || [],
        album: {
          image: (_d = item.metadata) == null ? void 0 : _d.image_url
        }
      }
    };
    postToServer(payload);
  }
  async function postToServer(payload) {
    try {
      await fetch(SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("[Tether] Failed to send to server:", error);
    }
  }
  function App() {
    return null;
  }

  // ../../../../../AppData/Local/Temp/spicetify-creator/index.jsx
  (async () => {
    await App();
  })();
})();

      })();
