export interface FlightGearPropertyMessage {
  path: string
  value: unknown
}

export type FlightGearPropertyValue = string | number | boolean

export interface FlightGearConnectionHandlers {
  onOpen: () => void
  onMessage: (message: FlightGearPropertyMessage) => void
  onClose: () => void
  onError: (error: Event) => void
  onParseError?: (error: unknown) => void
}

export interface FlightGearPropertyNode {
  path: string
  name: string
  type: string
  index: number
  nChildren: number
  value?: unknown
  children?: FlightGearPropertyNode[]
}

function normalizePropertyPath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path
}

export interface FlightGearPropertyConnection {
  readonly isOpen: boolean

  subscribe(path: string): void
  unsubscribe(path: string): void
  request(path: string): void
  set(path: string, value: FlightGearPropertyValue): void
  close(): void
}

export interface FlightGearAirportSummary {
  id: string
  name: string
}

export interface FlightGearAirportRunway {
  id: string
  lengthM: number
  widthM: number
  surface: string
  headingDeg: number
}

export interface FlightGearAirportComm {
  id: string
  mhz: number
}

export interface FlightGearAirport {
  id: string
  name: string
  latitudeDeg: number
  longitudeDeg: number
  elevationM: number
  runways: FlightGearAirportRunway[]
  longestRunwayLengthM: number
  longestRunwayHeadingDeg: number
  longestRunwaySurface: string
  hasMetar: boolean
  comms: FlightGearAirportComm[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseAirportSummary(value: unknown): FlightGearAirportSummary {
  if (typeof value !== 'string') {
    throw new Error('FlightGear returned an invalid airport index entry')
  }

  const match = value.match(/^\s*(.*?)\s+\(([^()]+)\)\s*$/)

  if (!match) {
    throw new Error(`FlightGear returned an invalid airport index entry: ${value}`)
  }

  return {
    name: match[1]?.trim() ?? '',
    id: match[2]?.trim() ?? '',
  }
}

function parseAirportRunway(value: unknown): FlightGearAirportRunway {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.length_m !== 'number' ||
    typeof value.width_m !== 'number' ||
    typeof value.surface !== 'string' ||
    typeof value.heading_deg !== 'number'
  ) {
    throw new Error('FlightGear returned an invalid airport runway')
  }

  return {
    id: value.id,
    lengthM: value.length_m,
    widthM: value.width_m,
    surface: value.surface,
    headingDeg: value.heading_deg,
  }
}

function parseAirportComm(value: unknown): FlightGearAirportComm {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.mhz !== 'number') {
    throw new Error('FlightGear returned an invalid airport communication frequency')
  }

  return {
    id: value.id,
    mhz: value.mhz,
  }
}

function parseAirport(data: unknown): FlightGearAirport {
  if (!isRecord(data) || !Array.isArray(data.features) || data.features.length !== 1) {
    throw new Error('FlightGear returned an invalid airport response')
  }

  const feature = data.features[0]

  if (
    !isRecord(feature) ||
    !isRecord(feature.properties) ||
    !isRecord(feature.geometry) ||
    feature.geometry.type !== 'GeometryCollection' ||
    !Array.isArray(feature.geometry.geometries)
  ) {
    throw new Error('FlightGear returned an invalid airport feature')
  }

  const properties = feature.properties
  const referencePoint = feature.geometry.geometries[0]

  if (
    !isRecord(referencePoint) ||
    referencePoint.type !== 'Point' ||
    !Array.isArray(referencePoint.coordinates) ||
    typeof referencePoint.coordinates[0] !== 'number' ||
    typeof referencePoint.coordinates[1] !== 'number' ||
    typeof properties.id !== 'string' ||
    typeof properties.name !== 'string' ||
    typeof properties['elevation-m'] !== 'number' ||
    !Array.isArray(properties.runways) ||
    !Array.isArray(properties.comm) ||
    typeof properties.longestRwyLength_m !== 'number' ||
    typeof properties.longestRwyHeading_deg !== 'number' ||
    typeof properties.longestRwySurface !== 'string'
  ) {
    throw new Error('FlightGear returned invalid airport data')
  }

  return {
    id: properties.id,
    name: properties.name,
    longitudeDeg: referencePoint.coordinates[0],
    latitudeDeg: referencePoint.coordinates[1],
    elevationM: properties['elevation-m'],
    runways: properties.runways.map(parseAirportRunway),
    longestRunwayLengthM: properties.longestRwyLength_m,
    longestRunwayHeadingDeg: properties.longestRwyHeading_deg,
    longestRunwaySurface: properties.longestRwySurface,
    hasMetar: properties.metar === true,
    comms: properties.comm.map(parseAirportComm),
  }
}

interface FlightGearClientOptions {
  httpBaseUrl?: string
  propertyListenerUrl?: string
}

