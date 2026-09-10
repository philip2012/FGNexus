import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'

import PropertyBrowserView from '@/views/PropertyBrowserView.vue'
import { useFlightGearStore } from '@/stores/flightgear'

let pinia: Pinia

function mountView() {
  return mount(PropertyBrowserView, {
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: true,
      },
    },
  })
}

function getButton(wrapper: VueWrapper, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === label)

  if (!button) {
    throw new Error(`Button "${label}" was not found`)
  }

  return button
}

describe('PropertyBrowserView', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('reads a property and infers its value type', async () => {
    const flightgear = useFlightGearStore()

    const readProperty = vi.spyOn(flightgear, 'readProperty').mockResolvedValue(true)

    const wrapper = mountView()

    await getButton(wrapper, 'Read').trigger('click')
    await flushPromises()

    expect(readProperty).toHaveBeenCalledWith('/controls/lighting/nav-lights')

    expect(wrapper.text()).toContain('true')

    expect((wrapper.get('#value-type').element as HTMLSelectElement).value).toBe('boolean')

    expect((wrapper.get('#new-value').element as HTMLInputElement).value).toBe('true')
  })

  it('shows read errors', async () => {
    const flightgear = useFlightGearStore()

    vi.spyOn(flightgear, 'readProperty').mockRejectedValue(
      new Error('Unable to read FlightGear property'),
    )

    const wrapper = mountView()

    await getButton(wrapper, 'Read').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to read FlightGear property')
  })

  it('writes a boolean property and reads the value back', async () => {
    vi.useFakeTimers()

    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    const setProperty = vi.spyOn(flightgear, 'setProperty').mockImplementation(() => {})
    const readProperty = vi.spyOn(flightgear, 'readProperty').mockResolvedValue(false)

    const wrapper = mountView()

    await getButton(wrapper, 'Write').trigger('click')

    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(setProperty).toHaveBeenCalledWith('/controls/lighting/nav-lights', false)

    expect(readProperty).toHaveBeenCalledWith('/controls/lighting/nav-lights')

    expect(wrapper.text()).toContain('Property updated successfully.')
    expect(wrapper.text()).toContain('false')
  })

  it('rejects invalid boolean values', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    const setProperty = vi.spyOn(flightgear, 'setProperty').mockImplementation(() => {})

    const wrapper = mountView()

    await wrapper.get('#new-value').setValue('yes')
    await getButton(wrapper, 'Write').trigger('click')
    await flushPromises()

    expect(setProperty).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Boolean values must be true or false')
  })

  it('converts number input before writing', async () => {
    vi.useFakeTimers()

    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    const setProperty = vi.spyOn(flightgear, 'setProperty').mockImplementation(() => {})
    vi.spyOn(flightgear, 'readProperty').mockResolvedValue(123.5)

    const wrapper = mountView()

    await wrapper.get('#value-type').setValue('number')
    await wrapper.get('#new-value').setValue('123.5')

    await getButton(wrapper, 'Write').trigger('click')

    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(setProperty).toHaveBeenCalledWith('/controls/lighting/nav-lights', 123.5)
    expect(wrapper.text()).toContain('Property updated successfully.')
  })

  it('preserves string input when writing', async () => {
    vi.useFakeTimers()

    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    const setProperty = vi.spyOn(flightgear, 'setProperty').mockImplementation(() => {})
    vi.spyOn(flightgear, 'readProperty').mockResolvedValue('hello FlightGear')

    const wrapper = mountView()

    await wrapper.get('#value-type').setValue('string')
    await wrapper.get('#new-value').setValue('hello FlightGear')

    await getButton(wrapper, 'Write').trigger('click')

    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(setProperty).toHaveBeenCalledWith('/controls/lighting/nav-lights', 'hello FlightGear')
    expect(wrapper.text()).toContain('Property updated successfully.')
  })
})
