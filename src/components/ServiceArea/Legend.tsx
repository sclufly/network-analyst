/**
 * Legend Component
 * Displays legend for service areas and uploaded files
 */

import type { LegendItem, UploadedFile } from './types';

interface LegendProps {
  legendItems: LegendItem[];
  uploadedFiles: UploadedFile[];
}

export function Legend({ legendItems, uploadedFiles }: LegendProps) {
  if (legendItems.length === 0 && uploadedFiles.length === 0) {
    return null;
  }

  return (
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
  );
}
