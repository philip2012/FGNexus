import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import App from '@/App.vue'

describe('App', () => {
  it('renders the router view', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
        },
      },
    })

    expect(wrapper.find('router-view-stub').exists()).toBe(true)
  })
})
