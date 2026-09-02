<template>
  <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
    <div class="mx-auto max-w-7xl">
      <header
        class="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 class="text-3xl font-bold tracking-tight">FG Nexus</h1>
          <div class="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <span class="h-2.5 w-2.5 rounded-full" :class="connectionClass"></span>

            <span>
              FlightGear:
              <span class="font-semibold">
                {{ connectionLabel }}
              </span>
            </span>

            <span class="text-slate-500">·</span>

            <span :class="telemetryStatusClass">
              {{ telemetryStatusLabel }}
            </span>

            <span
              v-if="telemetryAgeLabel && telemetryStatus !== 'unavailable'"
              class="text-slate-500"
            >
              · {{ telemetryAgeLabel }}
            </span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            :disabled="!canConnect"
            class="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            @click="flightgear.connect()"
          >
            Connect
          </button>

          <button
            :disabled="!canDisconnect"
            class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            @click="flightgear.disconnect()"
          >
            {{ disconnectLabel }}
          </button>
        </div>
      </header>

      <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TelemetryPanel title="Primary Flight" :telemetry="primaryFlightTelemetry" />

        <TelemetryPanel title="Motion" :telemetry="motionTelemetry" />

        <TelemetryPanel title="Position" :telemetry="positionTelemetry" />

        <TelemetryPanel title="Environment" :telemetry="environmentTelemetry" />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import TelemetryPanel from '@/components/TelemetryPanel.vue'
import type { TelemetryItem } from '@/types/telemetry'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useFlightGearStore } from '@/stores/flightgear'

const flightgear = useFlightGearStore()

const primaryFlightTelemetry = computed<TelemetryItem[]>(() => [
  {
    label: 'Altitude',
    value: flightgear.altitudeFt,
    unit: 'ft',
    decimals: 0,
  },
  {
    label: 'Indicated Airspeed',
    value: flightgear.airspeedKt,
    unit: 'kt',
    decimals: 0,
  },
  {
    label: 'Mach',
    value: flightgear.mach,
    unit: '',
    decimals: 3,
  },
  {
    label: 'Magnetic Heading',
    value: flightgear.magneticHeadingDeg,
    unit: '°',
    decimals: 0,
    padded: 3,
  },
])

const motionTelemetry = computed<TelemetryItem[]>(() => [
  {
    label: 'Groundspeed',
    value: flightgear.groundspeedKt,
    unit: 'kt',
    decimals: 0,
  },
  {
    label: 'Vertical Speed',
    value: flightgear.verticalSpeedFpm,
    unit: 'ft/min',
    decimals: 0,
    signed: true,
  },
  {
    label: 'Pitch',
    value: flightgear.pitchDeg,
    unit: '°',
    decimals: 1,
    signed: true,
  },
  {
    label: 'Roll',
    value: flightgear.rollDeg,
    unit: '°',
    decimals: 1,
    signed: true,
  },
])

const positionTelemetry = computed<TelemetryItem[]>(() => [
  {
    label: 'Latitude',
    value: flightgear.latitudeDeg,
    unit: '',
    decimals: 4,
    coordinate: 'latitude',
  },
  {
    label: 'Longitude',
    value: flightgear.longitudeDeg,
    unit: '',
    decimals: 4,
    coordinate: 'longitude',
  },
  {
    label: 'Track',
    value: flightgear.trackDeg,
    unit: '°',
    decimals: 0,
    padded: 3,
  },
])

const connectionLabel = computed(() => {
  switch (flightgear.connectionState) {
    case 'connecting':
      return 'Connecting...'

    case 'connected':
      return 'Connected'

    case 'disconnecting':
      return 'Disconnecting...'

    case 'error':
      return 'Connection error'

    default:
      return 'Disconnected'
  }
})

const disconnectLabel = computed(() => {
  if (flightgear.connectionState === 'connecting' || flightgear.connectionState === 'error') {
    return 'Cancel'
  }

  return 'Disconnect'
})

const connectionClass = computed(() => {
  switch (flightgear.connectionState) {
    case 'connected':
      return 'bg-emerald-400'

    case 'connecting':
    case 'disconnecting':
      return 'bg-amber-400'

    case 'error':
      return 'bg-red-400'

    default:
      return 'bg-slate-600'
  }
})

const canConnect = computed(
  () => flightgear.connectionState === 'disconnected' || flightgear.connectionState === 'error',
)

const canDisconnect = computed(
  () =>
    flightgear.connectionState === 'connecting' ||
    flightgear.connectionState === 'connected' ||
    flightgear.connectionState === 'error',
)

const now = ref(Date.now())

let freshnessTimer: number | undefined

onMounted(() => {
  freshnessTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (freshnessTimer !== undefined) {
    window.clearInterval(freshnessTimer)
  }
})

const telemetryAgeMs = computed(() => {
  if (flightgear.lastTelemetryUpdate === null) {
    return null
  }

  return Math.max(0, now.value - flightgear.lastTelemetryUpdate)
})

const telemetryStatus = computed(() => {
  if (flightgear.connectionState !== 'connected') {
    return 'unavailable'
  }

  if (telemetryAgeMs.value === null) {
    return 'waiting'
  }

  if (telemetryAgeMs.value <= 3000) {
    return 'live'
  }

  return 'stale'
})

const telemetryStatusLabel = computed(() => {
  switch (telemetryStatus.value) {
    case 'live':
      return 'Live'

    case 'stale':
      return 'Telemetry stale'

    case 'waiting':
      return 'Waiting for telemetry'

    default:
      return 'No telemetry'
  }
})

const telemetryStatusClass = computed(() => {
  switch (telemetryStatus.value) {
    case 'live':
      return 'text-emerald-400'

    case 'stale':
      return 'text-amber-400'

    case 'waiting':
      return 'text-slate-400'

    default:
      return 'text-slate-500'
  }
})

const telemetryAgeLabel = computed(() => {
  if (telemetryAgeMs.value === null) {
    return null
  }

  const seconds = Math.floor(telemetryAgeMs.value / 1000)

  if (seconds === 0) {
    return 'just now'
  }

  return `${seconds}s ago`
})

const environmentTelemetry = computed<TelemetryItem[]>(() => [
  {
    label: 'Wind Direction',
    value: flightgear.windDirectionDeg,
    unit: '°',
    decimals: 0,
    padded: 3,
  },
  {
    label: 'Wind Speed',
    value: flightgear.windSpeedKt,
    unit: 'kt',
    decimals: 0,
  },
  {
    label: 'Outside Air Temperature',
    value: flightgear.outsideAirTempC,
    unit: '°C',
    decimals: 1,
    signed: true,
  },
])
</script>

<style scoped></style>
