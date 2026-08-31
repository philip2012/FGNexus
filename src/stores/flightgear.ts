import { ref } from 'vue'
import { defineStore } from 'pinia'

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

  const connected = ref(false)
  let socket: WebSocket | null = null

  function connect() {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      return
    }
    socket = new WebSocket('ws://localhost:5480/PropertyListener')

    socket.onopen = () => {
      connected.value = true

      socket?.send(
        JSON.stringify({
          command: 'addListener',
          node: 'position/altitude-ft',
        }),
      )
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        altitudeFt.value = Number(data.value)
      } catch (error) {
        console.error('Failed to parse FlightGear message:', error)
      }
    }

    socket.onclose = () => {
      connected.value = false
    }

    socket.onerror = (error) => {
      console.error('FlightGear WebSocket error:', error)
    }
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

    connected,
    connect,
  }
})
