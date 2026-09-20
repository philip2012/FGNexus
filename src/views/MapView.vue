<template>
  <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
    <div class="mx-auto max-w-7xl">
      <header
        class="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Moving Map</h1>

          <p class="mt-2 text-sm text-slate-400">
            Live aircraft position from FlightGear telemetry.
          </p>
        </div>

        <div class="flex gap-3">
          <RouterLink
            to="/"
            class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Dashboard
          </RouterLink>

          <button
            v-if="canConnect"
            class="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white"
            @click="flightgear.connect()"
          >
            Connect
          </button>
        </div>
      </header>

      <MovingMap />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import MovingMap from '@/components/MovingMap.vue'
import { useFlightGearStore } from '@/stores/flightgear'

const flightgear = useFlightGearStore()

const canConnect = computed(
  () => flightgear.connectionState === 'disconnected' || flightgear.connectionState === 'error',
)
</script>
