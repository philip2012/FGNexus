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

  function subscribeTo(node: string) {
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
    socket = new WebSocket('ws://localhost:5480/PropertyListener')

    socket.onopen = () => {
      connected.value = true

      subscribeTo('position/altitude-ft')
      subscribeTo('velocities/airspeed-kt')
      subscribeTo('orientation/heading-deg')
      subscribeTo('velocities/groundspeed-kt')
      subscribeTo('velocities/vertical-speed-fps')
      subscribeTo('orientation/pitch-deg')
      subscribeTo('position/latitude-deg')
      subscribeTo('position/longitude-deg')
      subscribeTo('orientation/track-deg')
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.path) {
          case '/position/altitude-ft':
            altitudeFt.value = Number(data.value)
            break

          case '/velocities/airspeed-kt':
            airspeedKt.value = Number(data.value)
            break

          case '/orientation/heading-deg':
            headingDeg.value = Number(data.value)
            break
          case '/velocities/groundspeed-kt':
            groundspeedKt.value = Number(data.value)
            break
          case '/velocities/vertical-speed-fps':
            verticalSpeedFpm.value = Number(data.value)
            break
          case '/orientation/pitch-deg':
            pitchDeg.value = Number(data.value)
            break
          case '/position/latitude-deg':
            latitudeDeg.value = Number(data.value)
            break
          case '/position/longitude-deg':
            longitudeDeg.value = Number(data.value)
            break
          case '/orientation/track-deg':
            trackDeg.value = Number(data.value)
            break
        }
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
