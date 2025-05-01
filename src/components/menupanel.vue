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
              <input ref="videoInput" type="file" accept="video/*" style="display: none" @change="handleFileChange" />
            </div>
            {{ item }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'MenuPanel',
  props: {
    hasVideo: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      activeMenu: null,
      menus: [
        { name: "File", items: ["Open", "Close", "Exit"] },
        { name: "Marks", items: ["Start", "End", "Reset"] },
        { name: "View", items: ["Zoom", "Fullscreen", "Dark Mode"] },
        { name: "Help", items: ["Documentation", "About"] },
      ],
    };
  },
  methods: {
    openDropdown(menuName) {
      this.activeMenu = menuName;
    },
    closeDropdown() {
      this.activeMenu = null;
    },
    openFileDialog() {
      this.$refs.videoInput.click()
    },
    handleMenuAction(menuName, item) {
      if (menuName === "File" && item === "Open") {
        console.log('Open video file dialog');
        const fileInput = this.$el.querySelector('.file-input');
        fileInput.click();
        fileInput.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file) {
            const videoSource = URL.createObjectURL(file);
            console.log('Selected video source:', videoSource);
            this.$emit('video-source-changed', videoSource); // Emitovanie eventu s video source
          }
        });
      }
    },
    handleFileChange(event) {
      const file = event.target.files[0]
      if (file) {
        if (this.videoSource) {
          URL.revokeObjectURL(this.videoSource)
        }
        this.videoSource = URL.createObjectURL(file)
        console.log('Selected video source:', videoSource);
        this.$emit('video-source-changed', videoSource); // Emitovanie eventu s video source
      }
    },

  },
  mounted() {
    console.log('MenuPanel - Typ videoSource:', typeof this.videoSource);
    console.log('VideoPlayer - Typ videoSource:', typeof this.videoSource);
  }
};
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