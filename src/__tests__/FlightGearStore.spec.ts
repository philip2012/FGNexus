import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useFlightGearStore } from '@/stores/flightgear'

class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 3

  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  sentMessages: string[] = []

  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  receive(data: unknown) {
    this.onmessage?.(
      new MessageEvent('message', {
        data: JSON.stringify(data),
      }),
    )
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.(new Event('close') as CloseEvent)
  }

  closeFromServer() {
    this.close()
  }
}

function countCommand(socket: FakeWebSocket, command: string, node: string): number {
  return socket.sentMessages
    .map((message) => JSON.parse(message) as { command?: string; node?: string })
    .filter((message) => message.command === command && message.node === node).length
}

describe('FlightGear store property subscriptions', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    setActivePinia(createPinia())

    FakeWebSocket.instances = []

    vi.useFakeTimers()

    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)

    fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => {
      return new Response(JSON.stringify({ value: 0 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(async () => {
    const flightgear = useFlightGearStore()

    flightgear.disconnect()

    await vi.advanceTimersByTimeAsync(0)

    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shares one FlightGear listener between multiple subscribers', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connect()

    const socket = FakeWebSocket.instances[0]

    socket?.open()

    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledTimes(14)

    const firstHandler = vi.fn<(value: unknown) => void>()
    const secondHandler = vi.fn<(value: unknown) => void>()

    const stopFirst = flightgear.subscribeProperty('/controls/lighting/nav-lights', firstHandler)

    const stopSecond = flightgear.subscribeProperty('/controls/lighting/nav-lights', secondHandler)

    expect(socket ? countCommand(socket, 'addListener', 'controls/lighting/nav-lights') : 0).toBe(1)

    socket?.receive({
      path: '/controls/lighting/nav-lights',
      value: true,
    })

    expect(firstHandler).toHaveBeenCalledWith(true)
    expect(secondHandler).toHaveBeenCalledWith(true)

    stopFirst()

    expect(
      socket ? countCommand(socket, 'removeListener', 'controls/lighting/nav-lights') : 0,
    ).toBe(0)

    stopSecond()

    expect(
      socket ? countCommand(socket, 'removeListener', 'controls/lighting/nav-lights') : 0,
    ).toBe(1)
  })

  it('does not remove a telemetry listener used by a dynamic subscriber', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connect()

    const socket = FakeWebSocket.instances[0]

    socket?.open()

    const handler = vi.fn<(value: unknown) => void>()

    const stop = flightgear.subscribeProperty('/position/altitude-ft', handler)

    expect(socket ? countCommand(socket, 'addListener', 'position/altitude-ft') : 0).toBe(1)

    stop()

    expect(socket ? countCommand(socket, 'removeListener', 'position/altitude-ft') : 0).toBe(0)

    socket?.receive({
      path: '/position/altitude-ft',
      value: 12500,
    })

    expect(flightgear.altitudeFt).toBe(12500)
  })

  it('restores active property subscriptions after reconnecting', async () => {
    const flightgear = useFlightGearStore()

    const handler = vi.fn<(value: unknown) => void>()

    flightgear.subscribeProperty('/controls/lighting/nav-lights', handler)

    flightgear.connect()

    const firstSocket = FakeWebSocket.instances[0]

    firstSocket?.open()

    // Let the async initial telemetry hydration finish without advancing
    // the heartbeat or reconnect timers.
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledTimes(14)

    expect(
      firstSocket ? countCommand(firstSocket, 'addListener', 'controls/lighting/nav-lights') : 0,
    ).toBe(1)

    firstSocket?.closeFromServer()

    expect(flightgear.connectionState).toBe('connecting')

    await vi.advanceTimersByTimeAsync(2000)

    const secondSocket = FakeWebSocket.instances[1]

    expect(secondSocket).toBeDefined()

    secondSocket?.open()

    // Flush the second connection's hydration.
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledTimes(28)

    expect(
      secondSocket ? countCommand(secondSocket, 'addListener', 'controls/lighting/nav-lights') : 0,
    ).toBe(1)
  })
})
