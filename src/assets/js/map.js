
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';

// Only initialise the map on pages that contain the map container
const mapContainer = document.getElementById('community-map');

if (mapContainer) {

  // Read location data supplied by Eleventy
  const dataElement = document.getElementById('datastewards-data');
  const locations = dataElement ? JSON.parse(dataElement.textContent) : [];

  // Group records with exactly the same coordinates
  const groupedLocations = new Map();

  locations.forEach(location => {
    const longitude = Number(location.longitude);
    const latitude = Number(location.latitude);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
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

  // Convert locations into GeoJSON
  const features = Array.from(groupedLocations.values()).map(group => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [group.longitude, group.latitude]
    },
    properties: {
      member_count: group.members.length,
      members: JSON.stringify(group.members)
    }
  }));

  const geojson = {
    type: 'FeatureCollection',
    features
  };

  // Add CSS for spiderfied markers
  const markerStyle = document.createElement('style');

  markerStyle.textContent = `
    .spider-marker {
      width: 22px;
      height: 22px;
      padding: 0;
      border: 2px solid #D99A28;
      border-radius: 50%;
      background: #FFFFFF;
      box-shadow:
        0 0 5px 2px rgba(229, 165, 43, 0.75),
        0 0 14px 5px rgba(229, 165, 43, 0.4);
      cursor: pointer;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }

    .spider-marker:hover {
      transform: scale(1.25);
      box-shadow:
        0 0 7px 3px rgba(229, 165, 43, 0.9),
        0 0 18px 7px rgba(229, 165, 43, 0.55);
    }
  `;

  document.head.appendChild(markerStyle);

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

  // Keep track of spiderfied markers
  let spiderMarkers = [];

  // Remove all spiderfied markers
  function clearSpiderfy() {
    spiderMarkers.forEach(marker => marker.remove());
    spiderMarkers = [];
  }

  // Create safe popup content for one person
  function createPopupContent(member) {
    const content = document.createElement('div');

    const name = document.createElement('strong');
    name.textContent = member.name;

    const institution = document.createElement('div');
    institution.textContent = member.institution;

    const city = document.createElement('div');
    city.textContent = member.city;

    content.append(name, institution, city);

    return content;
  }

  // Spread people sharing identical coordinates around their location
  function spiderfy(coordinates, members) {

    clearSpiderfy();

    const count = members.length;

    // Distance between the original location and spiderfied markers
    const radius = count > 8 ? 48 : count > 4 ? 40 : 32;

    members.forEach((member, index) => {

      // Arrange markers evenly around a circle
      const angle = (2 * Math.PI * index / count) - Math.PI / 2;

      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;

      // Create the white and gold marker
      const element = document.createElement('button');

      element.className = 'spider-marker';
      element.type = 'button';
      element.title = member.name;
      element.setAttribute('aria-label', member.name);

      const popup = new maplibregl.Popup({
        offset: 15,
        closeButton: true
      }).setDOMContent(createPopupContent(member));

      // Place the marker around the original coordinates
      const marker = new maplibregl.Marker({
        element: element,
        anchor: 'center',
        offset: [offsetX, offsetY]
      })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map);

      spiderMarkers.push(marker);
    });
  }

  // Add map data and layers after loading
  map.on('load', () => {

    map.addSource('datastewards', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 50,

      // Count all people represented by each cluster
      clusterProperties: {
        total_people: [
          '+',
          ['accumulated'],
          ['get', 'member_count']
        ]
      }
    });

    // -----------------------------------------
    // CLUSTER GLOW
    // -----------------------------------------

    map.addLayer({
      id: 'cluster-glow',
      type: 'circle',
      source: 'datastewards',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#E5A52B',
        'circle-radius': 25,
        'circle-blur': 0.8,
        'circle-opacity': 0.4
      }
    });

    // -----------------------------------------
    // CLUSTER CIRCLES
    // -----------------------------------------

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'datastewards',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#FFFFFF',
        'circle-radius': 16,
        'circle-stroke-color': '#D99A28',
        'circle-stroke-width': 2
      }
    });

    // -----------------------------------------
    // CLUSTER NUMBERS
    // -----------------------------------------

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'datastewards',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['to-string', ['get', 'total_people']],
        'text-size': 13,
        'text-font': ['Open Sans Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#222222'
      }
    });

    // -----------------------------------------
    // INDIVIDUAL MARKER GLOW
    // -----------------------------------------

    map.addLayer({
      id: 'individual-glow',
      type: 'circle',
      source: 'datastewards',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#E5A52B',
        'circle-radius': [
          'case',
          ['>', ['get', 'member_count'], 1],
          19,
          15
        ],
        'circle-blur': 0.8,
        'circle-opacity': 0.5
      }
    });

    // -----------------------------------------
    // INDIVIDUAL WHITE MARKERS
    // -----------------------------------------

    map.addLayer({
      id: 'individual-points',
      type: 'circle',
      source: 'datastewards',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#FFFFFF',
        'circle-radius': [
          'case',
          ['>', ['get', 'member_count'], 1],
          10,
          7
        ],
        'circle-stroke-color': '#D99A28',
        'circle-stroke-width': 2
      }
    });

    // -----------------------------------------
    // NUMBERS FOR IDENTICAL COORDINATES
    // -----------------------------------------

    map.addLayer({
      id: 'individual-count',
      type: 'symbol',
      source: 'datastewards',
      filter: [
        'all',
        ['!', ['has', 'point_count']],
        ['>', ['get', 'member_count'], 1]
      ],
      layout: {
        'text-field': ['to-string', ['get', 'member_count']],
        'text-size': 10,
        'text-font': ['Open Sans Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#222222'
      }
    });

    // -----------------------------------------
    // CLICK CLUSTER: IMMEDIATE ZOOM
    // -----------------------------------------

    map.on('click', 'clusters', event => {

      const feature = event.features[0];
      const clusterId = feature.properties.cluster_id;

      clearSpiderfy();

      map.getSource('datastewards').getClusterExpansionZoom(
        clusterId,
        (error, zoom) => {

          if (error) return;

          map.jumpTo({
            center: feature.geometry.coordinates,
            zoom: zoom
          });

        }
      );

    });

    // -----------------------------------------
    // CLICK INDIVIDUAL LOCATION
    // -----------------------------------------

    map.on('click', 'individual-points', event => {

      const feature = event.features[0];
      const coordinates = feature.geometry.coordinates;
      const members = JSON.parse(feature.properties.members);

      // Several people at exactly the same coordinates:
      // spread them around the original marker
      if (members.length > 1) {
        spiderfy(coordinates, members);
        return;
      }

      // Only one person: show their popup
      new maplibregl.Popup({ offset: 15 })
        .setLngLat(coordinates)
        .setDOMContent(createPopupContent(members[0]))
        .addTo(map);

    });

    // -----------------------------------------
    // COLLAPSE SPIDERFIED MARKERS
    // -----------------------------------------

    map.on('click', event => {

      const clickedFeatures = map.queryRenderedFeatures(event.point, {
        layers: ['clusters', 'individual-points']
      });

      // Clicking elsewhere on the map collapses the spider
      if (clickedFeatures.length === 0) {
        clearSpiderfy();
      }

    });

    // Collapse spiderfied markers when the map moves
    map.on('movestart', clearSpiderfy);

    // -----------------------------------------
    // CURSOR INTERACTIONS
    // -----------------------------------------

    ['clusters', 'individual-points'].forEach(layer => {

      map.on('mouseenter', layer, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = '';
      });

    });

  });

}
