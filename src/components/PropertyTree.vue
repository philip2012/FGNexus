<template>
  <div class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
    <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <div>
        <div class="text-sm font-semibold text-slate-200">Property Tree</div>
        <div class="mt-0.5 text-xs text-slate-500">
          Expand nodes to browse the FlightGear property hierarchy.
        </div>
      </div>

      <button
        :disabled="loadingRoot"
        class="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        @click="loadRoot"
      >
        {{ loadingRoot ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div class="h-[65vh] overflow-auto font-mono text-sm">
      <div
        v-if="loadingRoot && !root"
        class="flex h-full items-center justify-center text-slate-500"
      >
        Loading property tree...
      </div>

      <div v-else-if="treeError && !root" class="p-4 text-sm text-red-300">
        {{ treeError }}
      </div>

      <div
        v-else-if="!root"
        class="flex h-full items-center justify-center px-4 text-center text-slate-500"
      >
        Connect to FlightGear to browse the property tree.
      </div>

      <template v-else>
        <button
          v-for="row in visibleRows"
          :key="row.entry.node.path"
          type="button"
          :data-path="row.entry.node.path"
          class="flex w-full cursor-pointer items-center gap-2 border-b border-slate-900 px-2 py-1.5 text-left transition hover:bg-slate-800/70"
          :class="
            selectedPath === row.entry.node.path ? 'bg-slate-800 text-white' : 'text-slate-300'
          "
          @click="selectEntry(row.entry)"
        >
          <span class="shrink-0" :style="{ width: `${row.depth * 18}px` }"></span>

          <span
            data-testid="tree-toggle"
            class="flex h-5 w-5 shrink-0 items-center justify-center text-xs text-slate-500"
            @click.stop="toggleEntry(row.entry)"
          >
            <template v-if="row.entry.node.nChildren > 0">
              <span v-if="row.entry.loading">…</span>
              <span v-else>{{ row.entry.expanded ? '▼' : '▶' }}</span>
            </template>
          </span>

          <span class="min-w-0 flex-1 truncate">
            {{ displayName(row.entry.node) }}
          </span>

          <span class="shrink-0 text-xs text-slate-600">
            {{ row.entry.node.type }}
          </span>

          <span
            v-if="hasValue(row.entry.node)"
            class="max-w-48 shrink-0 truncate text-xs text-slate-400"
          >
            {{ displayValue(row.entry.node.value) }}
          </span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { FlightGearPropertyNode } from '@/services/flightgear-client'
import { useFlightGearStore } from '@/stores/flightgear'

interface TreeEntry {
  node: FlightGearPropertyNode
  children: TreeEntry[]
  expanded: boolean
  loaded: boolean
  loading: boolean
}

interface VisibleRow {
  entry: TreeEntry
  depth: number
}

const emit = defineEmits<{
  select: [node: FlightGearPropertyNode]
}>()

const flightgear = useFlightGearStore()

const root = ref<TreeEntry | null>(null)
const loadingRoot = ref(false)
const treeError = ref<string | null>(null)
const selectedPath = ref<string | null>(null)

function makeEntry(node: FlightGearPropertyNode): TreeEntry {
  const children = (node.children ?? []).map(makeEntry)

  return {
    node,
    children,
    expanded: false,
    loaded: children.length > 0 || node.nChildren === 0,
    loading: false,
  }
}

function getErrorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message
  }

  return String(value)
}

async function loadRoot() {
  loadingRoot.value = true
  treeError.value = null

  try {
    const node = await flightgear.readPropertyNode('/', 1)

    root.value = makeEntry(node)
    root.value.expanded = true
    root.value.loaded = true
  } catch (error) {
    treeError.value = getErrorMessage(error)
  } finally {
    loadingRoot.value = false
  }
}

async function loadChildren(entry: TreeEntry) {
  if (entry.loaded || entry.loading || entry.node.nChildren === 0) {
    return
  }

  entry.loading = true
  treeError.value = null

  try {
    const node = await flightgear.readPropertyNode(entry.node.path, 1)

    entry.node = node
    entry.children = (node.children ?? []).map(makeEntry)
    entry.loaded = true
  } catch (error) {
    treeError.value = getErrorMessage(error)
  } finally {
    entry.loading = false
  }
}

async function toggleEntry(entry: TreeEntry) {
  if (entry.node.nChildren === 0) {
    return
  }

  if (!entry.expanded && !entry.loaded) {
    await loadChildren(entry)
  }

  entry.expanded = !entry.expanded
}

function selectEntry(entry: TreeEntry) {
  selectedPath.value = entry.node.path
  emit('select', entry.node)
}

function appendVisibleRows(entry: TreeEntry, depth: number, rows: VisibleRow[]) {
  rows.push({
    entry,
    depth,
  })

  if (!entry.expanded) {
    return
  }

  for (const child of entry.children) {
    appendVisibleRows(child, depth + 1, rows)
  }
}

const visibleRows = computed<VisibleRow[]>(() => {
  if (!root.value) {
    return []
  }

  const rows: VisibleRow[] = []

  /*
   * Don't render the synthetic "/" root itself.
   * Its direct children become the top-level rows:
   *
   * controls
   * environment
   * instrumentation
   * position
   * sim
   * velocities
   * ...
   */
  if (root.value.expanded) {
    for (const child of root.value.children) {
      appendVisibleRows(child, 0, rows)
    }
  }

  return rows
})

function displayName(node: FlightGearPropertyNode): string {
  if (!node.name) {
    return '/'
  }

  if (node.index > 0) {
    return `${node.name}[${node.index}]`
  }

  return node.name
}

function hasValue(node: FlightGearPropertyNode): boolean {
  return Object.prototype.hasOwnProperty.call(node, 'value')
}

function displayValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  return String(value)
}

watch(
  () => flightgear.connectionState,
  (connectionState) => {
    if (connectionState === 'connected') {
      void loadRoot()
      return
    }

    root.value = null
    selectedPath.value = null
    treeError.value = null
  },
  {
    immediate: true,
  },
)
</script>
