<template>
  <TelemetryPanel :telemetry="telemetry" />
</template>

<script setup lang="ts">
import TelemetryPanel from '@/components/TelemetryPanel.vue'

interface TelemetryItem {
  label: string
  value: number
  unit: string
}

const telemetry: TelemetryItem[] = [
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
