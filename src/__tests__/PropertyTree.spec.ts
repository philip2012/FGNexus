import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PropertyTree from '@/components/PropertyTree.vue'
import { useFlightGearStore } from '@/stores/flightgear'
import type { FlightGearPropertyNode } from '@/services/flightgear-client'

let pinia: Pinia

function makeRoot(): FlightGearPropertyNode {
  return {
    path: '/',
    name: '',
    type: '-',
    index: 0,
    nChildren: 2,
    children: [
      {
        path: '/controls',
        name: 'controls',
        type: '-',
        index: 0,
        nChildren: 1,
      },
      {
        path: '/position',
        name: 'position',
        type: '-',
        index: 0,
        nChildren: 0,
        value: 123,
      },
    ],
  }
}

describe('PropertyTree', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('loads and displays the root property hierarchy when connected', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    const readPropertyNode = vi.spyOn(flightgear, 'readPropertyNode').mockResolvedValue(makeRoot())

    const wrapper = mount(PropertyTree, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    expect(readPropertyNode).toHaveBeenCalledWith('/', 1)

    expect(wrapper.find('[data-path="/controls"]').exists()).toBe(true)
    expect(wrapper.find('[data-path="/position"]').exists()).toBe(true)
  })

  it('lazy-loads children when expanding a node', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    const readPropertyNode = vi
      .spyOn(flightgear, 'readPropertyNode')
      .mockImplementation(async (path) => {
        if (path === '/') {
          return makeRoot()
        }

        if (path === '/controls') {
          return {
            path: '/controls',
            name: 'controls',
            type: '-',
            index: 0,
            nChildren: 1,
            children: [
              {
                path: '/controls/lighting',
                name: 'lighting',
                type: '-',
                index: 0,
                nChildren: 0,
                value: true,
              },
            ],
          }
        }

        throw new Error(`Unexpected property path: ${path}`)
      })

    const wrapper = mount(PropertyTree, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    const controlsRow = wrapper.get('[data-path="/controls"]')

    await controlsRow.get('[data-testid="tree-toggle"]').trigger('click')
    await flushPromises()

    expect(readPropertyNode).toHaveBeenCalledWith('/controls', 1)
    expect(wrapper.find('[data-path="/controls/lighting"]').exists()).toBe(true)
  })

  it('collapses an expanded property node without reloading it', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    const readPropertyNode = vi
      .spyOn(flightgear, 'readPropertyNode')
      .mockImplementation(async (path) => {
        if (path === '/') {
          return makeRoot()
        }

        return {
          path: '/controls',
          name: 'controls',
          type: '-',
          index: 0,
          nChildren: 1,
          children: [
            {
              path: '/controls/lighting',
              name: 'lighting',
              type: '-',
              index: 0,
              nChildren: 0,
            },
          ],
        }
      })

    const wrapper = mount(PropertyTree, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    let controlsRow = wrapper.get('[data-path="/controls"]')

    await controlsRow.get('[data-testid="tree-toggle"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-path="/controls/lighting"]').exists()).toBe(true)

    controlsRow = wrapper.get('[data-path="/controls"]')

    await controlsRow.get('[data-testid="tree-toggle"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-path="/controls/lighting"]').exists()).toBe(false)

    expect(readPropertyNode.mock.calls.filter(([path]) => path === '/controls')).toHaveLength(1)
  })

  it('emits the selected property node', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    vi.spyOn(flightgear, 'readPropertyNode').mockResolvedValue(makeRoot())

    const wrapper = mount(PropertyTree, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    await wrapper.get('[data-path="/position"]').trigger('click')

    const emitted = wrapper.emitted<[FlightGearPropertyNode]>('select')

    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]?.[0].path).toBe('/position')
    expect(emitted?.[0]?.[0].value).toBe(123)
  })

  it('refreshes the root hierarchy', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    const readPropertyNode = vi.spyOn(flightgear, 'readPropertyNode').mockResolvedValue(makeRoot())

    const wrapper = mount(PropertyTree, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    const refreshButton = wrapper.findAll('button').find((button) => button.text() === 'Refresh')

    if (!refreshButton) {
      throw new Error('Refresh button was not found')
    }

    await refreshButton.trigger('click')
    await flushPromises()

    expect(readPropertyNode).toHaveBeenCalledTimes(2)
  })

  it('clears the hierarchy when FlightGear disconnects', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    vi.spyOn(flightgear, 'readPropertyNode').mockResolvedValue(makeRoot())

    const wrapper = mount(PropertyTree, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    expect(wrapper.find('[data-path="/controls"]').exists()).toBe(true)

    flightgear.connectionState = 'disconnected'

    await flushPromises()

    expect(wrapper.find('[data-path="/controls"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Connect to FlightGear to browse the property tree.')
  })

  it('sorts sibling property nodes alphabetically', async () => {
    const flightgear = useFlightGearStore()

    flightgear.connectionState = 'connected'

    vi.spyOn(flightgear, 'readPropertyNode').mockResolvedValue({
      path: '/',
      name: '',
      type: '-',
      index: 0,
      nChildren: 4,
      children: [
        {
          path: '/velocities',
          name: 'velocities',
          type: '-',
          index: 0,
          nChildren: 0,
        },
        {
          path: '/controls',
          name: 'controls',
          type: '-',
          index: 0,
          nChildren: 0,
        },
        {
          path: '/sim',
          name: 'sim',
          type: '-',
          index: 0,
          nChildren: 0,
        },
        {
          path: '/environment',
          name: 'environment',
          type: '-',
          index: 0,
          nChildren: 0,
        },
      ],
    })

    const wrapper = mount(PropertyTree, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    const paths = wrapper.findAll('[data-path]').map((row) => row.attributes('data-path'))

    expect(paths).toEqual(['/controls', '/environment', '/sim', '/velocities'])
  })
})
