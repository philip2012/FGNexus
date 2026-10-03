import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  FlightGearClient,
  type FlightGearAirport,
  type FlightGearAirportSummary,
} from '@/services/flightgear-client'

export const useNavDataStore = defineStore('navdata', () => {
  const flightGearClient = new FlightGearClient()

  const airports = ref<FlightGearAirportSummary[]>([])
  const selectedAirport = ref<FlightGearAirport | null>(null)

  const isLoadingAirports = ref(false)
  const isLoadingAirport = ref(false)

  const airportIndexError = ref<string | null>(null)
  const airportError = ref<string | null>(null)

  const hasAirportIndex = computed(() => airports.value.length > 0)

  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  async function loadAirports() {
    if (hasAirportIndex.value || isLoadingAirports.value) {
      return
    }

    isLoadingAirports.value = true
    airportIndexError.value = null

    try {
      airports.value = await flightGearClient.fetchAirports()
    } catch (error) {
      airportIndexError.value = getErrorMessage(error)
    } finally {
      isLoadingAirports.value = false
    }
  }

  async function selectAirport(id: string) {
    isLoadingAirport.value = true
    airportError.value = null

    try {
      selectedAirport.value = await flightGearClient.fetchAirport(id)
    } catch (error) {
      selectedAirport.value = null
      airportError.value = getErrorMessage(error)
    } finally {
      isLoadingAirport.value = false
    }
  }

  function clearSelectedAirport() {
    selectedAirport.value = null
    airportError.value = null
  }

  return {
    airports,
    selectedAirport,

    isLoadingAirports,
    isLoadingAirport,

    airportIndexError,
    airportError,

    hasAirportIndex,

    loadAirports,
    selectAirport,
    clearSelectedAirport,
  }
})
