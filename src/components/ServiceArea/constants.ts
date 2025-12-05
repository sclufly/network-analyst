/**
 * Constants for ServiceArea component
 */

export const SERVICE_AREA_URL = 
  "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World";

export const DEFAULT_NUM_BREAKS = 3;
export const DEFAULT_BREAK_SIZE = 5;
export const DEFAULT_TRAVEL_MODE = "Driving Time";

export const MAP_CENTER: [number, number] = [-79.4163, 43.7001];
export const MAP_ZOOM = 13;

// Color palette for different uploaded files
export const FILE_COLORS = [
  'rgba(0, 122, 194, 0.8)',    // blue
  'rgba(76, 175, 80, 0.8)',    // green
  'rgba(255, 152, 0, 0.8)',    // orange
  'rgba(156, 39, 176, 0.8)',   // purple
  'rgba(255, 150, 190, 0.8)',  // pink
];

// Service area polygon styling
export const SERVICE_AREA_FILL_COLOR = "rgba(255, 0, 0, 0.25)";
export const BASE_SERVICE_AREA_ALPHA = 0.25;

// Marker styling
export const CLICK_MARKER_COLOR = "yellow";
export const CLICK_MARKER_SIZE = 10;
export const LOCATION_MARKER_COLOR = "white";
export const LOCATION_MARKER_SIZE = 8;
export const UPLOADED_POINT_SIZE = 10;
export const UPLOADED_POINT_OUTLINE_COLOR = [255, 255, 255];
export const UPLOADED_POINT_OUTLINE_WIDTH = 2;

// Break value constraints
export const MIN_BREAK_SIZE = 1;
export const MAX_BREAK_SIZE = 30;
