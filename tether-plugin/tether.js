(async function() {
        while (!Spicetify.React || !Spicetify.ReactDOM) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        var tether = (() => {
  // src/app.tsx
  var Spicetify = window.Spicetify;
  var SERVER_URL = "http://localhost:6969/api/spotify-status";
  var DASHBOARD_URL = "http://localhost:6969";
  var GITHUB_URL = "https://github.com/PixelCoreStudio/Tether-Spicetify-Extension";
  var progressInterval = null;
  var controlSocket = null;
  var updateRate = 1e3;
  var volumeStep = 10;
  var topbarButton = null;
  var isConnected = false;
  (function init() {
    if (!window.Spicetify || !window.Spicetify.Player || !window.Spicetify.Platform || !window.Spicetify.Topbar) {
      setTimeout(init, 100);
      return;
    }
    main();
  })();
  async function main() {
    console.log("[Tether] Spicetify ready. Loading config from server\u2026");
    createTopbarButton();
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
  function dotIcon(color) {
    return `<p>Tether</p> <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" fill="${color}"/></svg>`;
  }
  function createTopbarButton() {
    topbarButton = new Spicetify.Topbar.Button(
      "Tether: Not Connected",
      dotIcon("#e22134"),
      onTopbarButtonClick
    );
  }
  function onTopbarButtonClick() {
    if (isConnected) {
      const container = document.createElement("div");
      container.style.lineHeight = "1.6";
      const status = document.createElement("div");
      status.innerHTML = "\u2705 Connected";
      status.style.marginBottom = "12px";
      const dashLink = document.createElement("a");
      dashLink.href = DASHBOARD_URL;
      dashLink.target = "_blank";
      dashLink.rel = "noopener noreferrer";
      dashLink.textContent = "To the dashboard.";
      dashLink.style.display = "block";
      dashLink.style.marginBottom = "16px";
      const settingsButton = document.createElement("button");
      settingsButton.textContent = "\u2699 Settings";
      settingsButton.type = "button";
      settingsButton.id = "tether-settings-btn";
      settingsButton.style.background = "rgba(255,255,255,0.1)";
      settingsButton.style.color = "#fff";
      settingsButton.style.border = "none";
      settingsButton.style.borderRadius = "20px";
      settingsButton.style.padding = "8px 16px";
      settingsButton.style.cursor = "pointer";
      settingsButton.style.fontWeight = "bold";
      settingsButton.style.position = "relative";
      settingsButton.style.zIndex = "99999";
      settingsButton.style.pointerEvents = "auto";
      const handleSettingsOpen = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("[Tether] Settings triggered via", e.type);
        Spicetify.PopupModal.hide();
        setTimeout(() => openSettingsPopup(), 50);
      };
      settingsButton.addEventListener("mousedown", handleSettingsOpen);
      settingsButton.addEventListener("click", handleSettingsOpen);
      container.appendChild(status);
      container.appendChild(dashLink);
      container.appendChild(settingsButton);
      Spicetify.PopupModal.display({
        title: "Tether",
        content: container
      });
    } else {
      Spicetify.PopupModal.display({
        title: "Tether: Not Connected",
        content: `
                <div style="line-height:1.6">
                    \u26A0\uFE0F The Tether server under <code>localhost:6969</code> is not reachable.<br>
                    Do you have the server running/installed?<br><br>
                    <a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">
                        To the github if you need help
                    </a>
                </div>
            `
      });
    }
  }
  function openSettingsPopup() {
    const container = document.createElement("div");
    container.style.padding = "8px";
    container.style.color = "#fff";
    container.style.fontFamily = "inherit";
    container.style.minWidth = "400px";
    const volRow = document.createElement("div");
    volRow.style.display = "flex";
    volRow.style.justifyContent = "space-between";
    volRow.style.alignItems = "center";
    volRow.style.padding = "14px 0";
    volRow.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
    const volLabel = document.createElement("div");
    volLabel.innerHTML = `
        <div style="font-size:14px;">Volume-Step (%)</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px;">
            The percentage you want to change the volume when triggering the volume down/up event.
        </div>
    `;
    const volInput = document.createElement("input");
    volInput.type = "number";
    volInput.min = "1";
    volInput.max = "100";
    volInput.value = String(volumeStep);
    volInput.style.width = "70px";
    volInput.style.padding = "6px 10px";
    volInput.style.borderRadius = "6px";
    volInput.style.border = "1px solid rgba(255,255,255,0.2)";
    volInput.style.background = "rgba(255,255,255,0.08)";
    volInput.style.color = "#fff";
    volRow.appendChild(volLabel);
    volRow.appendChild(volInput);
    const rateRow = document.createElement("div");
    rateRow.style.display = "flex";
    rateRow.style.justifyContent = "space-between";
    rateRow.style.alignItems = "center";
    rateRow.style.padding = "14px 0";
    const rateLabel = document.createElement("div");
    rateLabel.innerHTML = `
        <div style="font-size:14px;">Update-Rate (ms)</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px;">
            How often you want to update the time-bar in your overlay higher = smoother
        </div>
    `;
    const rateInput = document.createElement("input");
    rateInput.type = "number";
    rateInput.min = "200";
    rateInput.step = "100";
    rateInput.value = String(updateRate);
    rateInput.style.width = "70px";
    rateInput.style.padding = "6px 10px";
    rateInput.style.borderRadius = "6px";
    rateInput.style.border = "1px solid rgba(255,255,255,0.2)";
    rateInput.style.background = "rgba(255,255,255,0.08)";
    rateInput.style.color = "#fff";
    rateRow.appendChild(rateLabel);
    rateRow.appendChild(rateInput);
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.background = "#1ed760";
    saveButton.style.color = "#000";
    saveButton.style.border = "none";
    saveButton.style.borderRadius = "20px";
    saveButton.style.padding = "10px 24px";
    saveButton.style.fontWeight = "bold";
    saveButton.style.cursor = "pointer";
    saveButton.style.marginTop = "20px";
    saveButton.style.float = "right";
    saveButton.onclick = async () => {
      const newVolumeStep = Number(volInput.value);
      const newUpdateRate = Number(rateInput.value);
      try {
        await fetch("http://localhost:6969/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volumeStep: newVolumeStep })
        });
        await fetch("http://localhost:6969/api/set-rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rate: newUpdateRate })
        });
        volumeStep = newVolumeStep;
        updateRate = newUpdateRate;
        startProgressLoop();
        Spicetify.showNotification("Tether-Einstellungen gespeichert");
        Spicetify.PopupModal.hide();
      } catch (e) {
        Spicetify.showNotification("Speichern fehlgeschlagen. Ist der Server aktiv?", true);
      }
    };
    container.appendChild(volRow);
    container.appendChild(rateRow);
    container.appendChild(saveButton);
    Spicetify.PopupModal.display({
      title: "Tether Settings",
      content: container,
      isLarge: true
    });
  }
  function setConnected(connected) {
    if (isConnected === connected)
      return;
    isConnected = connected;
    if (!topbarButton)
      return;
    topbarButton.icon = dotIcon(connected ? "#1ed760" : "#e22134");
    topbarButton.label = connected ? "Tether: Connected" : "Tether: Not connected";
  }
  async function fetchUpdateRate() {
    try {
      const res = await fetch("http://localhost:6969/api/config");
      const config = await res.json();
      if (config.updateRate) {
        updateRate = config.updateRate;
        console.log(`[Tether] Update interval set to ${updateRate}ms`);
      }
      if (config.volumeStep) {
        volumeStep = config.volumeStep;
        console.log(`[Tether] Volume step set to ${volumeStep}%`);
      }
      setConnected(true);
    } catch (e) {
      console.error("[Tether] Could not load config, using defaults.");
      setConnected(false);
    }
  }
  function connectControlSocket() {
    try {
      controlSocket = new WebSocket("ws://localhost:6969/ws");
      controlSocket.onopen = () => {
        console.log("[Tether] Control WebSocket connected");
        setConnected(true);
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
          if (msg.type === "config_update_main" && msg.volumeStep !== void 0) {
            volumeStep = msg.volumeStep;
            console.log(`[Tether] Volume step updated to ${volumeStep}%`);
          }
        } catch (e) {
        }
      };
      controlSocket.onclose = () => {
        console.log("[Tether] Control WebSocket closed, reconnecting in 3s\u2026");
        setConnected(false);
        setTimeout(connectControlSocket, 3e3);
      };
      controlSocket.onerror = () => {
        controlSocket == null ? void 0 : controlSocket.close();
      };
    } catch (e) {
      console.error("[Tether] WebSocket error:", e);
      setConnected(false);
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
        Spicetify.Player.setVolume(Math.min(1, current + volumeStep / 100));
        break;
      }
      case "volume_down": {
        const current = Spicetify.Player.getVolume();
        Spicetify.Player.setVolume(Math.max(0, current - volumeStep / 100));
        break;
      }
      case "volume_delta": {
        const delta = typeof value === "number" ? value / 100 : 0;
        const current = Spicetify.Player.getVolume();
        Spicetify.Player.setVolume(Math.max(0, Math.min(1, current + delta)));
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
      setConnected(true);
    } catch (error) {
      console.error("[Tether] Failed to send to server:", error);
      setConnected(false);
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
