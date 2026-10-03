<template>
  <section class="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-slate-100">Airport search</h2>

      <p class="mt-1 text-sm text-slate-400">
        Search FlightGear's navigation database by airport ICAO or name.
      </p>
    </div>

    <input
      v-model="query"
      type="search"
      spellcheck="false"
      autocomplete="off"
      placeholder="VVTS or Tan Son Nhat"
      class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
      @focus="navdata.loadAirports()"
    />

    <div v-if="navdata.isLoadingAirports" class="mt-3 text-sm text-slate-400">
      Loading airport database...
    </div>

    <div
      v-else-if="navdata.airportIndexError"
      class="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
    >
      {{ navdata.airportIndexError }}
    </div>

    <div
      v-else-if="query.trim().length >= 2 && results.length === 0"
      class="mt-3 text-sm text-slate-500"
    >
      No matching airports.
    </div>

    <div
      v-else-if="results.length > 0"
      class="mt-3 overflow-hidden rounded-lg border border-slate-800"
    >
      <button
        v-for="airport in results"
        :key="airport.id"
        type="button"
        class="flex w-full cursor-pointer items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-4 py-3 text-left last:border-b-0 hover:bg-slate-900"
        @click="selectAirport(airport.id)"
      >
        <div class="min-w-0">
          <div class="font-medium text-slate-100">
            {{ airport.name }}
          </div>

          <div class="mt-1 font-mono text-xs text-slate-500">
            {{ airport.id }}
          </div>
        </div>

        <span class="text-xs text-slate-600">Select</span>
      </button>
    </div>

    <div v-if="navdata.isLoadingAirport" class="mt-4 text-sm text-slate-400">
      Loading airport details...
    </div>

    <div
      v-else-if="navdata.airportError"
      class="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
    >
      {{ navdata.airportError }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { useNavDataStore } from '@/stores/navdata'

const navdata = useNavDataStore()

const query = ref('')

const results = computed(() => {
  const value = query.value.trim().toLowerCase()

  if (value.length < 2) {
    return []
  }

  return navdata.airports
    .filter(
      (airport) =>
        airport.id.toLowerCase().includes(value) || airport.name.toLowerCase().includes(value),
    )
    .sort((a, b) => {
      const aExact = a.id.toLowerCase() === value
      const bExact = b.id.toLowerCase() === value

      if (aExact !== bExact) {
        return aExact ? -1 : 1
      }

      const aStarts = a.id.toLowerCase().startsWith(value)
      const bStarts = b.id.toLowerCase().startsWith(value)

      if (aStarts !== bStarts) {
        return aStarts ? -1 : 1
      }

      return a.id.localeCompare(b.id)
    })
    .slice(0, 10)
})

async function selectAirport(id: string) {
  query.value = id

  await navdata.selectAirport(id)
}
</script>
