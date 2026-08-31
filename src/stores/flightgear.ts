import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { FlightGearConnectionState } from '@/types/flightgear-connection'

export const useFlightGearStore = defineStore('flightgear', () => {
  const altitudeFt = ref(10000)
  const airspeedKt = ref(250)
  const headingDeg = ref(180)

  const groundspeedKt = ref(240)
  const verticalSpeedFpm = ref(500)
  const pitchDeg = ref(3)

  const latitudeDeg = ref(10.8)
  const longitudeDeg = ref(106.6)
  const trackDeg = ref(182)

  type PropertyHandler = (value: unknown) => void

  const propertyHandlers: Record<string, PropertyHandler> = {
    '/position/altitude-ft': (value) => {
      altitudeFt.value = Number(value)
    },

    '/velocities/airspeed-kt': (value) => {
      airspeedKt.value = Number(value)
    },

    '/orientation/heading-deg': (value) => {
      headingDeg.value = Number(value)
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
        }
      } catch (error) {
        console.error('Failed to parse FlightGear message:', error)
      }
    }

    socket.onclose = () => {
      if (connectionState.value !== 'error') {
        connectionState.value = 'disconnected'
      }

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
    headingDeg,
    groundspeedKt,
    verticalSpeedFpm,
    pitchDeg,
    latitudeDeg,
    longitudeDeg,
    trackDeg,

    connectionState,
    connect,
    disconnect,
  }
})
