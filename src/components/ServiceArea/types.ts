/**
 * Type definitions for ServiceArea component
 */

export interface UploadedFile {
  name: string;
  locations: LocationPoint[];
  color: string;
  summaryCounts: Record<number, number>;
  pointsByBreak: Record<number, Array<{ name: string; id: string | number }>>;
}

export interface LocationPoint {
  longitude: number;
  latitude: number;
  properties?: Record<string, any>;
}

export interface LegendItem {
  breakValue: number;
  color: string;
}

export interface PointInfo {
  name: string;
  id: string | number;
}
