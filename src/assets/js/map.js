
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';

// Only initialise the map on pages that contain the map container
const mapContainer = document.getElementById('community-map');

if (mapContainer) {

  // Read location data supplied by Eleventy
  const dataElement = document.getElementById('datastewards-data');
  const locations = dataElement ? JSON.parse(dataElement.textContent) : [];

  // Prepare GeoJSON features
  const features = locations
    .map((location, index) => {
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
        return null;
      }

      return {
        type: 'Feature',
        id: index,
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        properties: {
          name: location['job-profile'] || 'Data Steward',
          institution: location.institution || '',
          city: location.city || ''
        }
      };
    })
    .filter(Boolean);

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

  // -----------------------------------------
  // SETTINGS
  // -----------------------------------------

  const CLUSTER_RADIUS = 45;
  const SPIDERFY_ZOOM = 9;
  const SPIDERFY_DISTANCE = 45;
  const SPIDERFY_MARKER_RADIUS = 38;

  // -----------------------------------------
  // POPUP CONTENT
  // -----------------------------------------

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

  // -----------------------------------------
  // MARKER MANAGEMENT
  // -----------------------------------------

  const markers = new Map();
  const centralMarkers = new Map();

  let animationFrame = null;
  let lastSpiderSignature = '';

  // Create a small central reference point
  function createCentralMarker(coordinates) {

    const element = document.createElement('div');

    element.style.cssText = `
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #F0B429;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 3px rgba(0,0,0,0.4);
    `;

    return new maplibregl.Marker({
      element: element,
      anchor: 'center'
    })
      .setLngLat(coordinates)
      .addTo(map);
  }

  // Remove markers that are no longer visible
  function removeUnusedMarkers(activeIds) {

    for (const [id, marker] of markers) {
      if (!activeIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }

  // -----------------------------------------
  // GROUP POINTS BY SCREEN DISTANCE
  // -----------------------------------------

  function groupNearbyPoints(points) {

    const groups = [];

    points.forEach(point => {

      const pixel = map.project(point.coordinates);

      let matchingGroup = null;

      for (const group of groups) {

        const distance = Math.hypot(
          pixel.x - group.centerX,
          pixel.y - group.centerY
        );

        if (distance <= SPIDERFY_DISTANCE) {
          matchingGroup = group;
          break;
        }
      }

      if (matchingGroup) {

        matchingGroup.points.push({
          ...point,
          pixel
        });

        // Update the group centre
        const count = matchingGroup.points.length;

        matchingGroup.centerX =
          matchingGroup.points.reduce((sum, p) => sum + p.pixel.x, 0) / count;

        matchingGroup.centerY =
          matchingGroup.points.reduce((sum, p) => sum + p.pixel.y, 0) / count;

      } else {

        groups.push({
          points: [{
            ...point,
            pixel
          }],
          centerX: pixel.x,
          centerY: pixel.y
        });

      }

    });

    return groups;
  }

  // -----------------------------------------
  // UPDATE MARKERS AND SPIDERFY AUTOMATICALLY
  // -----------------------------------------

  function updateMarkers() {

    if (!map.isStyleLoaded()) return;

    const renderedFeatures = map.queryRenderedFeatures({
      layers: ['unclustered-points']
    });

    // Remove duplicate feature results
    const uniquePoints = Array.from(
      new Map(
        renderedFeatures.map(feature => [
          String(feature.id),
          {
            id: String(feature.id),
            coordinates: feature.geometry.coordinates,
            name: feature.properties.name,
            institution: feature.properties.institution,
            city: feature.properties.city
          }
        ])
      ).values()
    );

    const activeIds = new Set(uniquePoints.map(point => point.id));

    removeUnusedMarkers(activeIds);

    const spiderfyEnabled = map.getZoom() >= SPIDERFY_ZOOM;

    const groups = spiderfyEnabled
      ? groupNearbyPoints(uniquePoints)
      : uniquePoints.map(point => ({
          points: [point],
          centerX: map.project(point.coordinates).x,
          centerY: map.project(point.coordinates).y
        }));

    const lineFeatures = [];
    const nextCentralMarkers = new Map();

    let signature = '';

    groups.forEach((group, groupIndex) => {

      const points = group.points;
      const count = points.length;

      const shouldSpiderfy = spiderfyEnabled && count > 1;

      const centerPixel = [
        group.centerX,
        group.centerY
      ];

      const centerCoordinates = map.unproject(centerPixel);

      if (shouldSpiderfy) {

        // Spread the markers around the central point
        const radius = Math.min(
          65,
          Math.max(SPIDERFY_MARKER_RADIUS, count * 9)
        );

        const centralKey = points
          .map(point => point.id)
          .sort()
          .join('-');

        const centralMarker = centralMarkers.get(centralKey)
          || createCentralMarker(centerCoordinates.toArray());

        centralMarker.setLngLat(centerCoordinates);

        nextCentralMarkers.set(centralKey, centralMarker);

        points.forEach((point, index) => {

          const angle =
            (2 * Math.PI * index / count) - Math.PI / 2;

          const markerPixel = [
            centerPixel[0] + Math.cos(angle) * radius,
            centerPixel[1] + Math.sin(angle) * radius
          ];

          const markerCoordinates = map.unproject(markerPixel);

          // Draw connecting line to central point
          lineFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                centerCoordinates.toArray(),
                markerCoordinates.toArray()
              ]
            },
            properties: {}
          });

          signature += `${point.id}:${markerPixel[0].toFixed(1)},${markerPixel[1].toFixed(1)};`;

          updateSingleMarker(point, markerCoordinates);

        });

      } else {

        points.forEach(point => {

          signature += `${point.id}:normal;`;

          updateSingleMarker(
            point,
            point.coordinates
          );

        });

      }

    });

    // Remove central markers no longer needed
    for (const [key, marker] of centralMarkers) {

      if (!nextCentralMarkers.has(key)) {
        marker.remove();
      }

    }

    centralMarkers.clear();

    nextCentralMarkers.forEach((marker, key) => {
      centralMarkers.set(key, marker);
    });

    // Update connecting lines only when their positions change
    if (signature !== lastSpiderSignature) {

      lastSpiderSignature = signature;

      map.getSource('spider-lines').setData({
        type: 'FeatureCollection',
        features: lineFeatures
      });

    }

  }

  // -----------------------------------------
  // CREATE OR UPDATE ORIGINAL GOLD MARKERS
  // -----------------------------------------

  function updateSingleMarker(point, coordinates) {

    let marker = markers.get(point.id);

    if (!marker) {

      const popup = new maplibregl.Popup({
        offset: 25
      }).setDOMContent(
        createPopupContent(point)
      );

      marker = new maplibregl.Marker({
        color: '#F0B429'
      })
        .setPopup(popup)
        .addTo(map);

      markers.set(point.id, marker);

    }

    marker.setLngLat(coordinates);
  }

  // -----------------------------------------
  // SCHEDULE MARKER UPDATES
  // -----------------------------------------

  function scheduleMarkerUpdate() {

    if (animationFrame !== null) return;

    animationFrame = requestAnimationFrame(() => {
      animationFrame = null;
      updateMarkers();
    });

  }

  // -----------------------------------------
  // MAP LOAD
  // -----------------------------------------

  map.on('load', () => {

    // Clustered data source
    map.addSource('datastewards', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 8,
      clusterRadius: CLUSTER_RADIUS,

      clusterProperties: {
        total_people: [
          '+',
          1
        ]
      }
    });

    // -----------------------------------------
    // INVISIBLE LAYER FOR INDIVIDUAL POINTS
    // -----------------------------------------

    map.addLayer({
      id: 'unclustered-points',
      type: 'circle',
      source: 'datastewards',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 1,
        'circle-opacity': 0
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
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#222222'
      }
    });

    // -----------------------------------------
    // CONNECTING LINES
    // -----------------------------------------

    map.addSource('spider-lines', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.addLayer({
      id: 'spider-lines-layer',
      type: 'line',
      source: 'spider-lines',
      paint: {
        'line-color': '#D99A28',
        'line-width': 1.5,
        'line-opacity': 0.8
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
    // CURSOR INTERACTIONS
    // -----------------------------------------

    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    // -----------------------------------------
    // AUTOMATIC MARKER EXPANSION
    // -----------------------------------------

    map.on('zoom', scheduleMarkerUpdate);
    map.on('move', scheduleMarkerUpdate);
    map.on('idle', scheduleMarkerUpdate);
    map.on('sourcedata', scheduleMarkerUpdate);

    scheduleMarkerUpdate();

  });

}
