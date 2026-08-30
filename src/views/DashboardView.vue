<template>
  <div>
    <TelemetryCard label="Altitude" :value="altitude" unit="ft" />
    <TelemetryCard label="Indicated Airspeed" :value="airspeed" unit="kt" />
    <TelemetryCard label="Magnetic Heading" :value="heading" unit="°" />
  </div>
</template>

<script setup lang="ts">
import TelemetryCard from '@/components/TelemetryCard.vue'

const airspeed = 250
const altitude = 10000
const heading = 180
</script>

<style scoped></style>
