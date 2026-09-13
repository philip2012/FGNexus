import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FlightGearClient, type FlightGearPropertyMessage } from '@/services/flightgear-client'

class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  static instances: FakeWebSocket[] = []

  readonly url: string

  readyState = FakeWebSocket.CONNECTING
  sentMessages: string[] = []
  closeCalls = 0

  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close() {
    this.closeCalls += 1
    this.readyState = FakeWebSocket.CLOSED
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  receive(data: unknown) {
    this.onmessage?.(
      new MessageEvent('message', {
        data: typeof data === 'string' ? data : JSON.stringify(data),
      }),
    )
  }

  closeFromServer() {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.(new Event('close') as CloseEvent)
  }

  fail() {
    this.onerror?.(new Event('error'))
  }
}

function createHandlers() {
  return {
    onOpen: vi.fn<() => void>(),
    onMessage: vi.fn<(message: FlightGearPropertyMessage) => void>(),
    onClose: vi.fn<() => void>(),
    onError: vi.fn<(error: Event) => void>(),
    onParseError: vi.fn<(error: unknown) => void>(),
  }
}

describe('FlightGearClient', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []

    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fetches a FlightGear property value', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ value: 12345 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const client = new FlightGearClient({
      httpBaseUrl: 'http://test:5480',
    })

    const value = await client.fetchProperty('/position/altitude-ft')

    expect(value).toBe(12345)
    expect(fetchMock).toHaveBeenCalledWith('http://test:5480/json/position/altitude-ft')
  })

  it('throws when the HTTP request fails', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    fetchMock.mockResolvedValue(
      new Response('', {
        status: 503,
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const client = new FlightGearClient()

    await expect(client.fetchProperty('/position/altitude-ft')).rejects.toThrow(
      'FlightGear HTTP request failed with status 503',
    )
  })

  it('throws when the HTTP response has no value property', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ somethingElse: 123 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const client = new FlightGearClient()

    await expect(client.fetchProperty('/position/altitude-ft')).rejects.toThrow(
      'FlightGear returned an invalid property response for /position/altitude-ft',
    )
  })

  it('opens the PropertyListener connection', () => {
    const handlers = createHandlers()

    const client = new FlightGearClient({
      propertyListenerUrl: 'ws://test:5480/PropertyListener',
    })

    const connection = client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    expect(socket?.url).toBe('ws://test:5480/PropertyListener')
    expect(connection.isOpen).toBe(false)

    socket?.open()

    expect(connection.isOpen).toBe(true)
    expect(handlers.onOpen).toHaveBeenCalledOnce()
  })

  it('sends an addListener command when subscribing', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    const connection = client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    socket?.open()

    connection.subscribe('/position/altitude-ft')

    expect(socket?.sentMessages).toEqual([
      JSON.stringify({
        command: 'addListener',
        node: 'position/altitude-ft',
      }),
    ])
  })

  it('sends a get command when requesting a property', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    const connection = client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    socket?.open()

    connection.request('/sim/time/utc/second')

    expect(socket?.sentMessages).toEqual([
      JSON.stringify({
        command: 'get',
        node: 'sim/time/utc/second',
      }),
    ])
  })

  it('sends a set command when writing a property', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    const connection = client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    socket?.open()

    connection.set('/controls/flight/aileron', 0.25)

    expect(socket?.sentMessages).toEqual([
      JSON.stringify({
        command: 'set',
        node: 'controls/flight/aileron',
        value: 0.25,
      }),
    ])
  })

  it('parses incoming PropertyListener messages', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    socket?.receive({
      path: '/velocities/airspeed-kt',
      value: 250,
    })

    expect(handlers.onMessage).toHaveBeenCalledWith({
      path: '/velocities/airspeed-kt',
      value: 250,
    })
  })

  it('reports malformed PropertyListener messages', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    socket?.receive({
      value: 250,
    })

    expect(handlers.onMessage).not.toHaveBeenCalled()
    expect(handlers.onParseError).toHaveBeenCalledOnce()
  })

  it('reports invalid JSON from PropertyListener', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    socket?.receive('{invalid json')

    expect(handlers.onParseError).toHaveBeenCalledOnce()
  })

  it('reports connection close and errors', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    socket?.fail()
    socket?.closeFromServer()

    expect(handlers.onError).toHaveBeenCalledOnce()
    expect(handlers.onClose).toHaveBeenCalledOnce()
  })

  it('closes the underlying WebSocket', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    const connection = client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    connection.close()

    expect(socket?.closeCalls).toBe(1)
    expect(socket?.readyState).toBe(FakeWebSocket.CLOSED)
    expect(connection.isOpen).toBe(false)
  })

  it('normalizes property paths without requiring a leading slash', () => {
    const handlers = createHandlers()
    const client = new FlightGearClient()

    const connection = client.openPropertyListener(handlers)

    const socket = FakeWebSocket.instances[0]

    socket?.open()

    connection.subscribe('position/altitude-ft')
    connection.request('sim/time/utc/second')
    connection.set('controls/gear/gear-down', true)

    expect(socket?.sentMessages).toEqual([
      JSON.stringify({
        command: 'addListener',
        node: 'position/altitude-ft',
      }),
      JSON.stringify({
        command: 'get',
        node: 'sim/time/utc/second',
      }),
      JSON.stringify({
        command: 'set',
        node: 'controls/gear/gear-down',
        value: true,
      }),
    ])
  })

  it('normalizes HTTP property paths without a leading slash', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ value: 250 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const client = new FlightGearClient({
      httpBaseUrl: 'http://test:5480',
    })

    await client.fetchProperty('velocities/airspeed-kt')

    expect(fetchMock).toHaveBeenCalledWith('http://test:5480/json/velocities/airspeed-kt')
  })

  it('fetches and parses a property node hierarchy', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          path: '/controls',
          name: 'controls',
          type: '-',
          index: 0,
          nChildren: 1,
          children: [
            {
              path: '/controls/lighting',
              name: 'lighting',
              type: '-',
              index: 0,
              nChildren: 1,
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const client = new FlightGearClient({
      httpBaseUrl: 'http://test:5480',
    })

    const node = await client.fetchPropertyNode('/controls', 1)

    expect(fetchMock).toHaveBeenCalledWith('http://test:5480/json/controls?d=1')

    expect(node.path).toBe('/controls')
    expect(node.children).toHaveLength(1)
    expect(node.children?.[0]?.path).toBe('/controls/lighting')
  })

  it('fetches the root property node', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          path: '/',
          name: '',
          type: '-',
          index: 0,
          nChildren: 0,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const client = new FlightGearClient({
      httpBaseUrl: 'http://test:5480',
    })

    await client.fetchPropertyNode('/', 1)

    expect(fetchMock).toHaveBeenCalledWith('http://test:5480/json/?d=1')
  })

  it('rejects invalid property node children', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          path: '/controls',
          name: 'controls',
          type: '-',
          index: 0,
          nChildren: 1,
          children: 'invalid',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const client = new FlightGearClient({
      httpBaseUrl: 'http://test:5480',
    })

    await expect(client.fetchPropertyNode('/controls', 1)).rejects.toThrow(
      'FlightGear returned invalid property children',
    )
  })
})
