
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';

// Only initialise the map on pages that contain the map container
const mapContainer = document.getElementById('community-map');

if (mapContainer) {

  // Read the location data supplied by Eleventy
  const dataElement = document.getElementById('datastewards-data');
  const locations = dataElement ? JSON.parse(dataElement.textContent) : [];

  // Group Data Stewards with identical coordinates
  const groupedLocations = new Map();

  locations.forEach(location => {

    const longitude = Number(location.longitude);
    const latitude = Number(location.latitude);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude)
    ) {
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

  // Create the map
  const map = new maplibregl.Map({
    container: mapContainer,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [10.45, 51.16],
    zoom: 4.8,
    minZoom: 4,
    maxZoom: 12
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  // Add one marker for each unique location
  groupedLocations.forEach(group => {

    const popupContent = document.createElement('div');

    group.members.forEach((member, index) => {

      if (index > 0) {
        popupContent.appendChild(document.createElement('hr'));
      }

      const name = document.createElement('strong');
      name.textContent = member.name;

      const institution = document.createElement('div');
      institution.textContent = member.institution;

      const city = document.createElement('div');
      city.textContent = member.city;

      popupContent.append(name, institution, city);

    });

    const popup = new maplibregl.Popup({ offset: 25 })
      .setDOMContent(popupContent);

    // Keep the original gold MapLibre marker
    const marker = new maplibregl.Marker({
      color: '#F0B429'
    })
      .setLngLat([group.longitude, group.latitude])
      .setPopup(popup);

    // Add a number badge only when multiple people share the location
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

      marker.getElement().appendChild(badge);

    }

    marker.addTo(map);

  });

}
