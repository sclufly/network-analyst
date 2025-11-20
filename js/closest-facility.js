/**
 * Closest Facility Routing Tool
 * Finds the closest facilities from a clicked point and shows routes
 */

export async function initClosestFacility(viewDiv, infoPanel) {
  const [
    Map,
    MapView,
    Graphic,
    GraphicsLayer,
    closestFacility,
    ClosestFacilityParameters,
    FeatureSet,
  ] = await $arcgis.import([
    "@arcgis/core/Map.js",
    "@arcgis/core/views/MapView.js",
    "@arcgis/core/Graphic.js",
    "@arcgis/core/layers/GraphicsLayer.js",
    "@arcgis/core/rest/closestFacility.js",
    "@arcgis/core/rest/support/ClosestFacilityParameters.js",
    "@arcgis/core/rest/support/FeatureSet.js",
  ]);

  const routeSymbol = {
    type: "simple-line",
    color: [50, 150, 255, 0.75],
    width: "5",
  };

  const facilities = [
    [-122.67484, 45.52087],
    [-122.68365, 45.52327],
    [-122.66406, 45.52378],
    [-122.6631, 45.52093],
    [-122.66342, 45.51976],
    [-122.66208, 45.5197],
    [-122.66247, 45.51845],
    [-122.66299, 45.51827],
  ];

  const routesLayer = new GraphicsLayer();
  const facilitiesLayer = new GraphicsLayer();

  const map = new Map({
    basemap: "arcgis/streets",
    layers: [routesLayer, facilitiesLayer],
  });

  const view = new MapView({
    container: viewDiv,
    map,
    center: [-122.67584, 45.52087],
    zoom: 14,
    constraints: {
      snapToZoom: false,
    },
  });

  view.when(() => {
    addFacilityGraphics();
    findClosestFacility(addStartGraphic(view.center), facilitiesLayer.graphics);
  });

  view.on("click", (event) => {
    view.hitTest(event).then((response) => {
      findClosestFacility(addStartGraphic(event.mapPoint), facilitiesLayer.graphics);
    });
  });

  function findClosestFacility(startFeature, facilityFeatures) {
    const params = new ClosestFacilityParameters({
      incidents: new FeatureSet({
        features: [startFeature],
      }),
      facilities: new FeatureSet({
        features: facilityFeatures.toArray(),
      }),
      returnRoutes: true,
      returnFacilities: true,
      defaultTargetFacilityCount: 3,
    });

    const url = "https://route-api.arcgis.com/arcgis/rest/services/World/ClosestFacility/NAServer/ClosestFacility_World";

    closestFacility.solve(url, params).then(
      (results) => {
        showRoutes(results.routes);
      },
      (error) => {
        console.log(error.details);
      }
    );
  }

  function addStartGraphic(point) {
    view.graphics.removeAll();
    const graphic = new Graphic({
      symbol: {
        type: "simple-marker",
        color: [255, 255, 255, 1.0],
        size: 8,
        outline: {
          color: [50, 50, 50],
          width: 1,
        },
      },
      geometry: point,
    });
    view.graphics.add(graphic);
    return graphic;
  }

  function addFacilityGraphics() {
    facilities.forEach((point) => {
      facilitiesLayer.graphics.add(
        new Graphic({
          symbol: {
            type: "web-style",
            name: "grocery-store",
            styleName: "Esri2DPointSymbolsStyle",
          },
          geometry: {
            type: "point",
            longitude: point[0],
            latitude: point[1],
            spatialReference: view.spatialReference,
          },
        })
      );
    });
  }

  function showRoutes(routes) {
    routesLayer.removeAll();
    routes.features.forEach((route, i) => {
      route.symbol = routeSymbol;
      routesLayer.add(route);
    });
  }

  // Return cleanup function
  return () => {
    view.destroy();
  };
}
