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
  request(path: string): void
  set(path: string, value: FlightGearPropertyValue): void
  close(): void
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
}
