<template>
  <TelemetryPanel title="Primary Flight" :telemetry="primaryFlightTelemetry" />

  <TelemetryPanel title="Motion" :telemetry="primaryFlightTelemetry" />

  <TelemetryPanel title="Position" :telemetry="primaryFlightTelemetry" />
</template>

<script setup lang="ts">
import TelemetryPanel from '@/components/TelemetryPanel.vue'
import type { TelemetryItem } from '@/types/telemetry'

const primaryFlightTelemetry: TelemetryItem[] = [
  {
    label: 'Altitude',
    value: 10000,
    unit: 'ft',
  },
  {
    label: 'Indicated Airspeed',
    value: 250,
    unit: 'kt',
  },
  {
    label: 'Magnetic Heading',
    value: 180,
    unit: '°',
  },
]
</script>

<style scoped></style>
