/**
 * File Upload Component
 * Handles GeoJSON file uploads for location points
 */

import type { UploadedFile } from './types';

interface FileUploadProps {
  uploadedFiles: UploadedFile[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
}

export function FileUpload({ uploadedFiles, onFileUpload, onRemoveFile }: FileUploadProps) {
  return (
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
          onChange={onFileUpload}
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
                  onClick={() => onRemoveFile(index)}
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
  );
}
