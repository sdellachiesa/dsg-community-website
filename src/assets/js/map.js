
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';

// Initialise only on pages containing the map
const mapContainer = document.getElementById('community-map');

if (mapContainer) {

  // Read Data Steward data
  const dataElement = document.getElementById('datastewards-data');
  const locations = dataElement ? JSON.parse(dataElement.textContent) : [];

  // Configuration
  const EXPLODE_ZOOM = 8;
  const ANIMATION_DURATION = 650;
  const MARKER_SPACING = 42;

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

  // SVG overlay for animated connecting lines
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

  // Keep track of expanded groups
  const groupStates = [];

  // Create popup for one Data Steward
  function createPopup(member) {

    const content = document.createElement('div');

    const name = document.createElement('strong');
    name.textContent = member.name;

    const institution = document.createElement('div');
    institution.textContent = member.institution;

    const city = document.createElement('div');
    city.textContent = member.city;

    content.append(name, institution, city);

    return new maplibregl.Popup({ offset: 25 })
      .setDOMContent(content);
  }

  // Smooth spring-like easing
  function easing(t) {
    const c1 = 1.35;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // Calculate radial positions around the original location
  function getTargetPositions(group) {

    const center = map.project([
      group.longitude,
      group.latitude
    ]);

    const count = group.members.length;

    const radius = Math.max(
      55,
      count * MARKER_SPACING / (2 * Math.PI)
    );

    return group.members.map((member, index) => {

      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;

      return {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      };

    });

  }

  // Update exploded marker positions and connecting lines
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

      const x = center.x + (target.x - center.x) * state.progress;
      const y = center.y + (target.y - center.y) * state.progress;

      marker.setLngLat(map.unproject([x, y]));

      const line = state.lines[index];

      line.setAttribute('x1', center.x);
      line.setAttribute('y1', center.y);
      line.setAttribute('x2', x);
      line.setAttribute('y2', y);

      line.style.opacity = state.progress;

    });

  }

  // Animate a group between collapsed and expanded states
  function animateGroup(state, expanding) {

    const startProgress = state.progress;
    const endProgress = expanding ? 1 : 0;

    const startTime = performance.now();

    function frame(now) {

      const elapsed = Math.min(
        (now - startTime) / ANIMATION_DURATION,
        1
      );

      const eased = easing(elapsed);

      state.progress =
        startProgress + (endProgress - startProgress) * eased;

      updateGroupPositions(state);

      if (elapsed < 1) {

        state.animationFrame = requestAnimationFrame(frame);

      } else {

        state.progress = endProgress;

        if (!expanding) {
          finishCollapse(state);
        }

      }

    }

    cancelAnimationFrame(state.animationFrame);

    state.animationFrame = requestAnimationFrame(frame);

  }

  // Remove exploded markers and restore the original group marker
  function finishCollapse(state) {

    state.individualMarkers.forEach(marker => marker.remove());

    state.individualMarkers = [];

    state.lines.forEach(line => line.remove());

    state.lines = [];

    state.expanded = false;
    state.progress = 0;

    state.groupMarker.getElement().style.display = '';

  }

  // Expand a group
  function explodeGroup(state) {

    if (state.expanded || state.group.members.length < 2) {
      return;
    }

    state.expanded = true;
    state.progress = 0;

    state.groupMarker.getElement().style.display = 'none';

    const center = map.project([
      state.group.longitude,
      state.group.latitude
    ]);

    state.group.members.forEach(member => {

      // Create individual marker at the original location
      const marker = new maplibregl.Marker({
        color: '#F0B429'
      })
        .setLngLat([
          state.group.longitude,
          state.group.latitude
        ])
        .setPopup(createPopup(member));

      marker.addTo(map);

      marker.getElement().style.zIndex = '2';

      state.individualMarkers.push(marker);

      // Create connecting line
      const line = document.createElementNS(svgNS, 'line');

      line.setAttribute('x1', center.x);
      line.setAttribute('y1', center.y);
      line.setAttribute('x2', center.x);
      line.setAttribute('y2', center.y);

      line.setAttribute('stroke', '#D99A28');
      line.setAttribute('stroke-width', '1.8');
      line.setAttribute('stroke-opacity', '0.8');
      line.setAttribute('stroke-linecap', 'round');

      line.style.opacity = '0';

      lineOverlay.appendChild(line);

      state.lines.push(line);

    });

    animateGroup(state, true);

  }

  // Collapse a group
  function collapseGroup(state) {

    if (!state.expanded) {
      return;
    }

    animateGroup(state, false);

  }

  // Create original grouped markers
  groupedLocations.forEach(group => {

    // Only create a group marker for this coordinate
    const groupMarker = new maplibregl.Marker({
      color: '#F0B429'
    })
      .setLngLat([
        group.longitude,
        group.latitude
      ]);

    const state = {
      group,
      groupMarker,
      expanded: false,
      progress: 0,
      individualMarkers: [],
      lines: [],
      animationFrame: null
    };

    groupStates.push(state);

    // Number badge for multiple records
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

      // Clicking the grouped marker toggles the explosion
      groupMarker.getElement().addEventListener('click', event => {

        event.stopPropagation();

        if (state.expanded) {
          collapseGroup(state);
        } else {
          explodeGroup(state);
        }

      });

    } else {

      // A single record gets its normal popup
      groupMarker.setPopup(createPopup(group.members[0]));

    }

    groupMarker.addTo(map);

  });

  // Keep exploded markers attached to their locations while the map moves
  map.on('move', () => {

    groupStates.forEach(state => {
      updateGroupPositions(state);
    });

  });

  // Automatically explode/collapse when zooming
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
