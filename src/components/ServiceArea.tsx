import { useCallback, useEffect, useRef, useState } from 'react';
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
  const lastClickPointRef = useRef<__esri.Point | null>(null);
  
  const [numBreaks, setNumBreaks] = useState<number>(3);
  const [breakSize, setBreakSize] = useState<number>(5);
  const [travelModeName, setTravelModeName] = useState<string>("Driving Time");
  
  const url = "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World";

  // memoize function to prevent unnecessary recreations
  const runServiceAreaAnalysis = useCallback(async (point: __esri.Point) => {
    const view = viewRef.current;
    if (!view) return;

    view.graphics.removeAll();

    // calculate break values from current state
    const breakValues = Array.from({ length: numBreaks }, (_, i) => (i + 1) * breakSize);

    // create location graphic
    const locationGraphic = new Graphic({
      geometry: point,
      symbol: {
        type: "simple-marker",
        color: "white",
        size: 8,
      },
    });
    view.graphics.add(locationGraphic);

    // fetch travel mode based on current selection
    const networkDescription = await networkService.fetchServiceDescription(url);
    travelModeRef.current = networkDescription.supportedTravelModes?.find(
      (travelMode) => travelMode.name === travelModeName
    );

    // solve service area
    const serviceAreaParameters = new ServiceAreaParameters({
      facilities: new FeatureSet({
        features: [locationGraphic],
      }),
      defaultBreaks: breakValues,
      travelMode: travelModeRef.current,
      travelDirection: "from-facility",
      outSpatialReference: view.spatialReference,
      trimOuterPolygon: true,
    });

    const result = await serviceArea.solve(url, serviceAreaParameters);
    
    if (result.serviceAreaPolygons) {
      const graphics = result.serviceAreaPolygons.features.map((g) => {
        g.symbol = {
          type: "simple-fill",
          color: "rgba(255, 0, 0, 0.25)",
        };
        return g;
      });
      view.graphics.addMany(graphics, 0);
    }
  }, [numBreaks, breakSize, travelModeName]);

  // initialize map only once
  useEffect(() => {
    if (!mapDiv.current) return;

    esriConfig.apiKey = ARCGIS_API_KEY;

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
      lastClickPointRef.current = view.center;
      runServiceAreaAnalysis(view.center);
    });

    // Cleanup
    return () => {
      view.destroy();
    };
  }, []);

  // click handler - recreates when runServiceAreaAnalysis changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const clickHandler = view.on("click", (event) => {
      lastClickPointRef.current = event.mapPoint;
      runServiceAreaAnalysis(event.mapPoint);
    });

    return () => {
      clickHandler.remove();
    };
  }, [runServiceAreaAnalysis]);

  const handleNumBreaksChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNumBreaks(parseInt(e.target.value));
  };

  const handleBreakSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 30) {
      setBreakSize(value);
    }
  };

  const handleTravelModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTravelModeName(e.target.value);
  };

  const handleUpdateMap = () => {
    const point = lastClickPointRef.current;
    if (point) {
      runServiceAreaAnalysis(point);
    }
  };

  return (
    <>
      <div ref={mapDiv} className="map-container" />
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        zIndex: 1,
        minWidth: '200px'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          Service Area Options
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Travel mode:
          </label>
          <select
            value={travelModeName}
            onChange={handleTravelModeChange}
            style={{
              padding: '5px',
              width: '100%',
              border: '1px solid #ccc',
              borderRadius: '3px'
            }}
          >
            <option value="Driving Time">Driving Time</option>
            <option value="Walking Time">Walking Time</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Number of breaks:
          </label>
          <select
            value={numBreaks}
            onChange={handleNumBreaksChange}
            style={{
              padding: '5px',
              width: '100%',
              border: '1px solid #ccc',
              borderRadius: '3px'
            }}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Break size (minutes):
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={breakSize}
            onChange={handleBreakSizeChange}
            style={{
              padding: '5px',
              width: '100%',
              border: '1px solid #ccc',
              borderRadius: '3px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleUpdateMap}
          style={{
            padding: '8px 12px',
            width: '100%',
            backgroundColor: '#0079c1',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Update Map
        </button>
      </div>
    </>
  );
}

export default ServiceArea;