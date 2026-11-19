
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';

// Initialise only on pages containing the map
const mapContainer = document.getElementById('community-map');

if (mapContainer) {

  // Configuration
  const EXPLODE_ZOOM = 7;
  const ANIMATION_DURATION = 1000;
  const MARKER_STAGGER = 100;

  // Read Data Steward data
  const dataElement = document.getElementById('datastewards-data');
  const locations = dataElement ? JSON.parse(dataElement.textContent) : [];

  // Group records with identical coordinates
  const groupedLocations = new Map();

  locations.forEach(location => {

    const longitude = Number(location.longitude);
    const latitude = Number(location.latitude);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return;
    }

    const key = `${longitude},${latitude}`;

    if (!groupedLocations.has(key)) {
      groupedLocations.set(key, {
        longitude,
        latitude,
        members: []
      });
    }

    groupedLocations.get(key).members.push({
      name: location['job-profile'] || 'Data Steward',
      institution: location.institution || '',
      city: location.city || ''
    });

  });

  // Create map
  const map = new maplibregl.Map({
    container: mapContainer,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [10.45, 51.16],
    zoom: 4.8,
    minZoom: 4,
    maxZoom: 12
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  // Keep information popups above all markers
  const popupStyles = document.createElement('style');

  popupStyles.textContent = `
    .maplibregl-popup.datasteward-popup {
      z-index: 99999 !important;
    }

    .datasteward-popup .maplibregl-popup-content {
      position: relative;
      z-index: 99999 !important;
      background: #ffffff;
      color: #222222;
      padding: 12px 16px;
      border-radius: 7px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.25);
      max-width: 280px;
    }
  `;

  document.head.appendChild(popupStyles);

  // SVG overlay for spider legs
  mapContainer.style.position = 'relative';

  const svgNS = 'http://www.w3.org/2000/svg';
  const lineOverlay = document.createElementNS(svgNS, 'svg');

  lineOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 1;
  `;

  mapContainer.appendChild(lineOverlay);

  const groupStates = [];

  // Create popup for an individual Data Steward
  function createPopup(member) {

    const content = document.createElement('div');

    const name = document.createElement('strong');
    name.textContent = member.name;

    const institution = document.createElement('div');
    institution.textContent = member.institution;

    const city = document.createElement('div');
    city.textContent = member.city;

    content.append(name, institution, city);

    const popup = new maplibregl.Popup({
      offset: 25,
      className: 'datasteward-popup'
    }).setDOMContent(content);

    // Explicitly bring the popup to the front when opened
    popup.on('open', () => {

      const element = popup.getElement();

      if (element) {
        element.style.zIndex = '99999';
      }

    });

    return popup;
  }

  // Smooth animation easing
  function easeOutBack(t) {

    const c1 = 1.35;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // Calculate spiderfy positions
  function getTargetPositions(group) {

    const count = group.members.length;

    const positions = [];

    // Small groups: circular arrangement
    if (count <= 8) {

      const radius = Math.max(65, count * 17);

      for (let i = 0; i < count; i++) {

        const angle =
          (i / count) * Math.PI * 2 - Math.PI / 2;

        positions.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });

      }

    } else {

      // Larger groups: spiral arrangement
      const angleStep = 0.72;
      const startRadius = 30;
      const radiusStep = 9;

      for (let i = 0; i < count; i++) {

        const angle = i * angleStep - Math.PI / 2;
        const radius = startRadius + i * radiusStep;

        positions.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });

      }

    }

    return positions;
  }

  // Update marker and spider-leg positions
  function updateGroupPositions(state) {

    if (!state.expanded || !state.individualMarkers.length) {
      return;
    }

    const center = map.project([
      state.group.longitude,
      state.group.latitude
    ]);

    const targets = getTargetPositions(state.group);

    state.individualMarkers.forEach((marker, index) => {

      const target = targets[index];
      const progress = state.progress[index];

      const x = center.x + target.x * progress;
      const y = center.y + target.y * progress;

      marker.setLngLat(map.unproject([x, y]));

      const line = state.lines[index];

      line.setAttribute('x1', center.x);
      line.setAttribute('y1', center.y);
      line.setAttribute('x2', x);
      line.setAttribute('y2', y);

      line.style.opacity = Math.min(progress * 1.5, 0.85);

    });

  }

  // Animate markers individually with a staggered effect
  function animateGroup(state, expanding) {

    cancelAnimationFrame(state.animationFrame);

    const startProgress = [...state.progress];
    const startTime = performance.now();

    const count = state.individualMarkers.length;

    function frame(now) {

      state.individualMarkers.forEach((marker, index) => {

        const delay = expanding
          ? index * MARKER_STAGGER
          : (count - index - 1) * MARKER_STAGGER;

        const elapsed = Math.max(
          0,
          Math.min(
            (now - startTime - delay) / ANIMATION_DURATION,
            1
          )
        );

        const eased = expanding
          ? easeOutBack(elapsed)
          : 1 - Math.pow(1 - elapsed, 3);

        const target = expanding ? 1 : 0;

        state.progress[index] =
          startProgress[index] +
          (target - startProgress[index]) * eased;

      });

      updateGroupPositions(state);

      const totalDuration =
        ANIMATION_DURATION + (count - 1) * MARKER_STAGGER;

      if (now - startTime < totalDuration) {

        state.animationFrame = requestAnimationFrame(frame);

      } else {

        state.progress = state.progress.map(() =>
          expanding ? 1 : 0
        );

        updateGroupPositions(state);

        if (!expanding) {
          finishCollapse(state);
        }

      }

    }

    state.animationFrame = requestAnimationFrame(frame);
  }

  // Finish collapsing a group
  function finishCollapse(state) {

    state.individualMarkers.forEach(marker => marker.remove());

    state.individualMarkers = [];

    state.lines.forEach(line => line.remove());

    state.lines = [];

    state.progress = [];

    state.expanded = false;

    state.groupMarker.getElement().style.display = '';

  }

  // Spiderfy a group
  function explodeGroup(state) {

    if (state.expanded || state.group.members.length < 2) {
      return;
    }

    state.expanded = true;

    state.progress = state.group.members.map(() => 0);

    // Hide original grouped marker
    state.groupMarker.getElement().style.display = 'none';

    state.group.members.forEach(member => {

      // Create individual gold marker at original position
      const marker = new maplibregl.Marker({
        color: '#F0B429'
      })
        .setLngLat([
          state.group.longitude,
          state.group.latitude
        ])
        .setPopup(createPopup(member));

      marker.addTo(map);

      marker.getElement().style.zIndex = '20';

      state.individualMarkers.push(marker);

      // Create spider leg
      const line = document.createElementNS(svgNS, 'line');

      line.setAttribute('stroke', '#D99A28');
      line.setAttribute('stroke-width', '1.8');
      line.setAttribute('stroke-opacity', '0.85');
      line.setAttribute('stroke-linecap', 'round');

      lineOverlay.appendChild(line);

      state.lines.push(line);

    });

    animateGroup(state, true);

  }

  // Collapse a spiderfied group
  function collapseGroup(state) {

    if (!state.expanded) {
      return;
    }

    animateGroup(state, false);

  }

  // Create original markers
  groupedLocations.forEach(group => {

    const groupMarker = new maplibregl.Marker({
      color: '#F0B429'
    }).setLngLat([
      group.longitude,
      group.latitude
    ]);

    const state = {
      group,
      groupMarker,
      expanded: false,
      progress: [],
      individualMarkers: [],
      lines: [],
      animationFrame: null
    };

    groupStates.push(state);

    // Number badge for grouped locations
    if (group.members.length > 1) {

      const badge = document.createElement('span');

      badge.textContent = group.members.length;

      badge.style.cssText = `
        position: absolute;
        top: -9px;
        right: -12px;
        min-width: 19px;
        height: 19px;
        padding: 0 3px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #FFFFFF;
        color: #222222;
        border: 1px solid #D99A28;
        border-radius: 50%;
        font-family: Arial, sans-serif;
        font-size: 11px;
        font-weight: bold;
        line-height: 1;
        z-index: 2;
        pointer-events: none;
      `;

      groupMarker.getElement().appendChild(badge);

      // Click to toggle spiderfy
      groupMarker.getElement().addEventListener('click', event => {

        event.stopPropagation();

        if (state.expanded) {
          collapseGroup(state);
        } else {
          explodeGroup(state);
        }

      });

    } else {

      // Single location: normal popup
      groupMarker.setPopup(createPopup(group.members[0]));

    }

    groupMarker.addTo(map);

  });

  // Keep spiderfied markers and lines aligned when map moves
  map.on('move', () => {

    groupStates.forEach(state => {
      updateGroupPositions(state);
    });

  });

  // Automatic spiderfy on zoom
  map.on('zoomend', () => {

    const zoom = map.getZoom();

    groupStates.forEach(state => {

      if (state.group.members.length < 2) {
        return;
      }

      if (zoom >= EXPLODE_ZOOM) {
        explodeGroup(state);
      } else {
        collapseGroup(state);
      }

    });

  });

}
