
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';

// Only initialise the map on pages that contain the map container
const mapContainer = document.getElementById('community-map');

if (mapContainer) {

  // Read the location data supplied by Eleventy
  const dataElement = document.getElementById('datastewards-data');
  const locations = dataElement ? JSON.parse(dataElement.textContent) : [];

  // Prepare individual GeoJSON features
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
          city: location.city || '',
          member_count: 1
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
  // SPIDERFY STATE
  // -----------------------------------------

  let spiderMarkers = [];
  let spiderCenterMarker = null;

  function clearSpiderfy() {
    spiderMarkers.forEach(marker => marker.remove());
    spiderMarkers = [];

    if (spiderCenterMarker) {
      spiderCenterMarker.remove();
      spiderCenterMarker = null;
    }

    if (map.getSource('spider-lines')) {
      map.getSource('spider-lines').setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  }

  // -----------------------------------------
  // SPIDERFY NEARBY POINTS
  // -----------------------------------------

  function spiderfy(anchor, members) {

    clearSpiderfy();

    const count = members.length;

    // Arrange markers around the central location
    const radius = Math.min(55, Math.max(32, count * 5));

    const centerPixel = map.project(anchor);
    const lineFeatures = [];

    members.forEach((member, index) => {

      const angle = (2 * Math.PI * index / count) - Math.PI / 2;

      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;

      // Calculate the geographical position of the expanded marker
      const markerPixel = [
        centerPixel.x + offsetX,
        centerPixel.y + offsetY
      ];

      const markerCoordinates = map.unproject(markerPixel);

      // Draw a connecting line to the original location
      lineFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            anchor,
            markerCoordinates.toArray()
          ]
        },
        properties: {}
      });

      // Create the original gold MapLibre pin
      const popup = new maplibregl.Popup({ offset: 25 })
        .setDOMContent(createPopupContent(member));

      const marker = new maplibregl.Marker({
        color: '#F0B429',
        offset: [0, 0]
      })
        .setLngLat(markerCoordinates)
        .setPopup(popup)
        .addTo(map);

      spiderMarkers.push(marker);

    });

    // Display the connecting lines
    map.getSource('spider-lines').setData({
      type: 'FeatureCollection',
      features: lineFeatures
    });

    // Mark the original central location
    const centerElement = document.createElement('div');

    centerElement.style.cssText = `
      width: 9px;
      height: 9px;
      background: #F0B429;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 3px rgba(0,0,0,0.4);
    `;

    spiderCenterMarker = new maplibregl.Marker({
      element: centerElement
    })
      .setLngLat(anchor)
      .addTo(map);
  }

  // -----------------------------------------
  // MAP LOAD
  // -----------------------------------------

  map.on('load', () => {

    // Add the clustered GeoJSON source
    map.addSource('datastewards', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 45,

      // Count all people in each cluster
      clusterProperties: {
        total_people: ['+', ['get', 'member_count']]
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
    // CLUSTER CIRCLES
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
    // ORIGINAL GOLD TEARDROP PIN IMAGE
    // -----------------------------------------

    const pinSVG = `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="52" height="76" viewBox="0 0 26 38">
        <path
          d="M13 0C5.82 0 0 5.82 0 13
             C0 22.5 13 38 13 38
             S26 22.5 26 13
             C26 5.82 20.18 0 13 0Z"
          fill="#F0B429"
          stroke="#FFFFFF"
          stroke-width="1.3"/>
        <circle cx="13" cy="13" r="4"
                fill="#FFFFFF" opacity="0.9"/>
      </svg>
    `;

    const pinImage = new Image();

    pinImage.onload = () => {

      map.addImage('gold-pin', pinImage, {
        pixelRatio: 2
      });

      // -----------------------------------------
      // INDIVIDUAL GOLD PINS
      // -----------------------------------------

      map.addLayer({
        id: 'individual-points',
        type: 'symbol',
        source: 'datastewards',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'gold-pin',
          'icon-size': 1,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      // -----------------------------------------
      // CLICK INDIVIDUAL POINTS
      // -----------------------------------------

      map.on('click', 'individual-points', event => {

        const clickX = event.point.x;
        const clickY = event.point.y;

        // Find all individual points within 45 screen pixels
        const nearbyFeatures = map.queryRenderedFeatures(
          [
            [clickX - 45, clickY - 45],
            [clickX + 45, clickY + 45]
          ],
          {
            layers: ['individual-points']
          }
        );

        // Remove duplicate feature results
        const uniqueFeatures = Array.from(
          new Map(
            nearbyFeatures.map(feature => [
              feature.id,
              feature
            ])
          ).values()
        );

        // If several points are close together, expand them
        if (uniqueFeatures.length > 1) {

          const members = uniqueFeatures.map(feature => ({
            name: feature.properties.name,
            institution: feature.properties.institution,
            city: feature.properties.city
          }));

          // Use the clicked point as the central reference
          spiderfy(
            event.features[0].geometry.coordinates,
            members
          );

          return;
        }

        // Otherwise show the normal individual popup
        const feature = event.features[0];

        const member = {
          name: feature.properties.name,
          institution: feature.properties.institution,
          city: feature.properties.city
        };

        new maplibregl.Popup({ offset: 25 })
          .setLngLat(feature.geometry.coordinates)
          .setDOMContent(createPopupContent(member))
          .addTo(map);

      });

    };

    pinImage.onerror = () => {
      console.error('Could not load the gold map marker image.');
    };

    pinImage.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(pinSVG);

    // -----------------------------------------
    // CLICK CLUSTER: IMMEDIATE ZOOM
    // -----------------------------------------

    map.on('click', 'clusters', event => {

      clearSpiderfy();

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
    // CLOSE SPIDERFY WHEN CLICKING ELSEWHERE
    // -----------------------------------------

    map.on('click', event => {

      const clickedFeatures = map.queryRenderedFeatures(
        event.point,
        {
          layers: ['clusters', 'individual-points']
        }
      );

      if (clickedFeatures.length === 0) {
        clearSpiderfy();
      }

    });

    // Close expanded markers when moving the map
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
