// src/stores/dataStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'


export const useVideoStore = defineStore('video', () => {
  // State
  const videoSource = ref<string | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)

  // Getters
  const progress = computed(() => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  })

  // Actions
  const setVideoSource = (source: string) => {
    if (videoSource.value) {
      URL.revokeObjectURL(videoSource.value) // Uvoľníme predchádzajúci zdroj
    }
    videoSource.value = source
  }

  const togglePlay = () => {
    isPlaying.value = !isPlaying.value
  }


  const seekTo = (time: number) => {
    currentTime.value = time
  }

  return {
    // State
    videoSource,
    isPlaying,
    currentTime,
    duration,
    
    // Getters
    progress,
    
    // Actions
    setVideoSource,
    togglePlay,
    seekTo
  }
})