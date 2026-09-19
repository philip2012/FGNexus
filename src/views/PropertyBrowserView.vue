<template>
  <main class="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
    <div class="mx-auto max-w-7xl">
      <header class="mb-8 flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Property Browser</h1>

          <p class="mt-2 text-sm text-slate-400">Read and write FlightGear properties.</p>
        </div>

        <RouterLink
          to="/"
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Dashboard
        </RouterLink>
      </header>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
        <PropertyTree @select="selectPropertyNode" />

        <section class="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div class="mb-6 flex items-center justify-between gap-4">
            <div class="text-sm">
              <span class="text-slate-400">FlightGear:</span>

              <span class="ml-2 font-semibold" :class="connectionClass">
                {{ connectionLabel }}
              </span>
            </div>

            <button
              v-if="canConnect"
              class="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white"
              @click="flightgear.connect()"
            >
              Connect
            </button>
          </div>

          <div class="space-y-6">
            <div>
              <label for="property-path" class="mb-2 block text-sm font-medium text-slate-300">
                Property path
              </label>

              <input
                id="property-path"
                v-model="path"
                type="text"
                spellcheck="false"
                :disabled="isWatching"
                class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="/controls/lighting/nav-lights"
              />
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button
                :disabled="isReading || !path.trim()"
                class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                @click="read"
              >
                {{ isReading ? 'Reading...' : 'Read' }}
              </button>

              <button
                :disabled="!isWatching && !canWatch"
                class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                @click="toggleLive"
              >
                {{ isWatching ? 'Stop live' : 'Start live' }}
              </button>

              <span v-if="isWatching" class="text-xs text-emerald-400">
                Watching {{ livePath }}
              </span>
            </div>

            <div>
              <div class="mb-2 text-sm font-medium text-slate-300">Current value</div>

              <div
                data-testid="current-value"
                class="min-h-12 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-sm"
              >
                <span v-if="hasCurrentValue">{{ formattedCurrentValue }}</span>
                <span v-else class="text-slate-600">Not read yet</span>
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-[150px_1fr]">
              <div>
                <label for="value-type" class="mb-2 block text-sm font-medium text-slate-300">
                  Value type
                </label>

                <select
                  id="value-type"
                  v-model="valueType"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="boolean">Boolean</option>
                  <option value="number">Number</option>
                  <option value="string">String</option>
                </select>
              </div>

              <div>
                <label for="new-value" class="mb-2 block text-sm font-medium text-slate-300">
                  New value
                </label>

                <input
                  id="new-value"
                  v-model="newValue"
                  type="text"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <button
                :disabled="isWriting || !canWrite"
                class="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                @click="write"
              >
                {{ isWriting ? 'Writing...' : 'Write' }}
              </button>
            </div>

            <div
              v-if="error"
              class="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              {{ error }}
            </div>

            <div
              v-if="success"
              class="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
            >
              {{ success }}
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useFlightGearStore } from '@/stores/flightgear'
import type { FlightGearPropertyNode, FlightGearPropertyValue } from '@/services/flightgear-client'
import PropertyTree from '@/components/PropertyTree.vue'

type ValueType = 'boolean' | 'number' | 'string'

const flightgear = useFlightGearStore()

const path = ref('/controls/lighting/nav-lights')

const currentValue = ref<unknown>(null)
const hasCurrentValue = ref(false)

const valueType = ref<ValueType>('boolean')
const newValue = ref('false')

const isReading = ref(false)
const isWriting = ref(false)

const error = ref<string | null>(null)
const success = ref<string | null>(null)

let stopLiveSubscription: (() => void) | null = null

const livePath = ref<string | null>(null)

const isWatching = computed(() => livePath.value !== null)

const canWatch = computed(
  () => flightgear.connectionState === 'connected' && path.value.trim().length > 0,
)

const connectionLabel = computed(() => {
  switch (flightgear.connectionState) {
    case 'connected':
      return 'Connected'

    case 'connecting':
      return 'Connecting...'

    case 'disconnecting':
      return 'Disconnecting...'

    case 'error':
      return 'Connection error'

    default:
      return 'Disconnected'
  }
})

const connectionClass = computed(() => {
  switch (flightgear.connectionState) {
    case 'connected':
      return 'text-emerald-400'

    case 'connecting':
    case 'disconnecting':
      return 'text-amber-400'

    case 'error':
      return 'text-red-400'

    default:
      return 'text-slate-500'
  }
})

const canConnect = computed(
  () => flightgear.connectionState === 'disconnected' || flightgear.connectionState === 'error',
)

