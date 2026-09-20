<template>
  <section class="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
    <div ref="mapContainer" class="h-[70vh] min-h-130 w-full"></div>

    <div
      class="absolute top-4 left-4 z-10 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm shadow-lg backdrop-blur"
    >
      <div v-if="hasPosition" class="space-y-1">
        <div class="font-medium text-slate-100">Aircraft position</div>

        <div class="font-mono text-xs text-slate-400">
          {{ latitudeLabel }}, {{ longitudeLabel }}
        </div>
      </div>

      <div v-else class="text-slate-400">Waiting for aircraft position...</div>
    </div>

    <button
      data-testid="follow-aircraft"
      v-if="hasPosition"
      class="absolute bottom-4 left-4 z-10 cursor-pointer rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm font-medium text-slate-200 shadow-lg backdrop-blur transition hover:bg-slate-800"
      @click="enableFollow"
    >
      {{ followAircraft ? 'Following aircraft' : 'Follow aircraft' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'

import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useFlightGearStore } from '@/stores/flightgear'

setWorkerUrl(maplibreWorkerUrl)

const flightgear = useFlightGearStore()

const mapContainer = ref<HTMLElement | null>(null)
const followAircraft = ref(true)

let map: MapLibreMap | null = null
let aircraftMarker: Marker | null = null

const hasPosition = computed(
  () =>
    flightgear.latitudeDeg !== null &&
    flightgear.longitudeDeg !== null &&
    Number.isFinite(flightgear.latitudeDeg) &&
    Number.isFinite(flightgear.longitudeDeg),
)

const latitudeLabel = computed(() => {
  if (flightgear.latitudeDeg === null) {
    return '—'
  }

  return `${Math.abs(flightgear.latitudeDeg).toFixed(4)}°${flightgear.latitudeDeg >= 0 ? 'N' : 'S'}`
})

const longitudeLabel = computed(() => {
  if (flightgear.longitudeDeg === null) {
    return '—'
  }

  return `${Math.abs(flightgear.longitudeDeg).toFixed(4)}°${
    flightgear.longitudeDeg >= 0 ? 'E' : 'W'
  }`
})

function createAircraftElement(): HTMLElement {
  const element = document.createElement('div')

  element.style.width = '34px'
  element.style.height = '34px'
  element.style.display = 'grid'
  element.style.placeItems = 'center'
  element.style.filter = 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.65))'

  element.innerHTML = `
    <svg
      viewBox="0 0 32 32"
      width="32"
      height="32"
      aria-hidden="true"
    >
      <path
        d="M16 2 L20 13 L29 17 L29 20 L19 18 L19 26 L23 29 L23 31 L16 29 L9 31 L9 29 L13 26 L13 18 L3 20 L3 17 L12 13 Z"
        fill="white"
        stroke="#0f172a"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
  `

  return element
}

function removeAircraftMarker() {
  aircraftMarker?.remove()
  aircraftMarker = null
}

function updateAircraft() {
  if (
    !map ||
    flightgear.latitudeDeg === null ||
    flightgear.longitudeDeg === null ||
    !Number.isFinite(flightgear.latitudeDeg) ||
    !Number.isFinite(flightgear.longitudeDeg)
  ) {
    removeAircraftMarker()
    return
  }

  const position: [number, number] = [flightgear.longitudeDeg, flightgear.latitudeDeg]

  if (!aircraftMarker) {
    aircraftMarker = new Marker({
      element: createAircraftElement(),
      rotationAlignment: 'map',
    })
      .setLngLat(position)
      .addTo(map)
  }

  aircraftMarker.setLngLat(position)

  aircraftMarker.setRotation(
    flightgear.trackDeg !== null && Number.isFinite(flightgear.trackDeg) ? flightgear.trackDeg : 0,
  )

  if (followAircraft.value) {
    map.jumpTo({
      center: position,
    })
  }
}

function enableFollow() {
  followAircraft.value = true
  updateAircraft()
}

onMounted(() => {
  if (!mapContainer.value) {
    return
  }

  map = new MapLibreMap({
    container: mapContainer.value,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [0, 0],
    zoom: 2,
  })

  map.addControl(
    new NavigationControl({
      showCompass: false,
    }),
    'top-right',
  )

  map.on('error', (event) => {
    console.error('MapLibre error:', event.error)
  })

  map.on('load', () => {
    if (hasPosition.value) {
      map?.jumpTo({
        center: [flightgear.longitudeDeg ?? 0, flightgear.latitudeDeg ?? 0],
        zoom: 9,
      })

      updateAircraft()
    }
  })

  map.on('dragstart', () => {
    followAircraft.value = false
  })
})

watch(
  () => [flightgear.latitudeDeg, flightgear.longitudeDeg, flightgear.trackDeg] as const,
  () => {
    updateAircraft()
  },
)

onUnmounted(() => {
  removeAircraftMarker()

  map?.remove()
  map = null
})
</script>
