# FG Nexus

An all-in-one web companion platform for the open-source flight simulator, FlightGear.

FG Nexus is an independent, open-source project with the purpose of providing a modern web interface for interacting with and extending a FlightGear session.

The long-term goal is to add live telemetry, maps, flight planning, multiplayer tools, aircraft utilities, ATC, logging, and other companion features into one unified application.

> [!NOTE]
> FG Nexus is currently in early development. Most planned features are not implemented at the moment.

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
> The current feature set may change as the project continues to develop further.

## Current Stack

The initial application uses:

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Vitest
- ESLint / Oxlint
- Prettier

Additional backend and FlightGear integration technologies will be introduced if needed.

## Development

### Requirements

**Includes:** Node.js 20.19+ or 22.12+, npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

### Format the codebase

```bash
npm run format
```

> [!NOTE]
> Additional commands are available in `package.json`.

## Project Status

### Pre-alpha

Our current milestone is establishing the Vue application structure and building the first telemetry dashboard.

Live FlightGear integration will be introduced after the initial frontend is in place and functional.

## Architecture Direction

FG Nexus is expected to evolve into three main layers:

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

The local bridge is intended to handle simulator telemetry, FlightGear property access, simulator commands, connection management, and secure access from other devices.

## Inspiration

FG Nexus was partly inspired by the modernization work in `t3r/smweb-vue`, which rebuilt FlightGear's scenery database web application using a modern Vue-based stack.

This got the project's author, Philips Nguyen, interested in applying his observations toward improving and expanding on FlightGear's Phi web interface, which led to the creation of FG Nexus.

## License

FG Nexus is licensed under the Apache License 2.0.

See [`LICENSE`](LICENSE) for the full license text.
