import { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import * as closestFacility from '@arcgis/core/rest/closestFacility';
import ClosestFacilityParameters from '@arcgis/core/rest/support/ClosestFacilityParameters';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import esriConfig from '@arcgis/core/config';
import { ARCGIS_API_KEY } from '../config';

/**
 * Closest Facility Routing Tool
 * Finds the closest facilities from a clicked point and shows routes
 */
function ClosestFacility() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!mapDiv.current) return;

    // Set API key
    esriConfig.apiKey = ARCGIS_API_KEY;

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
      container: mapDiv.current,
      map,
      center: [-122.67584, 45.52087],
      zoom: 14,
      constraints: {
        snapToZoom: false,
      },
    });

    viewRef.current = view;

    view.when(() => {
      addFacilityGraphics();
      findClosestFacility(addStartGraphic(view.center), facilitiesLayer.graphics);
    });

    const clickHandler = view.on("click", (event: any) => {
      view.hitTest(event).then(() => {
        findClosestFacility(addStartGraphic(event.mapPoint), facilitiesLayer.graphics);
      });
    });

    function findClosestFacility(startFeature: Graphic, facilityFeatures: any) {
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
          if (results.routes) {
            showRoutes(results.routes);
          }
        },
        (error) => {
          console.log(error.details);
        }
      );
    }

    function addStartGraphic(point: any): Graphic {
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

    function showRoutes(routes: FeatureSet) {
      routesLayer.removeAll();
      routes.features.forEach((route: any) => {
        route.symbol = routeSymbol;
        routesLayer.add(route);
      });
    }

    // Cleanup
    return () => {
      clickHandler.remove();
      view.destroy();
    };
  }, []);

  return <div ref={mapDiv} className="map-container" />;
}

export default ClosestFacility;
