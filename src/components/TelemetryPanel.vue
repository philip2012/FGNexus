<template>
  <section class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">
        {{ title }}
      </h2>
    </div>

    <div class="divide-y divide-slate-800">
      <div
        v-for="item in telemetry"
        :key="item.label"
        class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
      >
        <span class="text-sm text-slate-400">
          {{ item.label }}
        </span>

        <div class="text-right">
          <span class="text-lg font-semibold tabular-nums text-slate-100">
            {{ formatValue(item) }}
          </span>

          <span class="ml-1 text-xs text-slate-500">
            {{ item.unit }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TelemetryItem } from '@/types/telemetry'

interface Props {
  title: string
  telemetry: TelemetryItem[]
}

defineProps<Props>()

function formatValue(item: TelemetryItem) {
  const formatted = item.value.toLocaleString(undefined, {
    minimumFractionDigits: item.decimals ?? 0,
    maximumFractionDigits: item.decimals ?? 0,
  })

  if (item.signed && item.value > 0) {
    return `+${formatted}`
  }

  return formatted
}
</script>

<style scoped></style>
