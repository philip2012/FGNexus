<template>
  <section v-if="airport" class="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold text-slate-100">
            {{ airport.name }}
          </h2>

          <span
            class="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-300"
          >
            {{ airport.id }}
          </span>
        </div>

        <p class="mt-2 text-sm text-slate-400">
          {{ formatCoordinate(airport.latitudeDeg, 'N', 'S') }},
          {{ formatCoordinate(airport.longitudeDeg, 'E', 'W') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          @click="emit('showOnMap')"
        >
          Show on map
        </button>

        <button
          type="button"
          class="cursor-pointer text-sm text-slate-500 transition hover:text-slate-300"
          @click="navdata.clearSelectedAirport()"
        >
          Close
        </button>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Elevation</div>

        <div class="mt-2 text-lg font-semibold">
          {{ Math.round(airport.elevationM * 3.28084) }} ft
        </div>
      </div>

      <div class="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Runways</div>

        <div class="mt-2 text-lg font-semibold">
          {{ airport.runways.length }}
        </div>
      </div>

      <div class="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Longest runway</div>

        <div class="mt-2 text-lg font-semibold">
          {{ Math.round(airport.longestRunwayLengthM) }} m
        </div>
      </div>

      <div class="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">METAR</div>

        <div class="mt-2 text-lg font-semibold">
          {{ airport.hasMetar ? 'Available' : 'Unavailable' }}
        </div>
      </div>
    </div>

    <div class="mt-6">
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Runways</h3>

      <div class="overflow-x-auto rounded-lg border border-slate-800">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-950 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3">Runway</th>
              <th class="px-4 py-3">Heading</th>
              <th class="px-4 py-3">Length</th>
              <th class="px-4 py-3">Width</th>
              <th class="px-4 py-3">Surface</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="runway in airport.runways"
              :key="runway.id"
              class="border-t border-slate-800"
            >
              <td class="px-4 py-3 font-mono font-medium text-slate-200">
                {{ runway.id }}
              </td>

              <td class="px-4 py-3">{{ runway.headingDeg.toFixed(1) }}°</td>

              <td class="px-4 py-3">{{ Math.round(runway.lengthM) }} m</td>

              <td class="px-4 py-3">{{ Math.round(runway.widthM) }} m</td>

              <td class="px-4 py-3 capitalize">
                {{ runway.surface }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="airport.comms.length > 0" class="mt-6">
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Communications
      </h3>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(comm, index) in airport.comms"
          :key="`${comm.id}-${comm.mhz}-${index}`"
          class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3"
        >
          <span class="font-medium text-slate-300">
            {{ comm.id }}
          </span>

          <span class="font-mono text-slate-100">
            {{ comm.mhz.toFixed(3) }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useNavDataStore } from '@/stores/navdata'

const emit = defineEmits<{
  showOnMap: []
}>()

const navdata = useNavDataStore()

const airport = computed(() => navdata.selectedAirport)

function formatCoordinate(value: number, positiveHemisphere: string, negativeHemisphere: string) {
  const hemisphere = value >= 0 ? positiveHemisphere : negativeHemisphere

  return `${Math.abs(value).toFixed(5)}° ${hemisphere}`
}
</script>
