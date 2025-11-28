import { useEffect, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import esriConfig from '@arcgis/core/config';
import { ARCGIS_API_KEY } from '../config';

interface Facility {
  name: string;
  type: number;
  coords: [number, number];
  score?: number;
}

interface DemandPoint {
  name: string;
  weight: number;
  coords: [number, number];
}

interface Allocation {
  demandName: string;
  demandWeight: number;
  facilityName: string;
  demandCoords: [number, number];
  facilityCoords: [number, number];
}

interface FacilityStats {
  count: number;
  weight: number;
}

/**
 * Location Allocation Tool
 * Determines optimal facility locations to serve demand points
 */
function LocationAllocation() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const [results, setResults] = useState<{
    chosen: Facility[];
    stats: { [key: string]: FacilityStats };
    totalAllocations: number;
  } | null>(null);

  // Facilities data
  const facilitiesData: Facility[] = [
    { name: "Existing Location", type: 1, coords: [-122.333906, 47.609152] },
    { name: "Candidate 1", type: 0, coords: [-122.333585, 47.604501] },
    { name: "Candidate 2", type: 0, coords: [-122.334550, 47.605557] },
    { name: "Candidate 3", type: 0, coords: [-122.337753, 47.609442] },
    { name: "Candidate 4", type: 0, coords: [-122.335319, 47.607317] }
  ];

  // Demand points data
  const demandPointsData: DemandPoint[] = [
    { name: "Colman Building", weight: 1573, coords: [-122.335583, 47.603495] },
    { name: "Norton Parking Garage", weight: 1262, coords: [-122.33482, 47.603745] },
    { name: "DocuSign Tower", weight: 2385, coords: [-122.334151, 47.605060] },
    { name: "Fourth and Madison Building", weight: 1096, coords: [-122.333227, 47.605493] },
    { name: "Safeco Plaza", weight: 3618, coords: [-122.333899, 47.606190] },
    { name: "1201 Third Avenue", weight: 1782, coords: [-122.336163, 47.607204] },
    { name: "Puget Sound Plaza", weight: 2165, coords: [-122.335796, 47.608602] },
    { name: "Rainier Square", weight: 1316, coords: [-122.334881, 47.609021] },
    { name: "Century Square", weight: 1974, coords: [-122.337503, 47.610273] },
    { name: "Miken Building", weight: 3920, coords: [-122.336516, 47.609510] },
    { name: "Westlake Park", weight: 2467, coords: [-122.336353, 47.6110466] },
    { name: "U.S. Bank Centre", weight: 3997, coords: [-122.334571, 47.610492] },
    { name: "Westlake Center", weight: 2440, coords: [-122.337406, 47.611980] },
    { name: "Nordstrom Flagship Store", weight: 2438, coords: [-122.336295, 47.6123047] },
    { name: "Columbia Center", weight: 5400, coords: [-122.330746, 47.604502] },
    { name: "800 Fifth Avenue", weight: 3697, coords: [-122.330228, 47.605698] },
    { name: "Seattle Municipal Tower", weight: 2025, coords: [-122.329605, 47.605143] },
    { name: "Washington State Convention Center", weight: 1076, coords: [-122.331520, 47.611664] }
  ];

  useEffect(() => {
    if (!mapDiv.current) return;

    // Set API key
    esriConfig.apiKey = ARCGIS_API_KEY;

    const facilitiesLayer = new GraphicsLayer();
    const demandPointsLayer = new GraphicsLayer();
    const allocationLinesLayer = new GraphicsLayer();

    const map = new Map({
      basemap: "arcgis/streets",
      layers: [allocationLinesLayer, demandPointsLayer, facilitiesLayer],
    });

    const view = new MapView({
      container: mapDiv.current,
      map: map,
      center: [-122.333906, 47.607],
      zoom: 14,
      constraints: {
        snapToZoom: false,
      },
    });

    viewRef.current = view;

    view.when(async () => {
      addFacilityGraphics(facilitiesLayer);
      addDemandPointGraphics(demandPointsLayer);
      solveLocationAllocation(facilitiesLayer, allocationLinesLayer);
    });

    function addFacilityGraphics(layer: GraphicsLayer) {
      facilitiesData.forEach((facility) => {
        const graphic = new Graphic({
          geometry: {
            type: "point",
            longitude: facility.coords[0],
            latitude: facility.coords[1],
          },
          attributes: {
            Name: facility.name,
            FacilityType: facility.type
          },
          symbol: {
            type: "simple-marker",
            color: facility.type === 1 ? [0, 122, 194] : [200, 200, 200],
            size: facility.type === 1 ? 12 : 10,
            outline: {
              color: [255, 255, 255],
              width: 2
            }
          }
        });
        layer.add(graphic);
      });
    }

    function addDemandPointGraphics(layer: GraphicsLayer) {
      demandPointsData.forEach((demand) => {
        const graphic = new Graphic({
          geometry: {
            type: "point",
            longitude: demand.coords[0],
            latitude: demand.coords[1],
          },
          attributes: {
            Name: demand.name,
            Weight: demand.weight
          },
          symbol: {
            type: "simple-marker",
            color: [255, 100, 100],
            size: 6,
            outline: {
              color: [255, 255, 255],
              width: 1
            }
          }
        });
        layer.add(graphic);
      });
    }

    function solveLocationAllocation(facilitiesLayer: GraphicsLayer, allocationLinesLayer: GraphicsLayer) {
      // Calculate which candidates would serve the most demand
      const candidates = facilitiesData.filter(f => f.type === 0);
      const existing = facilitiesData.filter(f => f.type === 1);
      
      // Score each candidate based on total weighted demand within range
      const scores = candidates.map(candidate => {
        let totalWeight = 0;
        demandPointsData.forEach(demand => {
          const dist = calculateDistance(candidate.coords, demand.coords);
          if (dist < 0.02) { // roughly 2km
            totalWeight += demand.weight;
          }
        });
        return { ...candidate, score: totalWeight };
      });
      
      // Select top 2 candidates
      scores.sort((a, b) => b.score! - a.score!);
      const chosen = [...existing, scores[0], scores[1]];
      
      // Allocate each demand point to nearest chosen facility
      const allocations: Allocation[] = [];
      demandPointsData.forEach(demand => {
        let nearest: Facility | null = null;
        let minDist = Infinity;
        
        chosen.forEach(facility => {
          const dist = calculateDistance(facility.coords, demand.coords);
          if (dist < minDist) {
            minDist = dist;
            nearest = facility;
          }
        });
        
        if (nearest) {
          const nearestFacility: Facility = nearest;
          allocations.push({
            demandName: demand.name,
            demandWeight: demand.weight,
            facilityName: nearestFacility.name,
            demandCoords: demand.coords,
            facilityCoords: nearestFacility.coords
          });
        }
      });
      
      displayResults(chosen, allocations, facilitiesLayer, allocationLinesLayer);
    }
    
    function calculateDistance(coord1: [number, number], coord2: [number, number]) {
      const dx = coord1[0] - coord2[0];
      const dy = coord1[1] - coord2[1];
      return Math.sqrt(dx * dx + dy * dy);
    }

    function displayResults(
      chosenFacilities: Facility[], 
      allocations: Allocation[], 
      facilitiesLayer: GraphicsLayer, 
      allocationLinesLayer: GraphicsLayer
    ) {
      // Clear previous allocation lines
      allocationLinesLayer.removeAll();

      // Update facility graphics based on results
      facilitiesLayer.removeAll();
      
      chosenFacilities.forEach((facility) => {
        const graphic = new Graphic({
          geometry: {
            type: "point",
            longitude: facility.coords[0],
            latitude: facility.coords[1],
          },
          attributes: {
            Name: facility.name,
            FacilityType: facility.type
          },
          symbol: {
            type: "simple-marker",
            color: [0, 255, 0],
            size: 14,
            outline: {
              color: [255, 255, 255],
              width: 2
            }
          }
        });
        facilitiesLayer.add(graphic);
      });
      
      // Show facilities that weren't chosen as gray
      facilitiesData.forEach((facility) => {
        if (!chosenFacilities.find(f => f.name === facility.name)) {
          const graphic = new Graphic({
            geometry: {
              type: "point",
              longitude: facility.coords[0],
              latitude: facility.coords[1],
            },
            attributes: {
              Name: facility.name,
              FacilityType: facility.type
            },
            symbol: {
              type: "simple-marker",
              color: [200, 200, 200],
              size: 10,
              outline: {
                color: [255, 255, 255],
                width: 2
              }
            }
          });
          facilitiesLayer.add(graphic);
        }
      });

      // Show allocation lines
      allocations.forEach((allocation) => {
        const graphic = new Graphic({
          geometry: {
            type: "polyline",
            paths: [[
              allocation.demandCoords,
              allocation.facilityCoords
            ]]
          },
          symbol: {
            type: "simple-line",
            color: [50, 150, 255, 0.3],
            width: 1
          },
          attributes: allocation
        });
        allocationLinesLayer.add(graphic);
      });

      // Calculate summary stats
      const facilityStats: { [key: string]: FacilityStats } = {};
      allocations.forEach(alloc => {
        if (!facilityStats[alloc.facilityName]) {
          facilityStats[alloc.facilityName] = { count: 0, weight: 0 };
        }
        facilityStats[alloc.facilityName].count++;
        facilityStats[alloc.facilityName].weight += alloc.demandWeight;
      });

      setResults({
        chosen: chosenFacilities,
        stats: facilityStats,
        totalAllocations: allocations.length
      });
    }

    // Cleanup
    return () => {
      view.destroy();
    };
  }, []);

  return (
    <>
      <div ref={mapDiv} className="map-container" />
      {results && (
        <div className="info-panel">
          <h3>Location Allocation Results</h3>
          <p className="info-text">Simplified distance-based allocation algorithm</p>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Chosen Facilities:</strong>
            {results.chosen.map(facility => {
              const stats = results.stats[facility.name] || { count: 0, weight: 0 };
              return (
                <div key={facility.name} className="facility-item">
                  <strong>{facility.name}</strong><br />
                  Demand Count: {stats.count}<br />
                  Demand Weight: {Math.round(stats.weight).toLocaleString()}
                </div>
              );
            })}
          </div>

          <div>
            <strong>Total Allocations:</strong> {results.totalAllocations} connections
          </div>
        </div>
      )}
    </>
  );
}

export default LocationAllocation;
