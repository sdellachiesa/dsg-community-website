
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';

// Only initialise the map on pages that contain the map container
const mapContainer = document.getElementById('community-map');

if (mapContainer) {

  // Read location data supplied by Eleventy
  const dataElement = document.getElementById('datastewards-data');
  const locations = dataElement ? JSON.parse(dataElement.textContent) : [];

  // Group records that have exactly the same coordinates
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

  // Convert grouped locations into GeoJSON
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

  // Add clustered locations after the map style loads
  map.on('load', () => {

    map.addSource('datastewards', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 50,

      // Count all people represented by each cluster
      clusterProperties: {
        total_people: ['+', ['get', 'member_count']]
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
        'circle-radius': 23,
        'circle-blur': 0.8,
        'circle-opacity': 0.45
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
        'text-font': ['Noto Sans Bold'],
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
        'circle-opacity': 0.55
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
        'text-font': ['Noto Sans Bold'],
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

    map.on('click', 'clusters', (event) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['clusters']
      });

      if (!features.length) return;

      const clusterId = features[0].properties.cluster_id;

      map.getSource('datastewards').getClusterExpansionZoom(
        clusterId,
        (error, zoom) => {
          if (error) return;

          map.jumpTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        }
      );
    });

    // -----------------------------------------
    // CLICK INDIVIDUAL LOCATION: SHOW PEOPLE
    // -----------------------------------------

    map.on('click', 'individual-points', (event) => {
      const feature = event.features[0];
      const members = JSON.parse(feature.properties.members);

      const popupContent = document.createElement('div');

      members.forEach((member, index) => {

        if (index > 0) {
          const separator = document.createElement('hr');
          popupContent.appendChild(separator);
        }

        const name = document.createElement('strong');
        name.textContent = member.name;

        const institution = document.createElement('div');
        institution.textContent = member.institution;

        const city = document.createElement('div');
        city.textContent = member.city;

        popupContent.append(name, institution, city);
      });

      new maplibregl.Popup({ offset: 15 })
        .setLngLat(feature.geometry.coordinates)
        .setDOMContent(popupContent)
        .addTo(map);
    });

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
