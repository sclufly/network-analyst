# Network Analyst - ArcGIS Tools

A modern React web application combining multiple ArcGIS network analysis tools into a single, cohesive interface. Built with React, TypeScript, and Vite.

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
├── index.html                      # HTML template
├── package.json                    # NPM dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite bundler configuration
├── src/
│   ├── App.tsx                     # Main React component with tool selector
│   ├── index.tsx                   # React application entry point
│   ├── config.ts                   # ArcGIS API key configuration
│   ├── App.css                     # Application styles
│   └── components/
│       ├── ServiceArea.tsx         # Service Area analysis component
│       ├── ClosestFacility.tsx     # Closest Facility routing component
│       └── LocationAllocation.tsx  # Location Allocation component
├── html/                           # Original standalone HTML files (archived)
│   ├── ServiceArea.html
│   ├── ClosestFacility.html
│   └── LocationAllocation.html
└── js/                             # Original JavaScript modules (archived)
    ├── main.js
    ├── service-area.js
    ├── closest-facility.js
    └── location-allocation.js
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn package manager

### Installation

1. **Clone the repository and install dependencies**
   ```bash
   npm install
   ```

2. **Set up your ArcGIS API Key**
   - Edit `src/config.ts` and add your ArcGIS API key:
   ```typescript
   export const ARCGIS_API_KEY = 'your-api-key-here';
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   The application will start at `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   ```
   The optimized production build will be created in the `dist/` folder.

5. **Preview production build**
   ```bash
   npm run preview
   ```

## How It Works

The application uses a React component-based architecture:

- **App.tsx**: Main application component with tool selector dropdown and routing logic
- **React Components**: Each analysis type is a self-contained React component:
  - `ServiceArea.tsx`: Service area analysis with drive time visualization
  - `ClosestFacility.tsx`: Closest facility routing with grocery store locations
  - `LocationAllocation.tsx`: Optimal facility location analysis
- **Component Lifecycle**: Each component manages its own:
  - ArcGIS map view initialization and cleanup
  - Event handlers and user interactions
  - State management with React hooks

When you switch tools via the dropdown:
1. The current component is unmounted and runs cleanup in `useEffect`
2. The previous map view is properly destroyed
3. The new component is mounted and initializes a fresh map instance

## Technologies Used

- **React 18**: Component-based UI framework
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **ArcGIS Maps SDK for JavaScript 4.34**: Mapping and spatial analysis
- **ArcGIS REST Services**: Network analysis services (routing, service areas, location-allocation)

## Future Enhancements

Potential improvements:
- Add user controls for customizing analysis parameters (drive times, number of facilities, etc.)
- Save and export analysis results
- Support custom facility and demand point inputs
- Additional network analysis types (vehicle routing, origin-destination cost matrix)
