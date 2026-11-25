(() => {
  const oldBox = document.getElementById('gg-all-in-one');
  if (oldBox) oldBox.remove();

  if (window._ggPanicListener) {
    document.removeEventListener('keydown', window._ggPanicListener, true);
  }

  const COLORS = [
    { name: 'Yellow', hex: '#facc15', text: '#0f172a' },
    { name: 'Pink', hex: '#ff2e93', text: '#ffffff' },
    { name: 'Cyan', hex: '#22d3ee', text: '#0f172a' }
  ];

  const state = {
    colorIdx: 0,
    overlayMode: 'exact', // 'exact' or radius in km ('5', '20', '75', '250')
    overlayVisible: true,
    panicHidden: false,
    autoGuess: false,
    currentTarget: null, // { lat, lng, offsetAngle, offsetFactor }
    lastCoordKey: '',
    lastAutoGuessedKey: '',
    capturedGoogleMap: null,
    capturedLeafletMap: null,
    mapOverlays: []
  };

  // --- Floating Control Panel ---
  const box = document.createElement('div');
  box.id = 'gg-all-in-one';
  Object.assign(box.style, {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    zIndex: '999999',
    background: 'rgba(15, 23, 42, 0.94)',
    color: '#f8fafc',
    padding: '12px 14px',
    borderRadius: '10px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    lineHeight: '1.45',
    boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,255,255,0.18)',
    width: '295px'
  });

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong style="font-size:13px;">GeoGuessr Helper <span style="color:#94a3b8;font-weight:400;font-size:11px;">[H]</span></strong>
      <div style="display:flex;gap:5px;">
        <button id="gg-color-btn" style="background:#facc15;border:none;color:#0f172a;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:11px;font-weight:700;">Yellow</button>
        <button id="gg-vis-btn" style="background:#16a34a;border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;font-weight:700;">ON</button>
        <button id="gg-hide-btn" title="Peida kõik (kiirklahv: H)" style="background:#334155;border:none;color:#cbd5e1;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:11px;font-weight:700;">×</button>
      </div>
    </div>

    <div style="background:rgba(0,0,0,0.35);border-radius:6px;padding:7px 9px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span id="gg-coords-text" style="font-family:monospace;font-size:12px;color:#38bdf8;">Waiting for round...</span>
        <button id="gg-copy-btn" style="background:#334155;border:none;color:#f8fafc;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:11px;">Copy</button>
      </div>
      <div id="gg-region-text" style="color:#cbd5e1;font-size:11px;">Move 1 step if mid-round</div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px;">
      <label for="gg-mode-select" style="color:#94a3b8;font-size:12px;">Map Overlay:</label>
      <select id="gg-mode-select" style="background:#1e293b;color:#f8fafc;border:1px solid rgba(255,255,255,0.22);border-radius:4px;padding:3px 6px;font-size:12px;">
        <option value="exact" selected>Exact Pin</option>
        <option value="5">Zone: 5 km (Tight)</option>
        <option value="20">Zone: 20 km (Area)</option>
        <option value="75">Zone: 75 km (Region)</option>
        <option value="250">Zone: 250 km (Broad)</option>
      </select>
    </div>

    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
      <button id="gg-center-btn" style="flex:1;background:#2563eb;border:none;color:#fff;border-radius:5px;padding:5px 8px;cursor:pointer;font-size:12px;font-weight:600;">Center Map</button>
      <a id="gg-gmaps-link" href="https://www.google.com/maps" target="_blank" rel="noopener" style="background:#1e293b;color:#38bdf8;text-decoration:none;border:1px solid rgba(56,189,248,0.35);border-radius:5px;padding:4px 8px;font-size:11px;">GMaps</a>
      <a id="gg-osm-link" href="https://www.openstreetmap.org" target="_blank" rel="noopener" style="background:#1e293b;color:#38bdf8;text-decoration:none;border:1px solid rgba(56,189,248,0.35);border-radius:5px;padding:4px 8px;font-size:11px;">OSM</a>
    </div>

    <div style="display:flex;gap:6px;align-items:center;">
      <button id="gg-guess-exact-btn" style="flex:1;background:#16a34a;border:none;color:#fff;border-radius:5px;padding:6px 8px;cursor:pointer;font-size:12px;font-weight:700;">Guess Exact [G]</button>
      <button id="gg-auto-btn" style="background:#334155;border:1px solid rgba(255,255,255,0.2);color:#cbd5e1;border-radius:5px;padding:6px 9px;cursor:pointer;font-size:11px;font-weight:600;">Auto: OFF</button>
    </div>
  `;
  document.body.appendChild(box);

  const colorBtn = document.getElementById('gg-color-btn');
  const visBtn = document.getElementById('gg-vis-btn');
  const hideBtn = document.getElementById('gg-hide-btn');
  const coordsText = document.getElementById('gg-coords-text');
  const copyBtn = document.getElementById('gg-copy-btn');
  const regionText = document.getElementById('gg-region-text');
  const modeSelect = document.getElementById('gg-mode-select');
  const centerBtn = document.getElementById('gg-center-btn');
  const gmapsLink = document.getElementById('gg-gmaps-link');
  const osmLink = document.getElementById('gg-osm-link');
  const guessExactBtn = document.getElementById('gg-guess-exact-btn');
  const autoBtn = document.getElementById('gg-auto-btn');

  // --- Panic Hide / Show Toggle & Keyboard Shortcuts ---
  function togglePanicHide(forceState) {
    state.panicHidden = typeof forceState === 'boolean' ? forceState : !state.panicHidden;
    box.style.display = state.panicHidden ? 'none' : 'block';
    renderOverlay();
  }

  window._ggPanicListener = (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'h' || e.key === 'H' || e.key === 'Insert') {
      e.preventDefault();
      e.stopPropagation();
      togglePanicHide();
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      e.stopPropagation();
      if (state.currentTarget) {
        executeExactGuess(state.currentTarget.lat, state.currentTarget.lng);
      }
    }
  };
  document.addEventListener('keydown', window._ggPanicListener, true);

  hideBtn.addEventListener('click', () => togglePanicHide(true));

  // --- UI Event Listeners ---
  colorBtn.addEventListener('click', () => {
    state.colorIdx = (state.colorIdx + 1) % COLORS.length;
    const c = COLORS[state.colorIdx];
    colorBtn.textContent = c.name;
    colorBtn.style.background = c.hex;
    colorBtn.style.color = c.text;
    renderOverlay();
  });

  visBtn.addEventListener('click', () => {
    state.overlayVisible = !state.overlayVisible;
    visBtn.textContent = state.overlayVisible ? 'ON' : 'OFF';
    visBtn.style.background = state.overlayVisible ? '#16a34a' : '#64748b';
    renderOverlay();
  });

  modeSelect.addEventListener('change', (e) => {
    state.overlayMode = e.target.value;
    renderOverlay();
  });

  copyBtn.addEventListener('click', async () => {
    if (!state.currentTarget) return;
    const str = `${state.currentTarget.lat.toFixed(6)}, ${state.currentTarget.lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(str);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
    } catch {}
  });

  autoBtn.addEventListener('click', () => {
    state.autoGuess = !state.autoGuess;
    autoBtn.textContent = state.autoGuess ? 'Auto: ON' : 'Auto: OFF';
    autoBtn.style.background = state.autoGuess ? '#b45309' : '#334155';
    autoBtn.style.color = state.autoGuess ? '#fff' : '#cbd5e1';
  });

  guessExactBtn.addEventListener('click', () => {
    if (state.currentTarget) {
      executeExactGuess(state.currentTarget.lat, state.currentTarget.lng);
    }
  });

  centerBtn.addEventListener('click', () => {
    wakeAndScanMaps();
    if (!state.currentTarget) return;

    if (state.overlayMode === 'exact') {
      const { lat, lng } = state.currentTarget;
      if (state.capturedGoogleMap) {
        state.capturedGoogleMap.setCenter({ lat, lng });
        state.capturedGoogleMap.setZoom(15);
      } else if (state.capturedLeafletMap) {
        state.capturedLeafletMap.setView([lat, lng], 15);
      }
      return;
    }

    const radiusMeters = (parseFloat(state.overlayMode) || 20) * 1000;
    const center = getOffsetCenter(state.currentTarget, radiusMeters);
    const dLat = (radiusMeters * 1.8) / 111320;
    const cosLat = Math.max(0.1, Math.abs(Math.cos((center.lat * Math.PI) / 180)));
    const dLng = (radiusMeters * 1.8) / (111320 * cosLat);

    if (state.capturedGoogleMap && window.google?.maps?.LatLngBounds) {
      const bounds = new window.google.maps.LatLngBounds(
        { lat: center.lat - dLat, lng: center.lng - dLng },
        { lat: center.lat + dLat, lng: center.lng + dLng }
      );
      state.capturedGoogleMap.fitBounds(bounds);
    } else if (state.capturedLeafletMap) {
      state.capturedLeafletMap.fitBounds([
        [center.lat - dLat, center.lng - dLng],
        [center.lat + dLat, center.lng + dLng]
      ]);
    }
  });

  // --- Coordinate Parsing ---
  function isValidCoord(lat, lng) {
    return (
      !Number.isNaN(lat) &&
      !Number.isNaN(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180 &&
      !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)
    );
  }

  function extractCoords(str) {
    if (!str || typeof str !== 'string') return null;

    let match = str.match(/\[\s*null\s*,\s*null\s*,\s*(-?\d+\.\d{3,})\s*,\s*(-?\d+\.\d{3,})\s*\]/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValidCoord(lat, lng)) return { lat, lng };
    }

    match = str.match(/[?&](?:location|cbll|viewpoint|ll|q)=(-?\d+\.\d{3,})(?:,|%2C)\s*(-?\d+\.\d{3,})/i);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValidCoord(lat, lng)) return { lat, lng };
    }

    match = str.match(/!3d(-?\d+\.\d{3,})!4d(-?\d+\.\d{3,})/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValidCoord(lat, lng)) return { lat, lng };
    }

    return null;
  }

  function extractFromGameJson(text) {
    try {
      const data = JSON.parse(text);
      if (data && Array.isArray(data.rounds) && data.rounds.length > 0) {
        const idx = typeof data.round === 'number' && data.round > 0
          ? Math.min(data.round - 1, data.rounds.length - 1)
          : data.rounds.length - 1;
        const r = data.rounds[idx];
        if (r && isValidCoord(r.lat, r.lng)) return { lat: r.lat, lng: r.lng };
      }
    } catch {}
    return null;
  }

  function getOffsetCenter(target, radiusMeters) {
    const distMeters = radiusMeters * target.offsetFactor;
    const dLat = (distMeters * Math.cos(target.offsetAngle)) / 111320;
    const cosLat = Math.max(0.1, Math.abs(Math.cos((target.lat * Math.PI) / 180)));
    const dLng = (distMeters * Math.sin(target.offsetAngle)) / (111320 * cosLat);
    return {
      lat: target.lat + dLat,
      lng: target.lng + dLng
    };
  }

  // --- Map Discovery & Exact Guess Execution ---
  function isGoogleMapObj(obj) {
    return (
      obj &&
      window.google?.maps?.Map &&
      obj instanceof window.google.maps.Map &&
      !(window.google.maps.StreetViewPanorama && obj instanceof window.google.maps.StreetViewPanorama)
    );
  }

  function wakeAndScanMaps() {
    document.querySelectorAll('[data-qa="guess-map"], [class*="guess-map"], [class*="GuessMap"], .leaflet-container, .gm-style').forEach(el => {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    });

    if (state.capturedGoogleMap && state.capturedGoogleMap.getDiv?.()?.isConnected) return;

    const candidates = document.querySelectorAll(
      '[data-qa="guess-map"], [class*="guess-map"], [class*="GuessMap"], .gm-style'
    );

    for (const startEl of candidates) {
      let el = startEl;
      for (let depth = 0; depth < 7 && el; depth++, el = el.parentElement) {
        const fiberKey = Object.keys(el).find(
          k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
        );
        if (!fiberKey) continue;

        let fiber = el[fiberKey];
        for (let step = 0; step < 18 && fiber; step++, fiber = fiber.return) {
          const sources = [fiber.stateNode, fiber.memoizedProps, fiber.memoizedState];
          for (const src of sources) {
            if (!src || typeof src !== 'object') continue;
            if (isGoogleMapObj(src)) {
              state.capturedGoogleMap = src;
              return;
            }
            for (const val of Object.values(src)) {
              if (isGoogleMapObj(val)) {
                state.capturedGoogleMap = val;
                return;
              }
            }
          }
        }
      }
    }
  }

  function simulateCenterClick(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    ['pointerenter', 'mouseenter', 'mouseover', 'mousemove', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
      el.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: cx,
          clientY: cy,
          button: 0
        })
      );
    });
  }

  function clickGuessButton() {
    const ggBtn = document.querySelector('[data-qa="perform-guess"]');
    if (ggBtn && !ggBtn.disabled) {
      ggBtn.click();
      return true;
    }

    const buttons = Array.from(document.querySelectorAll('button'));
    const matchBtn = buttons.find(btn => {
      if (box.contains(btn) || btn.disabled) return false;
      const txt = (btn.textContent || '').trim().toLowerCase();
      return txt === 'guess' || txt === 'arva' || btn.id.toLowerCase().includes('guess');
    });

    if (matchBtn) {
      matchBtn.click();
      return true;
    }
    return false;
  }

  async function executeExactGuess(lat, lng) {
    installMapHooks();
    wakeAndScanMaps();
    guessExactBtn.textContent = 'Placing...';

    await new Promise(r => setTimeout(r, 200));

    if (state.capturedGoogleMap && window.google?.maps?.LatLng) {
      const target = new window.google.maps.LatLng(lat, lng);
      state.capturedGoogleMap.setCenter(target);
      state.capturedGoogleMap.setZoom(16);
      await new Promise(r => setTimeout(r, 220));
      window.google.maps.event.trigger(state.capturedGoogleMap, 'click', { latLng: target });
      simulateCenterClick(state.capturedGoogleMap.getDiv());
    }

    if (state.capturedLeafletMap && window.L?.latLng) {
      state.capturedLeafletMap.setView([lat, lng], 16, { animate: false });
      await new Promise(r => setTimeout(r, 220));
      state.capturedLeafletMap.fire('click', {
        latlng: window.L.latLng(lat, lng),
        layerPoint: state.capturedLeafletMap.latLngToLayerPoint([lat, lng]),
        containerPoint: state.capturedLeafletMap.latLngToContainerPoint([lat, lng])
      });
      simulateCenterClick(state.capturedLeafletMap.getContainer());
    }

    await new Promise(r => setTimeout(r, 320));
    const submitted = clickGuessButton();
    guessExactBtn.textContent = submitted ? 'Guessed!' : 'Pin Placed';
    setTimeout(() => {
      guessExactBtn.textContent = 'Guess Exact [G]';
    }, 1200);
  }

  // --- Map Overlay Rendering ---
  function clearOverlays() {
    for (const item of state.mapOverlays) {
      try {
        if (typeof item.setMap === 'function') item.setMap(null);
        else if (typeof item.remove === 'function') item.remove();
      } catch {}
    }
    state.mapOverlays = [];
  }

  function renderOverlay() {
    clearOverlays();
    if (state.panicHidden || !state.overlayVisible || !state.currentTarget) return;

    wakeAndScanMaps();
    const color = COLORS[state.colorIdx].hex;
    const { lat, lng } = state.currentTarget;

    if (state.overlayMode === 'exact') {
      if (state.capturedGoogleMap && window.google?.maps) {
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: state.capturedGoogleMap,
          clickable: false,
          zIndex: 9999,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#0f172a',
            strokeWeight: 2.5
          }
        });
        state.mapOverlays.push(marker);
      }

      if (state.capturedLeafletMap && window.L?.circleMarker) {
        const marker = window.L.circleMarker([lat, lng], {
          radius: 9,
          color: '#0f172a',
          weight: 2.5,
          fillColor: color,
          fillOpacity: 1,
          interactive: false
        }).addTo(state.capturedLeafletMap);
        state.mapOverlays.push(marker);
      }
      return;
    }

    const radiusMeters = (parseFloat(state.overlayMode) || 20) * 1000;
    const center = getOffsetCenter(state.currentTarget, radiusMeters);

    if (state.capturedGoogleMap && window.google?.maps?.Circle) {
      const inner = new window.google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 1.0,
        strokeWeight: 4,
        fillColor: color,
        fillOpacity: 0.24,
        clickable: false,
        zIndex: 9999,
        map: state.capturedGoogleMap,
        center,
        radius: radiusMeters
      });
      const outer = new window.google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.04,
        clickable: false,
        zIndex: 9998,
        map: state.capturedGoogleMap,
        center,
        radius: radiusMeters * 4
      });
      state.mapOverlays.push(inner, outer);
    }

    if (state.capturedLeafletMap && window.L?.circle) {
      const inner = window.L.circle([center.lat, center.lng], {
        color,
        opacity: 1.0,
        weight: 4,
        fillColor: color,
        fillOpacity: 0.24,
        interactive: false,
        radius: radiusMeters
      }).addTo(state.capturedLeafletMap);

      const outer = window.L.circle([center.lat, center.lng], {
        color,
        opacity: 0.7,
        weight: 2,
        dashArray: '6, 6',
        fillColor: color,
        fillOpacity: 0.04,
        interactive: false,
        radius: radiusMeters * 4
      }).addTo(state.capturedLeafletMap);
      state.mapOverlays.push(inner, outer);
    }
  }

  function installMapHooks() {
    if (window.google?.maps?.event?.trigger && !window.google.maps.event.trigger._ggAllHooked) {
      const origTrigger = window.google.maps.event.trigger;
      window.google.maps.event.trigger = function (instance, ...rest) {
        if (isGoogleMapObj(instance) && state.capturedGoogleMap !== instance) {
          state.capturedGoogleMap = instance;
          renderOverlay();
        }
        return origTrigger.apply(this, [instance, ...rest]);
      };
      window.google.maps.event.trigger._ggAllHooked = true;
    }

    if (window.google?.maps?.Map?.prototype && !window.google.maps.Map.prototype._ggAllHooked) {
      ['setCenter', 'setZoom', 'setOptions'].forEach(method => {
        const orig = window.google.maps.Map.prototype[method];
        if (typeof orig === 'function') {
          window.google.maps.Map.prototype[method] = function (...args) {
            if (isGoogleMapObj(this) && state.capturedGoogleMap !== this) {
              state.capturedGoogleMap = this;
              setTimeout(renderOverlay, 50);
            }
            return orig.apply(this, args);
          };
        }
      });
      window.google.maps.Map.prototype._ggAllHooked = true;
    }

    if (window.L?.Evented?.prototype?.fire && !window.L.Evented.prototype.fire._ggAllHooked) {
      const origFire = window.L.Evented.prototype.fire;
      window.L.Evented.prototype.fire = function (...args) {
        if (window.L?.Map && this instanceof window.L.Map && state.capturedLeafletMap !== this) {
          state.capturedLeafletMap = this;
          renderOverlay();
        }
        return origFire.apply(this, args);
      };
      window.L.Evented.prototype.fire._ggAllHooked = true;
    }
  }

  // --- Update Handler ---
  async function handleNewCoords(lat, lng) {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (key === state.lastCoordKey) return;
    state.lastCoordKey = key;

    state.currentTarget = {
      lat,
      lng,
      offsetAngle: Math.random() * Math.PI * 2,
      offsetFactor: 0.2 + Math.random() * 0.5
    };

    const exactLat = lat.toFixed(5);
    const exactLng = lng.toFixed(5);

    coordsText.textContent = `${exactLat}, ${exactLng}`;
    gmapsLink.href = `https://www.google.com/maps?q=${exactLat},${exactLng}`;
    osmLink.href = `https://www.openstreetmap.org/?mlat=${exactLat}&mlon=${exactLng}#map=15/${exactLat}/${exactLng}`;
    regionText.textContent = 'Looking up location...';

    installMapHooks();
    renderOverlay();

    if (state.autoGuess && state.lastAutoGuessedKey !== key) {
      state.lastAutoGuessedKey = key;
      setTimeout(() => {
        if (state.autoGuess && state.currentTarget) {
          executeExactGuess(state.currentTarget.lat, state.currentTarget.lng);
        }
      }, 1500);
    }

    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${exactLat}&longitude=${exactLng}&localityLanguage=en`
      );
      const data = await res.json();
      const parts = [data.city || data.locality, data.principalSubdivision, data.countryName].filter(Boolean);
      regionText.textContent = parts.length ? parts.join(', ') : 'Unknown region (ocean/remote)';
    } catch {
      regionText.textContent = 'Location lookup unavailable';
    }
  }

  // --- Network & DOM Listeners ---
  function isRelevantUrl(url) {
    return typeof url === 'string' && (
      url.includes('GetMetadata') ||
      url.includes('GeoPhotoService') ||
      url.includes('SingleImageSearch') ||
      url.includes('mapsjs') ||
      url.includes('/api/v3/games/') ||
      url.includes('/api/v4/')
    );
  }

  function processResponseText(url, text) {
    if (!text) return;
    const coords = extractCoords(text) || (url.includes('/api/') ? extractFromGameJson(text) : null);
    if (coords) handleNewCoords(coords.lat, coords.lng);
  }

  function scanIframes() {
    for (const iframe of document.querySelectorAll('iframe')) {
      if (box.contains(iframe)) continue;
      const coords = extractCoords(iframe.src);
      if (coords) {
        handleNewCoords(coords.lat, coords.lng);
        return;
      }
    }
  }

  const observer = new MutationObserver(() => {
    installMapHooks();
    scanIframes();
    if (state.currentTarget && state.overlayVisible && !state.panicHidden && state.mapOverlays.length === 0) {
      renderOverlay();
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._ggUrl = typeof url === 'string' ? url : '';
    return origOpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (isRelevantUrl(this._ggUrl)) {
      this.addEventListener('load', function () {
        try { processResponseText(this._ggUrl, this.responseText); } catch {}
      });
    }
    return origSend.apply(this, args);
  };

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (isRelevantUrl(url)) {
        response.clone().text().then(txt => processResponseText(url, txt)).catch(() => {});
      }
    } catch {}
    return response;
  };

  function hookScript(node) {
    if (node && node.tagName === 'SCRIPT' && isRelevantUrl(node.src)) {
      const cbMatch = node.src.match(/[?&]callback=([^&]+)/);
      if (cbMatch) {
        const cbPath = decodeURIComponent(cbMatch[1]).split('.');
        let parent = window;
        for (let i = 0; i < cbPath.length - 1; i++) parent = parent?.[cbPath[i]];
        const fnName = cbPath[cbPath.length - 1];
        const origCb = parent?.[fnName];
        if (typeof origCb === 'function' && !origCb._ggAllHooked) {
          const wrapped = function (data, ...rest) {
            try {
              const coords = extractCoords(JSON.stringify(data));
              if (coords) handleNewCoords(coords.lat, coords.lng);
            } catch {}
            return origCb.apply(this, [data, ...rest]);
          };
          wrapped._ggAllHooked = true;
          parent[fnName] = wrapped;
        }
      }
    }
  }

  const origAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function (node) {
    hookScript(node);
    return origAppendChild.apply(this, arguments);
  };

  const origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, ref) {
    hookScript(node);
    return origInsertBefore.apply(this, arguments);
  };

  installMapHooks();
  wakeAndScanMaps();
  scanIframes();
})();