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
