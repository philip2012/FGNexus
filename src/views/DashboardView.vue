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
              <span class="font-semibold"> {{ connectionLabel }} </span>
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
            Disconnect
          </button>
        </div>
      </header>

      <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TelemetryPanel title="Primary Flight" :telemetry="primaryFlightTelemetry" />

        <TelemetryPanel title="Motion" :telemetry="motionTelemetry" />

        <TelemetryPanel title="Position" :telemetry="positionTelemetry" />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import TelemetryPanel from '@/components/TelemetryPanel.vue'
import type { TelemetryItem } from '@/types/telemetry'
import { computed } from 'vue'
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
    label: 'Magnetic Heading',
    value: flightgear.magneticHeadingDeg,
    unit: '°',
    decimals: 0,
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
])

const positionTelemetry = computed<TelemetryItem[]>(() => [
  {
    label: 'Latitude',
    value: flightgear.latitudeDeg,
    unit: '°',
    decimals: 4,
  },
  {
    label: 'Longitude',
    value: flightgear.longitudeDeg,
    unit: '°',
    decimals: 4,
  },
  {
    label: 'Track',
    value: flightgear.trackDeg,
    unit: '°',
    decimals: 0,
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

const canDisconnect = computed(() => flightgear.connectionState === 'connected')
</script>

<style scoped></style>
