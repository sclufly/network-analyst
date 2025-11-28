import { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import * as networkService from '@arcgis/core/rest/networkService';
import * as serviceArea from '@arcgis/core/rest/serviceArea';
import ServiceAreaParameters from '@arcgis/core/rest/support/ServiceAreaParameters';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import Graphic from '@arcgis/core/Graphic';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';
import esriConfig from '@arcgis/core/config';
import { ARCGIS_API_KEY } from '../config';

/**
 * Service Area Analysis Tool
 * Shows areas reachable within specified drive times from a selected point
 */
function ServiceArea() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const travelModeRef = useRef<any>(null);

  useEffect(() => {
    if (!mapDiv.current) return;

    // Set API key
    esriConfig.apiKey = ARCGIS_API_KEY;

    const url = "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World";

    const map = new Map({
      basemap: "arcgis/navigation",
    });

    const view = new MapView({
      container: mapDiv.current,
      map,
      center: [-79.4163, 43.7001],
      zoom: 13,
      constraints: {
        snapToZoom: false,
      },
    });

    viewRef.current = view;

    view.ui.add(new ScaleBar({ view, style: "line" }), "bottom-right");

    view.when(() => {
      createServiceAreas(view.center);
    });

    const clickHandler = view.on("click", (event) => {
      createServiceAreas(event.mapPoint);
    });

    function createServiceAreas(point: __esri.Point) {
      view.graphics.removeAll();
      const locationGraphic = createGraphic(point);
      findServiceArea(locationGraphic);
    }

    function createGraphic(geometry: __esri.Point): Graphic {
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

    async function findServiceArea(locationFeature: Graphic) {
      if (!travelModeRef.current) {
        const networkDescription = await networkService.fetchServiceDescription(url);
        travelModeRef.current = networkDescription.supportedTravelModes?.find(
          (travelMode) => travelMode.name === "Driving Time"
        );
      }

      const serviceAreaParameters = new ServiceAreaParameters({
        facilities: new FeatureSet({
          features: [locationFeature],
        }),
        defaultBreaks: [5, 10, 15, 20], // mins
        travelMode: travelModeRef.current,
        travelDirection: "from-facility",
        outSpatialReference: view.spatialReference,
        trimOuterPolygon: true,
      });

      const result = await serviceArea.solve(url, serviceAreaParameters);
      if (result.serviceAreaPolygons) {
        showServiceAreas(result.serviceAreaPolygons);
      }
    }

    function showServiceAreas(serviceAreaPolygons: FeatureSet) {
      const graphics = serviceAreaPolygons.features.map((g) => {
        g.symbol = {
          type: "simple-fill",
          color: "rgba(255, 0, 0, 0.25)",
        };
        return g;
      });
      view.graphics.addMany(graphics, 0);
    }

    // Cleanup
    return () => {
      clickHandler.remove();
      view.destroy();
    };
  }, []);

  return <div ref={mapDiv} className="map-container" />;
}

export default ServiceArea;
