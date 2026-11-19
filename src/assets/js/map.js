import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';

// Only initialise the map on pages that contain the map container
const mapContainer = document.getElementById('community-map');

if (mapContainer) {
  // Read the location data supplied by Eleventy
  const dataElement = document.getElementById('datastewards-data');
  const locations = dataElement ? JSON.parse(dataElement.textContent) : [];

  // Create the dark map centred on Germany
  const map = new maplibregl.Map({
    container: mapContainer,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [10.45, 51.16],
    zoom: 4.8,
    minZoom: 4,
    maxZoom: 12
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  // Add a marker and popup for each location
  locations.forEach(location => {
    const popupContent = document.createElement('div');

    const name = document.createElement('strong');
    name.textContent = location['job-profile'];

    const institution = document.createElement('div');
    institution.textContent = location.institution;

    const city = document.createElement('div');
    city.textContent = location.city;

    popupContent.append(name, institution, city);

    const popup = new maplibregl.Popup({ offset: 25 })
      .setDOMContent(popupContent);

    new maplibregl.Marker({ color: '#F0B429' })
      .setLngLat([location.longitude, location.latitude])
      .setPopup(popup)
      .addTo(map);
  });
}
