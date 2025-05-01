<template>
  <div class="menu-panel-wrapper">
    <div class="menu-panel">
      <div v-for="menu in menus" :key="menu.name" class="menu-item" @mouseenter="openDropdown(menu.name)"
        @mouseleave="closeDropdown(menu.name)">
        {{ menu.name }}
        <div v-if="activeMenu === menu.name" class="dropdown">
          <div v-for="item in menu.items" :key="item" class="dropdown-item" @click="handleMenuAction(menu.name, item)"
            :class="{ disabled: item === 'Close' && !hasVideo }">
            <div class="file-input-container" v-if="item === 'Open'">
              <input ref="fileInput" type="file" accept="video/*" style="display: none" @change="handleFileChange" />
              Open
            </div>
            <template v-else>
              {{ item }}
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useVideoStore } from '@/stores/dataStore'
import { storeToRefs } from 'pinia'

const videoStore = useVideoStore()
const { videoSource } = storeToRefs(videoStore)
const fileInput = ref(null)
const activeMenu = ref(null)

// Computed property to check if video source exists
const hasVideoSource = computed(() => !!videoSource.value)

const menus = ref([
  { name: "File", items: ["Open", "Close", "Exit"] },
  { name: "Marks", items: ["Start", "End", "Reset"] },
  { name: "View", items: ["Zoom", "Fullscreen", "Dark Mode"] },
  { name: "Help", items: ["Documentation", "About"] },
])

const hasVideo = useVideoStore().videoSource !== null

// Methods
const openDropdown = (menuName) => {
  activeMenu.value = menuName
}

const closeDropdown = () => {
  activeMenu.value = null
}

const handleMenuAction = (menuName, item) => {
  if (item === 'Close' && !props.hasVideo) return

  if (menuName === "File") {
    if (item === "Open") {
      fileInput.value[0].click()
    } else if (item === "Exit") {
      // window.close()
    } else if (item === "Close") {
      videoStore.setVideoSource(null) // Uložíme do Pinia store
      URL.revokeObjectURL(videoSource.value)
    }
  }
}

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    const videoSource = URL.createObjectURL(file)
    videoStore.setVideoSource(videoSource) // Uložíme do Pinia store
  }
}
</script>

<style scoped>
.menu-panel-wrapper {
  position: sticky;
  /* Alebo fixed ak chceš absolútnu pozíciu */
  top: 0;
  z-index: 1000;
  width: 100%;
}

.menu-panel {
  --menu-panel-bg-color: #343437;
  --menu-panel-text-color: #a0a0af;
  --menu-panel-hover-bg-color: #3e3e42;
  --menu-panel-hover-text-color: #00cc6d;
  display: flex;
  flex-direction: row;
  background-color: var(--menu-panel-bg-color);
  margin: 0;
  padding: 0;
  user-select: none;
  color: var(--menu-panel-text-color);
  position: relative;
  font-size: .75em;
}

.dropdown {
  top: 100%;
  left: 0;
  padding: 5px;
  background-color: var(--menu-panel-bg-color);
  position: absolute;
  z-index: 100;
  border-radius: 5px;
  margin: 0;
}

.dropdown-item {
  border-radius: 5px;
  color: var(--menu-panel-text-color);
  padding: 8px 20px;
  white-space: nowrap;
}

.menu-panel>.menu-item {
  position: relative;
  background-color: var(--menu-panel-bg-color);
  border: none;
  padding: 3px 7px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 100ms ease;
}

.menu-panel .menu-item:hover,
.dropdown-item:hover {
  background-color: var(--menu-panel-hover-bg-color);
  color: var(--menu-panel-hover-text-color);
}

.disabled {
  opacity: 0.5;
  cursor: default !important;
}

.disabled:hover {
  background-color: var(--menu-panel-bg-color) !important;
  color: var(--menu-panel-text-color) !important;
}
</style>