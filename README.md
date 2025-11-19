# Network Analyst - ArcGIS Tools

A unified web application combining multiple ArcGIS network analysis tools into a single, cohesive interface.

## Features

The application provides three powerful network analysis tools:

### 1. Service Area Analysis
- Visualizes areas reachable from a selected point within specified drive times (5, 10, 15, 20 minutes)
- Click anywhere on the map to analyze service areas from that location
- Uses ArcGIS routing services for accurate drive time calculations

### 2. Closest Facility Routing
- Finds the 3 closest facilities from any clicked location
- Displays optimal routes to each facility
- Pre-loaded with grocery store locations in Portland, Oregon
- Interactive map with facility markers

### 3. Location Allocation
- Determines optimal facility locations to serve demand points
- Analyzes candidate locations and selects the best ones based on demand coverage
- Visualizes allocation lines showing which facilities serve which demand points
- Displays summary statistics in an information panel
- Focused on downtown Seattle with realistic building data

## Project Structure

```
network-analyst/
├── index.html                      # Main entry point with dropdown selector
├── config.js                       # ArcGIS API key configuration
├── js/
│   ├── main.js                     # Application controller and tool switcher
│   ├── service-area.js            # Service Area analysis module
│   ├── closest-facility.js        # Closest Facility routing module
│   └── location-allocation.js     # Location Allocation module
└── javascript/                     # Original individual HTML files (archived)
    ├── ServiceArea.html
    ├── ClosestFacility.html
    └── LocationAllocation.html
```

## Getting Started

1. **Set up your ArcGIS API Key**
   - Edit `config.js` and add your ArcGIS API key:
   ```javascript
   export const ARCGIS_API_KEY = 'your-api-key-here';
   ```

2. **Run a local server**
   - The application requires a web server due to ES6 module imports
   - Using Python:
     ```bash
     python -m http.server 8000
     ```
   - Using Node.js:
     ```bash
     npx http-server -p 8000
     ```

3. **Open in browser**
   - Navigate to `http://localhost:8000/index.html`
   - Use the dropdown menu to switch between tools

## How It Works

The application uses a modular architecture:

- **index.html**: Provides the UI shell with a header, dropdown selector, and map container
- **main.js**: Manages tool switching and cleanup between different analysis modes
- **Tool modules**: Each analysis type is encapsulated in its own module that:
  - Initializes the map and required ArcGIS components
  - Sets up event handlers and user interactions
  - Returns a cleanup function to properly dispose of resources

When you switch tools via the dropdown:
1. The previous tool's cleanup function is called
2. The map view is destroyed and cleared
3. The new tool is initialized with a fresh map instance

## Technologies Used

- **ArcGIS Maps SDK for JavaScript 4.34**: Mapping and spatial analysis
- **ES6 Modules**: Modular JavaScript architecture
- **ArcGIS REST Services**: Network analysis services (routing, service areas, location-allocation)

## Original Files

The original standalone HTML files are preserved in the `javascript/` folder for reference. The new modular structure extracts the JavaScript code into separate modules for better organization and maintainability.

## Future Enhancements

Potential improvements:
- Add user controls for customizing analysis parameters (drive times, number of facilities, etc.)
- Save and export analysis results
- Support custom facility and demand point inputs
- Additional network analysis types (vehicle routing, origin-destination cost matrix)
- Offline mode with local data
