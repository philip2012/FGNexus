<template>
  <div>
    <p v-for="item in telemetry" :key="item.label">
      <strong>{{ item.label }}:</strong>
      {{ item.value }} {{ item.unit }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface TelemetryItem {
  label: string
  value: number
  unit: string
}

interface Props {
  telemetry: TelemetryItem[]
}

defineProps<Props>()
</script>

<style scoped></style>
