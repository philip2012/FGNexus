<template>
  <div>
    <h2>{{ title }}</h2>

    <p v-for="item in telemetry" :key="item.label">
      <strong>{{ item.label }}:</strong>
      {{ item.value }} {{ item.unit }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { TelemetryItem } from '@/types/telemetry'

interface Props {
  title: string
  telemetry: TelemetryItem[]
}

defineProps<Props>()
</script>

<style scoped></style>
