/**
 * Summary Statistics Component
 * Displays statistics about points within service areas
 */

import type { UploadedFile } from './types';

interface SummaryStatisticsProps {
  uploadedFiles: UploadedFile[];
  hasServiceAreas: boolean;
  hasUploadedPoints: boolean;
  smallestBreakContainingAll: number | null;
  onCalculateStats: () => void;
}

export function SummaryStatistics({
  uploadedFiles,
  hasServiceAreas,
  hasUploadedPoints,
  smallestBreakContainingAll,
  onCalculateStats,
}: SummaryStatisticsProps) {
  const hasStats = uploadedFiles.some(f => Object.keys(f.summaryCounts).length > 0);

  return (
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
        onClick={onCalculateStats}
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

      {!hasStats ? (
        <div style={{ fontSize: '13px' }}>Click Calculate Stats to see results.</div>
      ) : (
        <>
          {uploadedFiles.map((file, fileIndex) => {
            const fileHasStats = Object.keys(file.summaryCounts).length > 0;
            if (!fileHasStats) return null;

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
  );
}
