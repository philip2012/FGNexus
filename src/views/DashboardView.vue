<template>
  <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
    <div class="mx-auto max-w-7xl">
      <header
        class="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 class="text-3xl font-bold tracking-tight">FG Nexus</h1>

          <div class="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <span
              class="h-2.5 w-2.5 rounded-full"
              :class="flightgear.connected ? 'bg-emerald-400' : 'bg-slate-600'"
            ></span>

            <span>
              FlightGear:
              <span class="font-semibold">{{
                flightgear.connected ? 'Connected' : 'Disconnected'
              }}</span>
            </span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            :disabled="flightgear.connected"
            class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed cursor-pointer disabled:opacity-40"
            @click="flightgear.connect()"
          >
            Connect
          </button>

          <button
            :disabled="!flightgear.connected"
            class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed cursor-pointer disabled:opacity-40"
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
  },
  {
    label: 'Indicated Airspeed',
    value: flightgear.airspeedKt,
    unit: 'kt',
  },
  {
    label: 'Magnetic Heading',
    value: flightgear.headingDeg,
    unit: '°',
  },
])

const motionTelemetry = computed<TelemetryItem[]>(() => [
  {
    label: 'Groundspeed',
    value: flightgear.groundspeedKt,
    unit: 'kt',
  },
  {
    label: 'Vertical Speed',
    value: flightgear.verticalSpeedFpm,
    unit: 'ft/min',
  },
  {
    label: 'Pitch',
    value: flightgear.pitchDeg,
    unit: '°',
  },
])

const positionTelemetry = computed<TelemetryItem[]>(() => [
  {
    label: 'Latitude',
    value: flightgear.latitudeDeg,
    unit: '°',
  },
  {
    label: 'Longitude',
    value: flightgear.longitudeDeg,
    unit: '°',
  },
  {
    label: 'Track',
    value: flightgear.trackDeg,
    unit: '°',
  },
])
</script>

<style scoped></style>
