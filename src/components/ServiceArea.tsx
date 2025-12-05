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
import * as containsOperator from '@arcgis/core/geometry/operators/containsOperator';
import Point from '@arcgis/core/geometry/Point';
import { ARCGIS_API_KEY } from '../config';

// Import local modules
import { ServiceAreaSettings } from './ServiceArea/ServiceAreaSettings';
import { FileUpload } from './ServiceArea/FileUpload';
import { SummaryStatistics } from './ServiceArea/SummaryStatistics';
import { Legend } from './ServiceArea/Legend';
import type { UploadedFile, LegendItem } from './ServiceArea/types';
import {
  calculateLayeredColor,
  parseGeoJSONLocations,
  parseColorToArray,
  extractPointName,
  extractPointId,
  generatePointPopupContent,
} from './ServiceArea/utils';
import {
  SERVICE_AREA_URL,
  DEFAULT_NUM_BREAKS,
  DEFAULT_BREAK_SIZE,
  DEFAULT_TRAVEL_MODE,
  MAP_CENTER,
  MAP_ZOOM,
  FILE_COLORS,
  SERVICE_AREA_FILL_COLOR,
  CLICK_MARKER_COLOR,
  CLICK_MARKER_SIZE,
  LOCATION_MARKER_COLOR,
  LOCATION_MARKER_SIZE,
  UPLOADED_POINT_SIZE,
  UPLOADED_POINT_OUTLINE_COLOR,
  UPLOADED_POINT_OUTLINE_WIDTH,
} from './ServiceArea/constants';

/**
 * Service Area Analysis Tool
 * Shows areas reachable within specified drive times from a selected point
 */
