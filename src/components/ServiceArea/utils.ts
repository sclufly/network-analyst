/**
 * Utility functions for ServiceArea component
 */

import { BASE_SERVICE_AREA_ALPHA } from './constants';
import type { LocationPoint } from './types';

/**
 * Calculate visual color based on opacity layering
 * Simulates the effect of multiple semi-transparent red polygons stacked on each other
 */
export function calculateLayeredColor(layerCount: number): string {
  const r = 255, g = 0, b = 0;
  
  // Calculate cumulative opacity when layering multiple semi-transparent polygons
  const cumulativeAlpha = 1 - Math.pow(1 - BASE_SERVICE_AREA_ALPHA, layerCount);
  
  // Blend with white background
  const finalR = Math.round(r * cumulativeAlpha + 255 * (1 - cumulativeAlpha));
  const finalG = Math.round(g * cumulativeAlpha + 255 * (1 - cumulativeAlpha));
  const finalB = Math.round(b * cumulativeAlpha + 255 * (1 - cumulativeAlpha));
  
  return `rgb(${finalR}, ${finalG}, ${finalB})`;
}

/**
 * Parse GeoJSON file and extract location points
 */
export function parseGeoJSONLocations(geojson: any): LocationPoint[] {
  const locations: LocationPoint[] = [];

  if (geojson.type === 'FeatureCollection' && geojson.features) {
    geojson.features.forEach((feature: any) => {
      if (feature.geometry && feature.geometry.coordinates) {
        const coords = feature.geometry.coordinates;
        // Handle different geometry types
        if (feature.geometry.type === 'Point') {
          locations.push({ 
            longitude: coords[0], 
            latitude: coords[1], 
            properties: feature.properties 
          });
        } else if (feature.geometry.type === 'MultiPoint') {
          coords.forEach((coord: number[]) => {
            locations.push({ 
              longitude: coord[0], 
              latitude: coord[1], 
              properties: feature.properties 
            });
          });
        }
      }
    });
  }

  return locations;
}

/**
 * Parse color string to array format for ArcGIS symbols
 */
export function parseColorToArray(colorString: string): number[] {
  const colorMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
  if (colorMatch) {
    return [
      parseInt(colorMatch[1]), 
      parseInt(colorMatch[2]), 
      parseInt(colorMatch[3]), 
      parseFloat(colorMatch[4] || '1')
    ];
  }
  return [0, 122, 194, 0.8]; // Default blue
}

/**
 * Extract a meaningful name from point attributes
 */
export function extractPointName(attrs: Record<string, any>, index: number): string {
  // Find any property with 'name' in the key (case-insensitive)
  const nameKey = Object.keys(attrs).find(key => key.toLowerCase().includes('name'));
  if (nameKey) {
    return String(attrs[nameKey]);
  }
  
  // Fallback to ID if no name property found
  const id = attrs.OBJECTID || attrs.id || attrs.ID || attrs._id || index + 1;
  return `Point ${id}`;
}

/**
 * Extract an ID from point attributes
 */
export function extractPointId(attrs: Record<string, any>, index: number): string | number {
  return attrs.OBJECTID || attrs.id || attrs.ID || attrs._id || index + 1;
}

/**
 * Generate popup content for an uploaded point
 */
export function generatePointPopupContent(fileName: string, properties?: Record<string, any>): string {
  let content = `<b>File:</b> ${fileName}<br>`;
  
  if (properties) {
    content += Object.entries(properties)
      .filter(([key]) => key !== 'OBJECTID' && key !== '_id')
      .map(([key, value]) => `<b>${key}:</b> ${value}`)
      .join('<br>');
  }
  
  return content;
}
