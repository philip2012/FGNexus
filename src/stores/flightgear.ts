import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { FlightGearConnectionState } from '@/types/flightgear-connection'
import { FlightGearClient, type FlightGearPropertyConnection } from '@/services/flightgear-client'

export const useFlightGearStore = defineStore('flightgear', () => {
  const altitudeFt = ref<number | null>(null)
  const airspeedKt = ref<number | null>(null)
  const magneticHeadingDeg = ref<number | null>(null)

  const groundspeedKt = ref<number | null>(null)
  const verticalSpeedFpm = ref<number | null>(null)
  const pitchDeg = ref<number | null>(null)

  const latitudeDeg = ref<number | null>(null)
  const longitudeDeg = ref<number | null>(null)
  const trackDeg = ref<number | null>(null)

  const rollDeg = ref<number | null>(null)
  const mach = ref<number | null>(null)

  const windDirectionDeg = ref<number | null>(null)
  const windSpeedKt = ref<number | null>(null)
  const outsideAirTempC = ref<number | null>(null)

  const lastTelemetryUpdate = ref<number | null>(null)
  type PropertyHandler = (value: unknown) => void

  const propertyHandlers: Record<string, PropertyHandler> = {
    '/position/altitude-ft': (value) => {
      altitudeFt.value = Number(value)
    },

    '/velocities/airspeed-kt': (value) => {
      airspeedKt.value = Number(value)
    },

    '/orientation/heading-magnetic-deg': (value) => {
      magneticHeadingDeg.value = Number(value)
    },

    '/velocities/groundspeed-kt': (value) => {
      groundspeedKt.value = Number(value)
    },

    '/velocities/vertical-speed-fps': (value) => {
      verticalSpeedFpm.value = Number(value) * 60
    },

    '/orientation/pitch-deg': (value) => {
      pitchDeg.value = Number(value)
    },

    '/position/latitude-deg': (value) => {
      latitudeDeg.value = Number(value)
    },

    '/position/longitude-deg': (value) => {
      longitudeDeg.value = Number(value)
    },

    '/orientation/track-deg': (value) => {
      trackDeg.value = Number(value)
    },
    '/orientation/roll-deg': (value) => {
      rollDeg.value = Number(value)
    },

    '/velocities/mach': (value) => {
      mach.value = Number(value)
    },

    '/environment/wind-from-heading-deg': (value) => {
      windDirectionDeg.value = Number(value)
    },

    '/environment/wind-speed-kt': (value) => {
      windSpeedKt.value = Number(value)
    },

    '/environment/temperature-degc': (value) => {
      outsideAirTempC.value = Number(value)
    },
  }

  const flightGearClient = new FlightGearClient()

  const connectionState = ref<FlightGearConnectionState>('disconnected')
  const HEARTBEAT_PATH = '/sim/time/utc/second'

  let disconnectTimer: number | undefined
  let heartbeatTimer: number | undefined
  let shouldReconnect = false
  let reconnectTimer: number | undefined
  let connection: FlightGearPropertyConnection | null = null

  function resetTelemetry() {
    altitudeFt.value = null
    airspeedKt.value = null
    magneticHeadingDeg.value = null
    groundspeedKt.value = null
    verticalSpeedFpm.value = null
    pitchDeg.value = null
    latitudeDeg.value = null
    longitudeDeg.value = null
    trackDeg.value = null
    lastTelemetryUpdate.value = null
    rollDeg.value = null
    mach.value = null
    windDirectionDeg.value = null
    windSpeedKt.value = null
    outsideAirTempC.value = null
  }

  async function fetchProperty(path: string, targetConnection: FlightGearPropertyConnection) {
    try {
      const value = await flightGearClient.fetchProperty(path)

      if (connection !== targetConnection) {
        return
      }

      const handler = propertyHandlers[path]

      if (handler) {
        handler(value)
      }
    } catch (error) {
      console.error(`Failed to fetch FlightGear property ${path}:`, error)
    }
  }

  async function fetchInitialTelemetry(targetConnection: FlightGearPropertyConnection) {
    for (const path of Object.keys(propertyHandlers)) {
      await fetchProperty(path, targetConnection)
    }
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== undefined) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = undefined
    }
  }

  function requestHeartbeat(targetConnection: FlightGearPropertyConnection) {
    if (connection !== targetConnection || !targetConnection.isOpen) {
      return
    }

    targetConnection.request(HEARTBEAT_PATH)
  }

  function startHeartbeat(targetConnection: FlightGearPropertyConnection) {
    stopHeartbeat()

    requestHeartbeat(targetConnection)

    heartbeatTimer = window.setInterval(() => {
      requestHeartbeat(targetConnection)
    }, 1000)
  }

  function scheduleReconnect() {
    if (!shouldReconnect || reconnectTimer !== undefined) {
      return
    }

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined
      connect()
    }, 2000)
  }

  function connect() {
    if (connection) {
      return
    }

    if (disconnectTimer !== undefined) {
      window.clearTimeout(disconnectTimer)
      disconnectTimer = undefined
    }

    stopHeartbeat()

    shouldReconnect = true
    connectionState.value = 'connecting'
    resetTelemetry()

    let currentConnection: FlightGearPropertyConnection | null = null

    currentConnection = flightGearClient.openPropertyListener({
      onOpen: () => {
        if (!currentConnection || connection !== currentConnection) {
          return
        }

        connectionState.value = 'connected'

        // Opening the connection proves that FlightGear is responsive.
        lastTelemetryUpdate.value = Date.now()

        for (const path of Object.keys(propertyHandlers)) {
          currentConnection.subscribe(path)
        }

        void fetchInitialTelemetry(currentConnection)
        startHeartbeat(currentConnection)
      },

      onMessage: (message) => {
        if (!currentConnection || connection !== currentConnection) {
          return
        }

        // Any inbound PropertyListener message proves the connection
        // is still responsive.
        lastTelemetryUpdate.value = Date.now()

        const handler = propertyHandlers[message.path]

        if (handler) {
          handler(message.value)
        }
      },

      onClose: () => {
        if (!currentConnection || connection !== currentConnection) {
          return
        }

        stopHeartbeat()

        if (disconnectTimer !== undefined) {
          window.clearTimeout(disconnectTimer)
          disconnectTimer = undefined
        }

        resetTelemetry()
        connection = null

        if (shouldReconnect) {
          connectionState.value = 'connecting'
          scheduleReconnect()
        } else {
          connectionState.value = 'disconnected'
        }
      },

      onError: (error) => {
        if (!currentConnection || connection !== currentConnection) {
          return
        }

        console.error('FlightGear WebSocket error:', error)
        connectionState.value = 'error'
      },

      onParseError: (error) => {
        if (!currentConnection || connection !== currentConnection) {
          return
        }

        console.error('Failed to parse FlightGear message:', error)
      },
    })

    connection = currentConnection
  }

  function disconnect() {
    shouldReconnect = false
    stopHeartbeat()

    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }

    if (!connection) {
      connectionState.value = 'disconnected'
      return
    }

    const currentConnection = connection

    connectionState.value = 'disconnecting'
    currentConnection.close()

    disconnectTimer = window.setTimeout(() => {
      if (connection !== currentConnection || connectionState.value !== 'disconnecting') {
        return
      }

      resetTelemetry()
      connection = null
      connectionState.value = 'disconnected'
    }, 1500)
  }

  return {
    altitudeFt,
    airspeedKt,
    magneticHeadingDeg,
    groundspeedKt,
    verticalSpeedFpm,
    pitchDeg,
    latitudeDeg,
    longitudeDeg,
    trackDeg,
    rollDeg,
    mach,
    windDirectionDeg,
    windSpeedKt,
    outsideAirTempC,

    connectionState,
    lastTelemetryUpdate,
    connect,
    disconnect,
  }
})