function ServiceArea() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const travelModeRef = useRef<any>(null);
  const lastClickPointRef = useRef<__esri.Point | null>(null);
  const serviceAreaGraphicsRef = useRef<Graphic[]>([]);
  const clickMarkerRef = useRef<Graphic | null>(null);
  const uploadedLocationGraphicsRef = useRef<Graphic[]>([]);
  
  const [numBreaks, setNumBreaks] = useState<number>(DEFAULT_NUM_BREAKS);
  const [breakSize, setBreakSize] = useState<number>(DEFAULT_BREAK_SIZE);
  const [travelModeName, setTravelModeName] = useState<string>(DEFAULT_TRAVEL_MODE);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [smallestBreakContainingAll, setSmallestBreakContainingAll] = useState<number | null>(null);
  const [hasServiceAreas, setHasServiceAreas] = useState<boolean>(false);
  const [hasUploadedPoints, setHasUploadedPoints] = useState<boolean>(false);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);

  // update cursor style when selection mode changes
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.container) {
      view.container.style.cursor = isSelectionMode ? 'crosshair' : 'default';
    }
  }, [isSelectionMode]);

  // memoize function to prevent unnecessary recreations
  const runServiceAreaAnalysis = useCallback(async (point: __esri.Point) => {
    const view = viewRef.current;
    if (!view) return;

    // remove previous service area graphics and click marker
    if (clickMarkerRef.current) {
      view.graphics.remove(clickMarkerRef.current);
      clickMarkerRef.current = null;
    }
    if (serviceAreaGraphicsRef.current.length > 0) {
      view.graphics.removeMany(serviceAreaGraphicsRef.current);
      serviceAreaGraphicsRef.current = [];
    }

    // calculate break values from current state
    const breakValues = Array.from({ length: numBreaks }, (_, i) => (i + 1) * breakSize);

    // Create location graphic
    const locationGraphic = new Graphic({
      geometry: point,
      symbol: {
        type: "simple-marker",
        color: LOCATION_MARKER_COLOR,
        size: LOCATION_MARKER_SIZE,
      },
    });
    view.graphics.add(locationGraphic);
    clickMarkerRef.current = locationGraphic;

    // Fetch travel mode based on current selection
    const networkDescription = await networkService.fetchServiceDescription(SERVICE_AREA_URL);
    travelModeRef.current = networkDescription.supportedTravelModes?.find(
      (travelMode) => travelMode.name === travelModeName
    );

    // Solve service area
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

    const result = await serviceArea.solve(SERVICE_AREA_URL, serviceAreaParameters);
    
    if (result.serviceAreaPolygons) {
      const features = result.serviceAreaPolygons.features || [];
      const graphics = [] as any[];
      features.forEach((g, i) => {
        const geomType = g.geometry?.type;
        if (!geomType || geomType.toLowerCase() !== 'polygon') {
          return;
        }

        g.symbol = {
          type: "simple-fill",
          color: SERVICE_AREA_FILL_COLOR,
        };
        
        // extract break value from service area attributes
        const attrs = g.attributes || {};
        const breakValue = attrs.ToBreak ?? attrs.breakValue ?? breakValues[i] ?? breakValues[0];
        
        g.attributes = {
          ...attrs,
          breakValue
        };
        graphics.push(g);
      });
      view.graphics.addMany(graphics, 0);
      serviceAreaGraphicsRef.current = graphics;
      setHasServiceAreas(graphics.length > 0);
      
      // clear summary statistics - user needs to recalculate
      setUploadedFiles(prev => prev.map(file => ({
        ...file,
        summaryCounts: {},
        pointsByBreak: {}
      })));
      setSmallestBreakContainingAll(null);
      
      // create legend items - sorted from smallest to largest
      const uniqueBreaks = [...new Set(graphics.map(g => g.attributes?.breakValue).filter((v): v is number => typeof v === 'number'))];
      uniqueBreaks.sort((a, b) => a - b);
      
      const items = uniqueBreaks.map((breakValue, index) => ({
        breakValue,
        // smaller breaks have more layers on top, so appear darker
        color: calculateLayeredColor(uniqueBreaks.length - index)
      }));
      
      setLegendItems(items);
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
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      constraints: {
        snapToZoom: false,
      },
    });

    viewRef.current = view;
    view.ui.add(new ScaleBar({ view, style: "line" }), "bottom-right");

    view.when(() => {
      lastClickPointRef.current = view.center;
    });

    // Cleanup
    return () => {
      view.destroy();
    };
  }, []);

  // click handler - only sets location when in selection mode
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const clickHandler = view.on("click", (event) => {
      if (isSelectionMode) {
        lastClickPointRef.current = event.mapPoint;
        // add a temporary marker to show selected location
        if (clickMarkerRef.current) {
          view.graphics.remove(clickMarkerRef.current);
        }
        const tempMarker = new Graphic({
          geometry: event.mapPoint,
          symbol: {
            type: "simple-marker",
            color: CLICK_MARKER_COLOR,
            size: CLICK_MARKER_SIZE,
            outline: {
              color: "white",
              width: 2
            }
          }
        });
        view.graphics.add(tempMarker);
        clickMarkerRef.current = tempMarker;
        // exit selection mode after selecting
        setIsSelectionMode(false);
      }
    });

    return () => {
      clickHandler.remove();
    };
  }, [isSelectionMode]);



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        const locations = parseGeoJSONLocations(geojson);

        const color = FILE_COLORS[uploadedFiles.length % FILE_COLORS.length];
        // Clear all existing statistics when adding a new file
        setUploadedFiles(prev => [
          ...prev.map(f => ({ ...f, summaryCounts: {}, pointsByBreak: {} })),
          {
            name: file.name,
            locations,
            color,
            summaryCounts: {},
            pointsByBreak: {}
          }
        ]);
        setSmallestBreakContainingAll(null);
      } catch (error) {
        console.error('Error parsing GeoJSON:', error);
        alert('Error parsing GeoJSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);
    // Clear the input so the same file can be re-uploaded
    e.target.value = '';
  };

  const handleUpdateMap = () => {
    const point = lastClickPointRef.current;
    if (point) {
      runServiceAreaAnalysis(point);
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index).map(f => ({ 
      ...f, 
      summaryCounts: {}, 
      pointsByBreak: {} 
    })));
    setSmallestBreakContainingAll(null);
  };

  const handleCalculateStats = () => {
    if (serviceAreaGraphicsRef.current.length === 0) {
      alert('No service area polygons. Run analysis first.');
      return;
    }
    
    if (uploadedFiles.length === 0) {
      alert('No uploaded files.');
      return;
    }

    const polygons = serviceAreaGraphicsRef.current;
    const breakValues = [...new Set(polygons.map(p => p.attributes?.breakValue).filter((v): v is number => typeof v === 'number'))];
    
    // sort polygons by break value (smallest first) for exclusive assignment
    const sortedPolygons = [...polygons].sort((a, b) => 
      (a.attributes?.breakValue ?? 0) - (b.attributes?.breakValue ?? 0)
    );

    // calculate stats for each file
    const updatedFiles = uploadedFiles.map((file, fileIdx) => {
      const counts: Record<number, number> = Object.fromEntries(breakValues.map(b => [b, 0]));
      const pointsByBreak: Record<number, Array<{name: string, id: string | number}>> = Object.fromEntries(breakValues.map(b => [b, []]));
      
      const points = uploadedLocationGraphicsRef.current.filter(g => g.attributes?.fileIndex === fileIdx);

      // assign each point to the smallest polygon that contains it
      points.forEach((point, index) => {
        if (!point.geometry) return;

        for (const polygon of sortedPolygons) {
          const breakValue = polygon.attributes?.breakValue;
          if (typeof breakValue !== 'number' || !polygon.geometry) continue;

          if (containsOperator.execute(polygon.geometry, point.geometry)) {
            counts[breakValue]++;
            
            const attrs = point.attributes || {};
            const name = extractPointName(attrs, index);
            const id = extractPointId(attrs, index);
            
            pointsByBreak[breakValue].push({ name, id });
            break;
          }
        }
      });

      return {
        ...file,
        summaryCounts: counts,
        pointsByBreak
      };
    });

    setUploadedFiles(updatedFiles);

    // find smallest break where at least one point from EACH file is contained
    const sortedBreakValues = [...breakValues].sort((a, b) => a - b);
    
    let smallestBreakForAll: number | null = null;
    for (const breakValue of sortedBreakValues) {
      // check if every file has at least one point in this break or smaller
      const allFilesHavePoint = updatedFiles.every(file => {
        const pointsUpToThisBreak = breakValues
          .filter(b => b <= breakValue)
          .reduce((sum, b) => sum + (file.summaryCounts[b] || 0), 0);
        return pointsUpToThisBreak > 0;
      });
      
      if (allFilesHavePoint) {
        smallestBreakForAll = breakValue;
        break;
      }
    }
    
    setSmallestBreakContainingAll(smallestBreakForAll);
  };

  // render uploaded locations on the map (persists across all interactions)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // remove previous uploaded location graphics
    if (uploadedLocationGraphicsRef.current.length > 0) {
      view.graphics.removeMany(uploadedLocationGraphicsRef.current);
      uploadedLocationGraphicsRef.current = [];
    }

    if (uploadedFiles.length === 0) {
      setHasUploadedPoints(false);
      return;
    }

    // add uploaded location points from all files
    const graphics: Graphic[] = [];
    uploadedFiles.forEach((file, fileIdx) => {
      file.locations.forEach(location => {
        const ptGeom = new Point({
          longitude: location.longitude,
          latitude: location.latitude,
          spatialReference: view.spatialReference
        });

        const color = parseColorToArray(file.color);

        const graphic = new Graphic({
          geometry: ptGeom,
          symbol: {
            type: 'simple-marker',
            color: color,
            size: UPLOADED_POINT_SIZE,
            outline: {
              color: UPLOADED_POINT_OUTLINE_COLOR,
              width: UPLOADED_POINT_OUTLINE_WIDTH
            }
          } as any,
          attributes: {
            ...location.properties,
            fileIndex: fileIdx,
            fileName: file.name
          },
          popupTemplate: {
            title: location.properties?.AGENCY_NAME || location.properties?.name || 'Location',
            content: generatePointPopupContent(file.name, location.properties)
          }
        });

        graphics.push(graphic);
      });
    });
    
    view.graphics.addMany(graphics);
    uploadedLocationGraphicsRef.current = graphics;
    setHasUploadedPoints(graphics.length > 0);
  }, [uploadedFiles]);

  return (
    <>
      <style>{`
        details[open] > summary .arrow {
          transform: rotate(90deg);
        }
      `}</style>
      <div ref={mapDiv} className="map-container" />
      
      {/* Left Sidebar - Scrollable */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        bottom: '20px',
        width: '250px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '5px',
        zIndex: 1,
        scrollbarWidth: 'thin',
        scrollbarColor: 'transparent transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.scrollbarColor = '#888 #f1f1f1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.scrollbarColor = 'transparent transparent';
      }}
      >
        <ServiceAreaSettings
          isSelectionMode={isSelectionMode}
          travelModeName={travelModeName}
          numBreaks={numBreaks}
          breakSize={breakSize}
          onToggleSelectionMode={handleToggleSelectionMode}
          onTravelModeChange={setTravelModeName}
          onNumBreaksChange={setNumBreaks}
          onBreakSizeChange={setBreakSize}
          onRunAnalysis={handleUpdateMap}
        />

        <FileUpload
          uploadedFiles={uploadedFiles}
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
        />

        <SummaryStatistics
          uploadedFiles={uploadedFiles}
          hasServiceAreas={hasServiceAreas}
          hasUploadedPoints={hasUploadedPoints}
          smallestBreakContainingAll={smallestBreakContainingAll}
          onCalculateStats={handleCalculateStats}
        />
      </div>

      <Legend legendItems={legendItems} uploadedFiles={uploadedFiles} />
    </>
  );
}

export default ServiceArea;