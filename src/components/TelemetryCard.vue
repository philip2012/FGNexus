<template>
  <div>
    <p>
      <strong>{{ label }}:</strong>
      {{ value }} {{ unit }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  value: number
  unit: string
}

defineProps<Props>()
</script>

<style scoped></style>
