import { useState } from 'react';
import ServiceArea from './components/ServiceArea';
import ClosestFacility from './components/ClosestFacility';
import LocationAllocation from './components/LocationAllocation';
import './App.css';

type Tool = 'service-area' | 'closest-facility' | 'location-allocation';

function App() {
  const [selectedTool, setSelectedTool] = useState<Tool>('service-area');

  return (
    <div className="app">
      <header className="header">
        <h1>🗺️</h1>
        <select
          id="toolSelector"
          value={selectedTool}
          onChange={(e) => setSelectedTool(e.target.value as Tool)}
        >
          <option value="service-area">Service Area</option>
          <option value="closest-facility">Closest Facility</option>
          <option value="location-allocation">Location Allocation</option>
        </select>
      </header>

      <div className="content">
        {selectedTool === 'service-area' && <ServiceArea />}
        {selectedTool === 'closest-facility' && <ClosestFacility />}
        {selectedTool === 'location-allocation' && <LocationAllocation />}
      </div>
    </div>
  );
}

export default App;
