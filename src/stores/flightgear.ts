import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { FlightGearConnectionState } from '@/types/flightgear-connection'

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

  const connectionState = ref<FlightGearConnectionState>('disconnected')
  let disconnectTimer: number | undefined
  let shouldReconnect = false
  let reconnectTimer: number | undefined
  let socket: WebSocket | null = null

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

  async function fetchProperty(path: string, targetSocket: WebSocket) {
    try {
      const response = await fetch(`http://localhost:5480/json${path}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (socket !== targetSocket) {
        return
      }

      const handler = propertyHandlers[path]

      if (handler) {
        handler(data.value)
        lastTelemetryUpdate.value = Date.now()
      }
    } catch (error) {
      console.error(`Failed to fetch FlightGear property ${path}:`, error)
    }
  }

  async function fetchInitialTelemetry(targetSocket: WebSocket) {
    for (const path of Object.keys(propertyHandlers)) {
      await fetchProperty(path, targetSocket)
    }
  }

  function subscribeTo(path: string, targetSocket: WebSocket) {
    const node = path.startsWith('/') ? path.slice(1) : path

    targetSocket.send(
      JSON.stringify({
        command: 'addListener',
        node,
      }),
    )
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
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      return
    }
    if (disconnectTimer !== undefined) {
      window.clearTimeout(disconnectTimer)
      disconnectTimer = undefined
    }
    shouldReconnect = true
    connectionState.value = 'connecting'
    resetTelemetry()
    const currentSocket = new WebSocket('ws://localhost:5480/PropertyListener')
    socket = currentSocket

    currentSocket.onopen = () => {
      if (socket !== currentSocket) {
        return
      }

      connectionState.value = 'connected'

      for (const path of Object.keys(propertyHandlers)) {
        subscribeTo(path, currentSocket)
      }

      void fetchInitialTelemetry(currentSocket)
    }

    currentSocket.onmessage = (event) => {
      if (socket !== currentSocket) {
        return
      }
      try {
        const data = JSON.parse(event.data)
        const handler = propertyHandlers[data.path]

        if (handler) {
          handler(data.value)
          lastTelemetryUpdate.value = Date.now()
        }
      } catch (error) {
        console.error('Failed to parse FlightGear message:', error)
      }
    }

    currentSocket.onclose = () => {
      if (socket !== currentSocket) {
        return
      }
      if (disconnectTimer !== undefined) {
        window.clearTimeout(disconnectTimer)
        disconnectTimer = undefined
      }

      resetTelemetry()
      socket = null

      if (shouldReconnect) {
        connectionState.value = 'connecting'
        scheduleReconnect()
      } else {
        connectionState.value = 'disconnected'
      }
    }

    currentSocket.onerror = (error) => {
      if (socket !== currentSocket) {
        return
      }
      console.error('FlightGear WebSocket error:', error)
      connectionState.value = 'error'
    }
  }

  function disconnect() {
    shouldReconnect = false

    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }

    if (!socket) {
      connectionState.value = 'disconnected'
      return
    }

    const currentSocket = socket

    connectionState.value = 'disconnecting'
    currentSocket.close()

    disconnectTimer = window.setTimeout(() => {
      if (socket !== currentSocket || connectionState.value !== 'disconnecting') {
        return
      }

      resetTelemetry()
      socket = null
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