function parsePropertyNode(data: unknown): FlightGearPropertyNode {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('path' in data) ||
    typeof data.path !== 'string' ||
    !('name' in data) ||
    typeof data.name !== 'string' ||
    !('type' in data) ||
    typeof data.type !== 'string' ||
    !('index' in data) ||
    typeof data.index !== 'number' ||
    !('nChildren' in data) ||
    typeof data.nChildren !== 'number'
  ) {
    throw new Error('FlightGear returned an invalid property node')
  }

  let children: FlightGearPropertyNode[] | undefined

  if ('children' in data) {
    if (!Array.isArray(data.children)) {
      throw new Error('FlightGear returned invalid property children')
    }

    children = data.children.map(parsePropertyNode)
  }

  return {
    path: data.path,
    name: data.name,
    type: data.type,
    index: data.index,
    nChildren: data.nChildren,
    ...('value' in data ? { value: data.value } : {}),
    ...(children ? { children } : {}),
  }
}

export class FlightGearClient {
  private readonly httpBaseUrl: string
  private readonly propertyListenerUrl: string

  constructor(options: FlightGearClientOptions = {}) {
    this.httpBaseUrl = options.httpBaseUrl ?? 'http://localhost:5480'
    this.propertyListenerUrl = options.propertyListenerUrl ?? 'ws://localhost:5480/PropertyListener'
  }

  async fetchProperty(path: string): Promise<unknown> {
    const node = normalizePropertyPath(path)
    const response = await fetch(`${this.httpBaseUrl}/json/${node}`)

    if (!response.ok) {
      throw new Error(`FlightGear HTTP request failed with status ${response.status}`)
    }

    const data: unknown = await response.json()

    if (
      typeof data !== 'object' ||
      data === null ||
      !Object.prototype.hasOwnProperty.call(data, 'value')
    ) {
      throw new Error(`FlightGear returned an invalid property response for ${path}`)
    }

    return (data as { value: unknown }).value
  }

  async fetchPropertyNode(path: string, depth = 1): Promise<FlightGearPropertyNode> {
    const node = normalizePropertyPath(path)

    const response = await fetch(
      `${this.httpBaseUrl}/json/${node}?d=${Math.max(1, Math.floor(depth))}`,
    )

    if (!response.ok) {
      throw new Error(`FlightGear HTTP request failed with status ${response.status}`)
    }

    const data: unknown = await response.json()

    return parsePropertyNode(data)
  }

  openPropertyListener(handlers: FlightGearConnectionHandlers): FlightGearPropertyConnection {
    const socket = new WebSocket(this.propertyListenerUrl)

    socket.onopen = () => {
      handlers.onOpen()
    }

    socket.onmessage = (event) => {
      try {
        const data: unknown = JSON.parse(String(event.data))

        if (
          typeof data !== 'object' ||
          data === null ||
          !('path' in data) ||
          typeof data.path !== 'string'
        ) {
          throw new Error('FlightGear returned an invalid PropertyListener message')
        }

        handlers.onMessage({
          path: data.path,
          value: 'value' in data ? data.value : undefined,
        })
      } catch (error) {
        handlers.onParseError?.(error)
      }
    }

    socket.onclose = () => {
      handlers.onClose()
    }

    socket.onerror = (error) => {
      handlers.onError(error)
    }

    return {
      get isOpen() {
        return socket.readyState === WebSocket.OPEN
      },

      subscribe(path: string) {
        socket.send(
          JSON.stringify({
            command: 'addListener',
            node: normalizePropertyPath(path),
          }),
        )
      },

      unsubscribe(path: string) {
        socket.send(
          JSON.stringify({
            command: 'removeListener',
            node: normalizePropertyPath(path),
          }),
        )
      },

      request(path: string) {
        socket.send(
          JSON.stringify({
            command: 'get',
            node: normalizePropertyPath(path),
          }),
        )
      },

      set(path: string, value: FlightGearPropertyValue) {
        socket.send(
          JSON.stringify({
            command: 'set',
            node: normalizePropertyPath(path),
            value,
          }),
        )
      },

      close() {
        socket.close()
      },
    }
  }

  async fetchAirports(): Promise<FlightGearAirportSummary[]> {
    const response = await fetch(`${this.httpBaseUrl}/navdb?q=airports`)

    if (!response.ok) {
      throw new Error(`FlightGear HTTP request failed with status ${response.status}`)
    }

    const data: unknown = await response.json()

    if (!Array.isArray(data)) {
      throw new Error('FlightGear returned an invalid airport index')
    }

    return data.map(parseAirportSummary)
  }

  async fetchAirport(id: string): Promise<FlightGearAirport> {
    const airportId = id.trim().toUpperCase()

    if (!airportId) {
      throw new Error('Airport identifier is required')
    }

    const params = new URLSearchParams({
      q: 'airport',
      id: airportId,
    })

    const response = await fetch(`${this.httpBaseUrl}/navdb?${params}`)

    if (!response.ok) {
      throw new Error(`FlightGear HTTP request failed with status ${response.status}`)
    }

    const data: unknown = await response.json()

    return parseAirport(data)
  }
}
