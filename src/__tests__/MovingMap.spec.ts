import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MovingMap from '@/components/MovingMap.vue'
import { useFlightGearStore } from '@/stores/flightgear'

const maplibre = vi.hoisted(() => {
  type MapEventHandler = (...args: unknown[]) => void

  type JumpToOptions = {
    center: [number, number]
    zoom?: number
  }

  type MapMock = {
    addControl: ReturnType<typeof vi.fn<(control: unknown, position?: string) => void>>
    jumpTo: ReturnType<typeof vi.fn<(options: JumpToOptions) => void>>
    remove: ReturnType<typeof vi.fn<() => void>>
    on: ReturnType<typeof vi.fn<(event: string, handler: MapEventHandler) => void>>
  }

  type MarkerMock = {
    setLngLat: ReturnType<typeof vi.fn<(position: [number, number]) => MarkerMock>>
    setRotation: ReturnType<typeof vi.fn<(rotation: number) => void>>
    addTo: ReturnType<typeof vi.fn<(map: MapMock) => MarkerMock>>
    remove: ReturnType<typeof vi.fn<() => void>>
  }

  const handlers = new Map<string, MapEventHandler>()

  const map = {} as MapMock

  map.addControl = vi.fn<(control: unknown, position?: string) => void>()
  map.jumpTo = vi.fn<(options: JumpToOptions) => void>()
  map.remove = vi.fn<() => void>()
  map.on = vi.fn<(event: string, handler: MapEventHandler) => void>((event, handler) => {
    handlers.set(event, handler)
  })

  const marker = {} as MarkerMock

  marker.setLngLat = vi.fn<(position: [number, number]) => MarkerMock>(() => marker)

  marker.setRotation = vi.fn<(rotation: number) => void>()

  marker.addTo = vi.fn<(map: MapMock) => MarkerMock>(() => marker)

  marker.remove = vi.fn<() => void>()

  return {
    handlers,
    map,
    marker,

    Map: vi.fn<(options: unknown) => MapMock>(function MapMockConstructor() {
      return map
    }),

    Marker: vi.fn<(options: unknown) => MarkerMock>(function MarkerMockConstructor() {
      return marker
    }),

    NavigationControl: vi.fn<(options?: unknown) => object>(
      function NavigationControlMockConstructor() {
        return {}
      },
    ),

    setWorkerUrl: vi.fn<(url: string) => void>(),
  }
})

vi.mock('maplibre-gl', () => ({
  Map: maplibre.Map,
  Marker: maplibre.Marker,
  NavigationControl: maplibre.NavigationControl,
  setWorkerUrl: maplibre.setWorkerUrl,
}))

vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({
  default: '/mock-maplibre-worker.js',
}))

let pinia: Pinia

function mountMap() {
  return mount(MovingMap, {
    global: {
      plugins: [pinia],
    },
  })
}

function triggerMapEvent(event: string) {
  maplibre.handlers.get(event)?.()
}

describe('MovingMap', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    maplibre.handlers.clear()

    maplibre.Map.mockClear()
    maplibre.Marker.mockClear()
    maplibre.NavigationControl.mockClear()

    maplibre.map.addControl.mockClear()
    maplibre.map.jumpTo.mockClear()
    maplibre.map.remove.mockClear()
    maplibre.map.on.mockClear()

    maplibre.marker.setLngLat.mockClear()
    maplibre.marker.setRotation.mockClear()
    maplibre.marker.addTo.mockClear()
    maplibre.marker.remove.mockClear()
  })

  it('shows a waiting state before aircraft position is available', () => {
    const wrapper = mountMap()

    expect(wrapper.text()).toContain('Waiting for aircraft position...')
    expect(maplibre.Marker).not.toHaveBeenCalled()
  })

  it('creates and updates the aircraft marker from FlightGear telemetry', async () => {
    const flightgear = useFlightGearStore()

    flightgear.latitudeDeg = 14.5926
    flightgear.longitudeDeg = -60.9938
    flightgear.trackDeg = 125

    const wrapper = mountMap()

    triggerMapEvent('load')
    await flushPromises()

    expect(maplibre.Marker).toHaveBeenCalledWith(
      expect.objectContaining({
        rotationAlignment: 'map',
      }),
    )

    expect(maplibre.marker.setLngLat).toHaveBeenCalledWith([-60.9938, 14.5926])
    expect(maplibre.marker.setRotation).toHaveBeenCalledWith(125)
    expect(maplibre.marker.addTo).toHaveBeenCalledWith(maplibre.map)

    expect(maplibre.map.jumpTo).toHaveBeenCalledWith({
      center: [-60.9938, 14.5926],
      zoom: 9,
    })

    expect(wrapper.text()).toContain('14.5926°N')
    expect(wrapper.text()).toContain('60.9938°W')
  })

  it('stops following after dragging and resumes when requested', async () => {
    const flightgear = useFlightGearStore()

    flightgear.latitudeDeg = 14.5926
    flightgear.longitudeDeg = -60.9938
    flightgear.trackDeg = 125

    const wrapper = mountMap()

    triggerMapEvent('load')
    await flushPromises()

    triggerMapEvent('dragstart')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Follow aircraft')

    maplibre.map.jumpTo.mockClear()

    flightgear.latitudeDeg = 14.6
    flightgear.longitudeDeg = -61

    await wrapper.vm.$nextTick()

    expect(maplibre.marker.setLngLat).toHaveBeenCalledWith([-61, 14.6])
    expect(maplibre.map.jumpTo).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="follow-aircraft"]').trigger('click')

    expect(maplibre.map.jumpTo).toHaveBeenCalledWith({
      center: [-61, 14.6],
    })

    expect(wrapper.text()).toContain('Following aircraft')
  })

  it('removes stale map resources when position disappears and on unmount', async () => {
    const flightgear = useFlightGearStore()

    flightgear.latitudeDeg = 14.5926
    flightgear.longitudeDeg = -60.9938
    flightgear.trackDeg = 125

    const wrapper = mountMap()

    triggerMapEvent('load')
    await flushPromises()

    flightgear.latitudeDeg = null
    flightgear.longitudeDeg = null

    await wrapper.vm.$nextTick()

    expect(maplibre.marker.remove).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Waiting for aircraft position...')

    wrapper.unmount()

    expect(maplibre.map.remove).toHaveBeenCalledOnce()
  })

  it('configures the MapLibre worker for Vite', () => {
    const callsBeforeMount = maplibre.setWorkerUrl.mock.calls.length

    const wrapper = mountMap()

    expect(maplibre.setWorkerUrl).toHaveBeenCalledTimes(callsBeforeMount + 1)
    expect(maplibre.setWorkerUrl).toHaveBeenNthCalledWith(
      callsBeforeMount + 1,
      '/mock-maplibre-worker.js',
    )

    wrapper.unmount()
  })
})