const canWrite = computed(
  () =>
    flightgear.connectionState === 'connected' &&
    path.value.trim().length > 0 &&
    newValue.value.length > 0,
)

const formattedCurrentValue = computed(() => {
  if (typeof currentValue.value === 'string') {
    return JSON.stringify(currentValue.value)
  }

  return String(currentValue.value)
})

function getErrorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message
  }

  return String(value)
}

function inferValueType(value: unknown) {
  switch (typeof value) {
    case 'boolean':
      valueType.value = 'boolean'
      newValue.value = String(value)
      break

    case 'number':
      valueType.value = 'number'
      newValue.value = String(value)
      break

    case 'string':
      valueType.value = 'string'
      newValue.value = value
      break
  }
}

function stopWatching() {
  stopLiveSubscription?.()

  stopLiveSubscription = null
  livePath.value = null
}

async function startWatching() {
  const propertyPath = path.value.trim()

  if (!propertyPath || flightgear.connectionState !== 'connected') {
    return
  }

  stopWatching()

  error.value = null
  success.value = null

  let receivedLiveValue = false

  try {
    livePath.value = propertyPath

    stopLiveSubscription = flightgear.subscribeProperty(propertyPath, (value) => {
      if (livePath.value !== propertyPath) {
        return
      }

      receivedLiveValue = true
      currentValue.value = value
      hasCurrentValue.value = true
    })

    try {
      const initialValue = await flightgear.readProperty(propertyPath)

      if (livePath.value === propertyPath && !receivedLiveValue) {
        currentValue.value = initialValue
        hasCurrentValue.value = true

        inferValueType(initialValue)
      }
    } catch (readError) {
      if (livePath.value === propertyPath) {
        error.value = `Live watch started, but initial read failed: ${getErrorMessage(readError)}`
      }
    }
  } catch (watchError) {
    stopWatching()
    error.value = getErrorMessage(watchError)
  }
}

async function toggleLive() {
  if (isWatching.value) {
    stopWatching()
    return
  }

  await startWatching()
}

function selectPropertyNode(node: FlightGearPropertyNode) {
  stopWatching()

  path.value = node.path
  error.value = null
  success.value = null

  if (Object.prototype.hasOwnProperty.call(node, 'value')) {
    currentValue.value = node.value
    hasCurrentValue.value = true

    inferValueType(node.value)
    return
  }

  currentValue.value = null
  hasCurrentValue.value = false
}

function parseNewValue(): FlightGearPropertyValue {
  switch (valueType.value) {
    case 'boolean': {
      const normalized = newValue.value.trim().toLowerCase()

      if (normalized === 'true') {
        return true
      }

      if (normalized === 'false') {
        return false
      }

      throw new Error('Boolean values must be true or false')
    }

    case 'number': {
      if (newValue.value.trim() === '') {
        throw new Error('Number value cannot be empty')
      }

      const parsed = Number(newValue.value)

      if (!Number.isFinite(parsed)) {
        throw new Error('Enter a valid finite number')
      }

      return parsed
    }

    case 'string':
      return newValue.value
  }
}

async function confirmPropertyValue(
  propertyPath: string,
  expectedValue: FlightGearPropertyValue,
): Promise<unknown> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 50))

    const actualValue = await flightgear.readProperty(propertyPath)

    if (Object.is(actualValue, expectedValue)) {
      return actualValue
    }
  }

  throw new Error('FlightGear did not confirm the requested property value')
}

async function read() {
  const propertyPath = path.value.trim()

  if (!propertyPath) {
    return
  }

  isReading.value = true
  error.value = null
  success.value = null

  try {
    currentValue.value = await flightgear.readProperty(propertyPath)
    hasCurrentValue.value = true

    inferValueType(currentValue.value)
  } catch (readError) {
    error.value = getErrorMessage(readError)
  } finally {
    isReading.value = false
  }
}

async function write() {
  const propertyPath = path.value.trim()

  if (!propertyPath) {
    return
  }

  isWriting.value = true
  error.value = null
  success.value = null

  try {
    const value = parseNewValue()

    flightgear.setProperty(propertyPath, value)

    currentValue.value = await confirmPropertyValue(propertyPath, value)
    hasCurrentValue.value = true

    success.value = 'Property updated successfully.'
  } catch (writeError) {
    error.value = getErrorMessage(writeError)
  } finally {
    isWriting.value = false
  }
}

onUnmounted(() => {
  stopWatching()
})
</script>
