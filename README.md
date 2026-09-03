# FG Nexus

[![CI](https://github.com/philip2012/FGNexus/actions/workflows/ci.yml/badge.svg)](https://github.com/philip2012/FGNexus/actions/workflows/ci.yml)

An all-in-one web companion platform for the open-source flight simulator, FlightGear.

FG Nexus is an independent, open-source project focused on providing a modern web interface for interacting with and extending an active FlightGear session.

The long-term goal is to bring live telemetry, maps, flight planning, multiplayer tools, aircraft utilities, ATC, logging, developer tools, and other companion features into one unified application.

> [!NOTE]
> FG Nexus is currently in early pre-alpha development. The telemetry dashboard is functional, but most planned features have not yet been implemented.

## Goals

FG Nexus is built around these core ideas:

> ✈️ **FlightGear-First**
> Built natively around FlightGear's ecosystem rather than treating it as an afterthought.
>
> 🌐 **Web-Based & Cross-Device**
> Designed to run through a browser across desktop, tablet, and mobile devices.
>
> ⚡ **Real-Time Integration**
> Designed for bi-directional data synchronization with active FlightGear sessions.
>
> 🧩 **Modular & Open-Source**
> Fully open-source architecture designed for modular expansion and future extensibility.

## Planned Features

**Core Navigation & Flight**
`Live Telemetry` • `Moving Map` • `Flight Planning` • `Airport & Nav Info`

**Cockpit & Aircraft Controls**
`Radio Management` • `Autopilot Monitoring & Control` • `Aircraft Utilities` • `Weight & Balance` • `Checklists`

**Environment & Session**
`Weather & Environment` • `Multiplayer Traffic` • `Flight Logging` • `Failure Management`

**Integrations & Dev Tools**
`Virtual Airline Tools` • `SimBrief Integration` • `Property-Tree Tools` • `AI-Assisted ATC`

> [!NOTE]
> The planned feature set may change as the project continues to develop.

## Current Features

The current pre-alpha implementation includes:

- Live FlightGear telemetry through the PropertyListener WebSocket interface
- Initial property hydration through FlightGear's HTTP property API
- Primary flight, motion, position, and environment telemetry panels
- Connection lifecycle states including connecting, connected, disconnecting, disconnected, and error
- Automatic reconnection after unexpected FlightGear disconnects
- Manual cancellation of reconnection attempts
- Telemetry freshness monitoring and stale-data detection
- Automatic clearing of unavailable or disconnected telemetry
- Aviation-style heading and track formatting
- Geographic coordinate formatting with N/S/E/W hemisphere indicators
- Responsive telemetry dashboard layout
- Unit-tested telemetry presentation and formatting

## Current Stack

The application currently uses:

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Tailwind CSS
- Vitest
- Vue Test Utils
- ESLint / Oxlint
- Prettier

Additional backend and FlightGear integration technologies will be introduced as the project expands.

## Development

### Requirements

**Includes:** Node.js 22.18+ within the Node 22 release line, or Node.js 24.12+, npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

### Type-check the project

```bash
npm run type-check
```

### Lint the project

```bash
npm run lint
```

### Run unit tests

```bash
npm run test:unit -- --run
```

### Build for production

```bash
npm run build
```

### Run all validation checks

Before pushing changes, run the complete local validation gate:

```bash
npm run check
```

This checks formatting, TypeScript types, lint rules, unit tests, and the production build.

### Format the codebase

```bash
npm run format
```

> [!NOTE]
> Additional commands are available in `package.json`.

## Project Status

### Pre-alpha

FG Nexus has completed its first functional telemetry-dashboard milestone.

The current application can connect directly to a running FlightGear instance, retrieve an initial telemetry snapshot, receive live property updates, monitor telemetry freshness, and recover automatically from unexpected connection loss.

Current telemetry includes:

- Altitude
- Indicated airspeed
- Mach
- Magnetic heading
- Groundspeed
- Vertical speed
- Pitch
- Roll
- Latitude and longitude
- Ground track
- Wind direction and speed
- Outside air temperature

The current direct browser-to-FlightGear connection is an early prototype and is not intended to represent the final networking architecture.

Future work will expand beyond telemetry into navigation, maps, flight planning, aircraft controls, multiplayer functionality, developer tooling, and other FlightGear companion features.

## Current FlightGear Integration

The telemetry prototype currently communicates directly with FlightGear:

```text
FG Nexus Web
    │
    ├── HTTP property API
    │     Initial telemetry hydration
    │
    └── PropertyListener WebSocket
          Live property updates
    │
    ▼
FlightGear
```

FlightGear must currently be running with its HTTP server enabled, for example:

```bash
fgfs --httpd=5480
```

The application connects to the local FlightGear PropertyListener endpoint and subscribes to supported property-tree nodes.

This direct connection is intended primarily for early development and validation of the telemetry architecture.

## Architecture Direction

FG Nexus is expected to evolve into multiple layers:

```text
FG Nexus Web
    │
    │ REST / WebSocket
    ▼
FG Nexus Services
    │
    ▼
Local FlightGear Bridge
    │
    ▼
FlightGear
```

The planned local bridge is intended to handle simulator telemetry, FlightGear property access, simulator commands, connection management, device discovery, and secure access from other devices.

Moving FlightGear communication behind a dedicated bridge will also allow FG Nexus to support functionality that is difficult or undesirable to expose directly through the browser.

## Testing

The project currently uses Vitest and Vue Test Utils.

Current tests cover the application shell and telemetry presentation behavior, including:

- Unavailable telemetry
- Signed telemetry values
- Aviation heading padding
- Geographic coordinate formatting
- Telemetry labels, units, and numeric rendering

Run the test suite with:

```bash
npm run test:unit -- --run
```

## Inspiration

FG Nexus was partly inspired by the modernization work in `t3r/smweb-vue`, which rebuilt FlightGear's scenery database web application using a modern Vue-based stack.

This got the project's author, Philips Nguyen, interested in applying his observations toward improving and expanding on FlightGear's Phi web interface, which led to the creation of FG Nexus.

FG Nexus is an independent project and is not an official FlightGear project.

## License

FG Nexus is licensed under the Apache License 2.0.

See [`LICENSE`](LICENSE) for the full license text.
