import { ARCGIS_API_KEY } from '../config.js';
import { initServiceArea } from './service-area.js';
import { initClosestFacility } from './closest-facility.js';
import { initLocationAllocation } from './location-allocation.js';

// Import ArcGIS modules
const [esriConfig] = await $arcgis.import(["@arcgis/core/config.js"]);

esriConfig.apiKey = ARCGIS_API_KEY;

// Current tool state
let currentTool = null;
let currentCleanup = null;

// Tool selector
const toolSelector = document.getElementById('toolSelector');
const viewDiv = document.getElementById('viewDiv');
const infoPanel = document.getElementById('infoPanel');

// Initialize the default tool
initTool('service-area');

// Listen for tool changes
toolSelector.addEventListener('change', (event) => {
  initTool(event.target.value);
});

async function initTool(toolName) {
  // Cleanup previous tool
  if (currentCleanup) {
    currentCleanup();
  }
  
  // Clear the view
  viewDiv.innerHTML = '';
  infoPanel.innerHTML = '';
  infoPanel.classList.remove('visible');
  
  currentTool = toolName;
  
  try {
    switch (toolName) {
      case 'service-area':
        currentCleanup = await initServiceArea(viewDiv, infoPanel);
        break;
      case 'closest-facility':
        currentCleanup = await initClosestFacility(viewDiv, infoPanel);
        break;
      case 'location-allocation':
        currentCleanup = await initLocationAllocation(viewDiv, infoPanel);
        infoPanel.classList.add('visible');
        break;
      default:
        console.error('Unknown tool:', toolName);
    }
  } catch (error) {
    console.error('Error initializing tool:', error);
    infoPanel.innerHTML = `<h3>Error</h3><p>${error.message}</p>`;
    infoPanel.classList.add('visible');
  }
}
