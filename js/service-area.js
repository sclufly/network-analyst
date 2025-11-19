/**
 * Service Area Analysis Tool
 * Shows areas reachable within specified drive times from a selected point
 */

export async function initServiceArea(viewDiv, infoPanel) {
  const [
    Map,
    MapView,
    networkService,
    serviceArea,
    ServiceAreaParameters,
    FeatureSet,
    Graphic,
    ScaleBar,
  ] = await $arcgis.import([
    "@arcgis/core/Map.js",
    "@arcgis/core/views/MapView.js",
    "@arcgis/core/rest/networkService.js",
    "@arcgis/core/rest/serviceArea.js",
    "@arcgis/core/rest/support/ServiceAreaParameters.js",
    "@arcgis/core/rest/support/FeatureSet.js",
    "@arcgis/core/Graphic.js",
    "@arcgis/core/widgets/ScaleBar.js",
  ]);

  const url = "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World";
  let travelMode = null;

  const map = new Map({
    basemap: "arcgis/navigation",
  });

  const view = new MapView({
    container: viewDiv,
    map,
    center: [-79.4163, 43.7001],
    zoom: 13,
    constraints: {
      snapToZoom: false,
    },
  });

  view.ui.add(new ScaleBar({ view, style: "line" }), "bottom-right");

  view.when(() => {
    createServiceAreas(view.center);
  });

  const clickHandler = view.on("click", (event) => {
    createServiceAreas(event.mapPoint);
  });

  function createServiceAreas(point) {
    view.graphics.removeAll();
    const locationGraphic = createGraphic(point);
    findServiceArea(locationGraphic);
  }

  function createGraphic(geometry) {
    const graphic = new Graphic({
      geometry,
      symbol: {
        type: "simple-marker",
        color: "white",
        size: 8,
      },
    });
    view.graphics.add(graphic);
    return graphic;
  }

  async function findServiceArea(locationFeature) {
    if (!travelMode) {
      const networkDescription = await networkService.fetchServiceDescription(url);
      travelMode = networkDescription.supportedTravelModes.find(
        (travelMode) => travelMode.name === "Driving Time"
      );
    }

    const serviceAreaParameters = new ServiceAreaParameters({
      facilities: new FeatureSet({
        features: [locationFeature],
      }),
      defaultBreaks: [5, 10, 15, 20], // mins
      travelMode,
      travelDirection: "from-facility",
      outSpatialReference: view.spatialReference,
      trimOuterPolygon: true,
    });

    const { serviceAreaPolygons } = await serviceArea.solve(url, serviceAreaParameters);
    showServiceAreas(serviceAreaPolygons);
  }

  function showServiceAreas(serviceAreaPolygons) {
    const graphics = serviceAreaPolygons.features.map((g) => {
      g.symbol = {
        type: "simple-fill",
        color: "rgba(255, 0, 0, 0.25)",
      };
      return g;
    });
    view.graphics.addMany(graphics, 0);
  }

  // Return cleanup function
  return () => {
    clickHandler.remove();
    view.destroy();
  };
}
