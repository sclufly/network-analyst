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
  
  const [numBreaks, setNumBreaks] = useState<number>(3);
  const [breakSize, setBreakSize] = useState<number>(5);
  const [travelModeName, setTravelModeName] = useState<string>("Driving Time");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string;
    locations: any[];
    color: string;
    summaryCounts: Record<number, number>;
    pointsByBreak: Record<number, Array<{name: string, id: string | number}>>;
  }>>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [smallestBreakContainingAll, setSmallestBreakContainingAll] = useState<number | null>(null);
  const [hasServiceAreas, setHasServiceAreas] = useState<boolean>(false);
  const [hasUploadedPoints, setHasUploadedPoints] = useState<boolean>(false);
  const [legendItems, setLegendItems] = useState<Array<{breakValue: number, color: string}>>([]);
  
  const url = "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World";

  // color palette for different uploaded files
  const fileColors = [
    'rgba(0, 122, 194, 0.8)',    // blue
    'rgba(76, 175, 80, 0.8)',    // green
    'rgba(255, 152, 0, 0.8)',    // orange
    'rgba(156, 39, 176, 0.8)',   // purple
    'rgba(255, 150, 190, 0.8)',  // pink
  ];

  // calculate visual color based on opacity layering
  const calculateLayeredColor = (layerCount: number): string => {
    // base color: rgba(255, 0, 0, 0.25)
    const baseAlpha = 0.25;
    const r = 255, g = 0, b = 0;
    
    // calculate cumulative opacity when layering multiple semi-transparent polygons
    const cumulativeAlpha = 1 - Math.pow(1 - baseAlpha, layerCount);
    
    // blend with white background
    const finalR = Math.round(r * cumulativeAlpha + 255 * (1 - cumulativeAlpha));
    const finalG = Math.round(g * cumulativeAlpha + 255 * (1 - cumulativeAlpha));
    const finalB = Math.round(b * cumulativeAlpha + 255 * (1 - cumulativeAlpha));
    
    return `rgb(${finalR}, ${finalG}, ${finalB})`;
  };

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
    clickMarkerRef.current = locationGraphic;

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
      const features = result.serviceAreaPolygons.features || [];
      const graphics = [] as any[];
      features.forEach((g, i) => {
        const geomType = g.geometry?.type;
        if (!geomType || geomType.toLowerCase() !== 'polygon') {
          return;
        }

        g.symbol = {
          type: "simple-fill",
          color: "rgba(255, 0, 0, 0.25)",
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
            color: "yellow",
            size: 10,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        const locations: any[] = [];

        if (geojson.type === 'FeatureCollection' && geojson.features) {
          geojson.features.forEach((feature: any) => {
            if (feature.geometry && feature.geometry.coordinates) {
              const coords = feature.geometry.coordinates;
              // handle different geometry types
              if (feature.geometry.type === 'Point') {
                locations.push({ longitude: coords[0], latitude: coords[1], properties: feature.properties });
              } else if (feature.geometry.type === 'MultiPoint') {
                coords.forEach((coord: number[]) => {
                  locations.push({ longitude: coord[0], latitude: coord[1], properties: feature.properties });
                });
              }
            }
          });
        }

        const color = fileColors[uploadedFiles.length % fileColors.length];
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
            
            // extract name/ID from point attributes
            const attrs = point.attributes || {};
            
            // find any property with 'name' in the key (case-insensitive)
            let name = '';
            const nameKey = Object.keys(attrs).find(key => key.toLowerCase().includes('name'));
            if (nameKey) {
              name = String(attrs[nameKey]);
            } else {
              // fallback to ID if no name property found
              const id = attrs.OBJECTID || attrs.id || attrs.ID || attrs._id || index + 1;
              name = `Point ${id}`;
            }
            
            const id = attrs.OBJECTID || attrs.id || attrs.ID || attrs._id || index + 1;
            
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

        // Parse color string to array format
        const colorMatch = file.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
        const color = colorMatch ? 
          [parseInt(colorMatch[1]), parseInt(colorMatch[2]), parseInt(colorMatch[3]), parseFloat(colorMatch[4] || '1')] :
          [0, 122, 194, 0.8];

        const graphic = new Graphic({
          geometry: ptGeom,
          symbol: {
            type: 'simple-marker',
            color: color,
            size: 10,
            outline: {
              color: [255, 255, 255],
              width: 2
            }
          } as any,
          attributes: {
            ...location.properties,
            fileIndex: fileIdx,
            fileName: file.name
          },
          popupTemplate: {
            title: location.properties?.AGENCY_NAME || location.properties?.name || 'Location',
            content: `<b>File:</b> ${file.name}<br>` + 
              (location.properties ? Object.entries(location.properties)
                .filter(([key]) => key !== 'OBJECTID' && key !== '_id')
                .map(([key, value]) => `<b>${key}:</b> ${value}`)
                .join('<br>') : '')
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
        {/* Service Area Settings */}
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          Service Area Settings
        </div>
        
        <button
          onClick={handleToggleSelectionMode}
          style={{
            padding: '8px 12px',
            width: '100%',
            backgroundColor: isSelectionMode ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}
        >
          {isSelectionMode ? 'Selection Mode Active' : 'Select Location'}
        </button>

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
          Run Analysis
        </button>
        </div>

        {/* Upload Locations */}
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          Upload Locations
        </div>
        
        <div>
          <input
            type="file"
            accept=".geojson,.json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-upload-input"
          />
          <label htmlFor="file-upload-input">
            <button
              onClick={() => document.getElementById('file-upload-input')?.click()}
              style={{
                padding: '8px 12px',
                width: '100%',
                backgroundColor: '#0079c1',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}
            >
              Add GeoJSON File
            </button>
          </label>
          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {uploadedFiles.map((file, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px', 
                  marginBottom: '4px',
                  backgroundColor: '#e8f4f8', 
                  borderRadius: '3px', 
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: file.color,
                      border: '1px solid white',
                      borderRadius: '50%',
                      marginRight: '6px',
                      flexShrink: 0,
                      boxShadow: '0 0 0 1px #ddd'
                    }} />
                    <span style={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={file.name}>
                      {file.name} ({file.locations.length})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Summary */}
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
          Summary Statistics
        </div>

        <button
          onClick={handleCalculateStats}
          disabled={!hasServiceAreas || !hasUploadedPoints}
          style={{
            padding: '6px 10px',
            width: '100%',
            backgroundColor: (hasServiceAreas && hasUploadedPoints) ? '#0079c1' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: (hasServiceAreas && hasUploadedPoints) ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}
        >
          Calculate Stats
        </button>

        {uploadedFiles.length === 0 || uploadedFiles.every(f => Object.keys(f.summaryCounts).length === 0) ? (
          <div style={{ fontSize: '13px' }}>Click Calculate Stats to see results.</div>
        ) : (
          <>
            {uploadedFiles.map((file, fileIndex) => {
              const hasStats = Object.keys(file.summaryCounts).length > 0;
              if (!hasStats) return null;

              return (
                <div key={fileIndex} style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#0079c1',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: file.color,
                      border: '1px solid white',
                      borderRadius: '50%',
                      marginRight: '6px',
                      flexShrink: 0,
                      boxShadow: '0 0 0 1px #ddd'
                    }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                      {file.name}
                    </span>
                  </div>

                  {Object.keys(file.summaryCounts).sort((a, b) => parseInt(a) - parseInt(b)).map((k) => {
                    const breakValue = parseInt(k, 10);
                    const count = file.summaryCounts[breakValue];
                    const points = file.pointsByBreak[breakValue] || [];
                    
                    return (
                      <div key={k} style={{ marginBottom: '8px', marginLeft: '18px' }}>
                        {count > 0 ? (
                          <details style={{ cursor: 'pointer' }}>
                            <summary style={{ 
                              fontSize: '13px', 
                              fontWeight: 'bold',
                              color: '#333',
                              listStyle: 'none',
                              userSelect: 'none',
                              display: 'flex',
                              alignItems: 'center'
                            }}>
                              <span className="arrow" style={{ fontSize: '11px', color: '#666', marginRight: '6px', transition: 'transform 0.2s' }}>▶</span>
                              <span>≤ {breakValue} min ({count} point{count !== 1 ? 's' : ''})</span>
                            </summary>
                            <div style={{ fontSize: '12px', paddingLeft: '20px', paddingTop: '4px', color: '#555' }}>
                              {points.map((point, idx) => (
                                <div key={idx} style={{ marginBottom: '2px' }}>
                                  • {point.name} (ID: {point.id})
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : (
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: 'bold',
                            color: '#333'
                          }}>
                            ≤ {breakValue} min ({count} point{count !== 1 ? 's' : ''})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee', fontWeight: 'bold', fontSize: '13px', color: '#0079c1' }}>
              {smallestBreakContainingAll ? `Smallest break with at least one point from each file: ${smallestBreakContainingAll} minutes` : 'Not all files have points within service areas'}
            </div>
          </>
        )}
        </div>
      </div>

      {/* Legend - Top Right */}
      {(legendItems.length > 0 || uploadedFiles.length > 0) && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          zIndex: 1,
          minWidth: '200px',
          maxWidth: '250px'
        }}>
          <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '14px' }}>
            Legend
          </div>
          
          {legendItems.length > 0 && (
            <>
              <div style={{ fontSize: '12px', marginBottom: '6px', color: '#666', fontWeight: '600' }}>
                Service Areas
              </div>
              {legendItems.map((item) => (
                <div key={item.breakValue} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '6px',
                  fontSize: '13px'
                }}>
                  <div style={{
                    width: '30px',
                    height: '20px',
                    backgroundColor: item.color,
                    border: '1px solid #ddd',
                    marginRight: '8px',
                    borderRadius: '2px',
                    flexShrink: 0
                  }} />
                  <span>≤ {item.breakValue} min</span>
                </div>
              ))}
            </>
          )}
          
          {uploadedFiles.length > 0 && (
            <>
              <div style={{ 
                fontSize: '12px', 
                marginTop: legendItems.length > 0 ? '12px' : '0',
                marginBottom: '6px', 
                color: '#666',
                fontWeight: '600'
              }}>
                Uploaded Files
              </div>
              {uploadedFiles.map((file, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '6px',
                  fontSize: '13px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: file.color,
                    border: '2px solid white',
                    borderRadius: '50%',
                    marginRight: '8px',
                    marginLeft: '9px',
                    flexShrink: 0,
                    boxShadow: '0 0 0 1px #ddd'
                  }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                    {file.name} ({file.locations.length})
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

export default ServiceArea;