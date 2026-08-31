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
  }

  const connectionState = ref<FlightGearConnectionState>('disconnected')
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
  }

  function subscribeTo(path: string) {
    const node = path.startsWith('/') ? path.slice(1) : path

    socket?.send(
      JSON.stringify({
        command: 'addListener',
        node,
      }),
    )
  }

  function connect() {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      return
    }
    connectionState.value = 'connecting'
    resetTelemetry()
    socket = new WebSocket('ws://localhost:5480/PropertyListener')

    socket.onopen = () => {
      connectionState.value = 'connected'

      for (const path of Object.keys(propertyHandlers)) {
        subscribeTo(path)
      }
    }

    socket.onmessage = (event) => {
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

    socket.onclose = () => {
      if (connectionState.value !== 'error') {
        connectionState.value = 'disconnected'
      }
      resetTelemetry()
      socket = null
    }

    socket.onerror = (error) => {
      console.error('FlightGear WebSocket error:', error)
      connectionState.value = 'error'
    }
  }

  function disconnect() {
    if (!socket) {
      return
    }

    connectionState.value = 'disconnecting'
    socket.close()
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

    connectionState,
    lastTelemetryUpdate,
    connect,
    disconnect,
  }
})
