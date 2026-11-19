
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

  // Create popup content for one or more people
  function createPopupContent(members) {
    const content = document.createElement('div');

    members.forEach((member, index) => {

      if (index > 0) {
        content.appendChild(document.createElement('hr'));
      }

      const name = document.createElement('strong');
      name.textContent = member.name;

      const institution = document.createElement('div');
      institution.textContent = member.institution;

      const city = document.createElement('div');
      city.textContent = member.city;

      content.append(name, institution, city);
    });

    return content;
  }

  // Add data and layers after the map loads
  map.on('load', () => {

    map.addSource('datastewards', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 50,

      // Count all people, not just coordinate groups
      clusterProperties: {
        total_people: ['+', ['get', 'member_count']]
      }
    });

    // -----------------------------------------
    // CLUSTER MARKERS
    // -----------------------------------------

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'datastewards',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#F0B429',
        'circle-radius': 14,
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1.5
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
        'text-size': 12,
        'text-font': ['Open Sans Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#222222'
      }
    });

    // -----------------------------------------
    // ORIGINAL GOLD MARKERS
    // -----------------------------------------

    map.addLayer({
      id: 'individual-points',
      type: 'circle',
      source: 'datastewards',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#F0B429',
        'circle-radius': [
          'case',
          ['>', ['get', 'member_count'], 1],
          9,
          7
        ],
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1.5
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
    // CLICK INDIVIDUAL MARKER: SHOW PEOPLE
    // -----------------------------------------

    map.on('click', 'individual-points', event => {

      const feature = event.features[0];
      const members = JSON.parse(feature.properties.members);

      new maplibregl.Popup({ offset: 15 })
        .setLngLat(feature.geometry.coordinates)
        .setDOMContent(createPopupContent(members))
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
