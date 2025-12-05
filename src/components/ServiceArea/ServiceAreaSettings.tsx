/**
 * Service Area Settings Component
 * Controls for configuring and running service area analysis
 */

import { MIN_BREAK_SIZE, MAX_BREAK_SIZE } from './constants';

interface ServiceAreaSettingsProps {
  isSelectionMode: boolean;
  travelModeName: string;
  numBreaks: number;
  breakSize: number;
  onToggleSelectionMode: () => void;
  onTravelModeChange: (mode: string) => void;
  onNumBreaksChange: (numBreaks: number) => void;
  onBreakSizeChange: (breakSize: number) => void;
  onRunAnalysis: () => void;
}

export function ServiceAreaSettings({
  isSelectionMode,
  travelModeName,
  numBreaks,
  breakSize,
  onToggleSelectionMode,
  onTravelModeChange,
  onNumBreaksChange,
  onBreakSizeChange,
  onRunAnalysis,
}: ServiceAreaSettingsProps) {
  return (
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
        onClick={onToggleSelectionMode}
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
          onChange={(e) => onTravelModeChange(e.target.value)}
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
          onChange={(e) => onNumBreaksChange(parseInt(e.target.value))}
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
          min={MIN_BREAK_SIZE}
          max={MAX_BREAK_SIZE}
          value={breakSize}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= MIN_BREAK_SIZE && value <= MAX_BREAK_SIZE) {
              onBreakSizeChange(value);
            }
          }}
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
        onClick={onRunAnalysis}
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
  );
}
