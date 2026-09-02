import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import TelemetryPanel from '@/components/TelemetryPanel.vue'
import type { TelemetryItem } from '@/types/telemetry'

function mountPanel(telemetry: TelemetryItem[]) {
  return mount(TelemetryPanel, {
    props: {
      title: 'Test Telemetry',
      telemetry,
    },
  })
}

describe('TelemetryPanel', () => {
  it('renders the panel title and basic telemetry value', () => {
    const wrapper = mountPanel([
      {
        label: 'Altitude',
        value: 10000,
        unit: 'ft',
        decimals: 0,
      },
    ])

    expect(wrapper.text()).toContain('Test Telemetry')
    expect(wrapper.text()).toContain('Altitude')
    expect(wrapper.text()).toContain('10,000')
    expect(wrapper.text()).toContain('ft')
  })

  it('renders unavailable telemetry as a dash', () => {
    const wrapper = mountPanel([
      {
        label: 'Airspeed',
        value: null,
        unit: 'kt',
        decimals: 0,
      },
    ])

    expect(wrapper.text()).toContain('Airspeed')
    expect(wrapper.text()).toContain('—')
    expect(wrapper.text()).not.toContain('kt')
  })

  it('adds a plus sign to positive signed telemetry', () => {
    const wrapper = mountPanel([
      {
        label: 'Vertical Speed',
        value: 500,
        unit: 'ft/min',
        decimals: 0,
        signed: true,
      },
    ])

    expect(wrapper.text()).toContain('+500')
    expect(wrapper.text()).toContain('ft/min')
  })

  it('preserves the minus sign on negative signed telemetry', () => {
    const wrapper = mountPanel([
      {
        label: 'Vertical Speed',
        value: -500,
        unit: 'ft/min',
        decimals: 0,
        signed: true,
      },
    ])

    expect(wrapper.text()).toContain('-500')
  })

  it('pads aviation headings to three digits', () => {
    const wrapper = mountPanel([
      {
        label: 'Magnetic Heading',
        value: 26,
        unit: '°',
        decimals: 0,
        padded: 3,
      },
    ])

    expect(wrapper.text()).toContain('026')
    expect(wrapper.text()).toContain('°')
  })

  it('formats north latitude with a hemisphere indicator', () => {
    const wrapper = mountPanel([
      {
        label: 'Latitude',
        value: 28.6327,
        unit: '',
        decimals: 4,
        coordinate: 'latitude',
      },
    ])

    expect(wrapper.text()).toContain('28.6327° N')
  })

  it('formats south latitude with a hemisphere indicator', () => {
    const wrapper = mountPanel([
      {
        label: 'Latitude',
        value: -33.8688,
        unit: '',
        decimals: 4,
        coordinate: 'latitude',
      },
    ])

    expect(wrapper.text()).toContain('33.8688° S')
    expect(wrapper.text()).not.toContain('-33.8688')
  })

  it('formats east longitude with a hemisphere indicator', () => {
    const wrapper = mountPanel([
      {
        label: 'Longitude',
        value: 106.6297,
        unit: '',
        decimals: 4,
        coordinate: 'longitude',
      },
    ])

    expect(wrapper.text()).toContain('106.6297° E')
  })

  it('formats west longitude with a hemisphere indicator', () => {
    const wrapper = mountPanel([
      {
        label: 'Longitude',
        value: -80.7054,
        unit: '',
        decimals: 4,
        coordinate: 'longitude',
      },
    ])

    expect(wrapper.text()).toContain('80.7054° W')
    expect(wrapper.text()).not.toContain('-80.7054')
  })

  it('does not render an empty unit element', () => {
    const wrapper = mountPanel([
      {
        label: 'Mach',
        value: 0.782,
        unit: '',
        decimals: 3,
      },
    ])

    expect(wrapper.text()).toContain('0.782')
  })
})
