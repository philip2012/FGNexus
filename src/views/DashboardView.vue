<template>
  <TelemetryPanel title="Primary Flight" :telemetry="primaryFlightTelemetry" />

  <TelemetryPanel title="Motion" :telemetry="motionTelemetry" />

  <TelemetryPanel title="Position" :telemetry="positionTelemetry" />

  <button @click="flightgear.connect()">Connect</button>
  <button @click="flightgear.disconnect()">Disconnect</button>

  <p>
    {{ flightgear.connected ? 'Connected' : 'Disconnected' }}
  </p>
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
