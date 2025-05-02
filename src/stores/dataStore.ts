// src/stores/dataStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'


export const useVideoStore = defineStore('video', () => {
  // State
  const videoSource = ref<string | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const videoDuration = ref(0) // in milliseconds
  const frameRate = ref(30)

  // Jump Analysis Markers
  const takeoffFrame = ref<number | null>(null) // frame number
  const peakFrame = ref<number | null>(null)    // frame number
  const landingFrame = ref<number | null>(null) // frame number

  // Calculation Results
  const jumpHeight = ref<number | null>(null)   // in meters
  const airTime = ref<number | null>(null)      // in milliseconds
  const powerOutput = ref<number | null>(null)  // in watts/kg

  // Getters
  const progress = computed(() => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  })
  const progressPercentage = computed(() => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  })

  const takeoffTime = computed(() =>
    takeoffFrame.value ? (takeoffFrame.value / frameRate.value) * 1000 : null
  )

  const peakTime = computed(() =>
    peakFrame.value ? (peakFrame.value / frameRate.value) * 1000 : null
  )

  const landingTime = computed(() =>
    landingFrame.value ? (landingFrame.value / frameRate.value) * 1000 : null
  )

  // Actions
  const setVideoSource = (source: string | null) => {
    if (videoSource.value) {
      URL.revokeObjectURL(videoSource.value)
    }
    videoSource.value = source
    isPlaying.value = false
    currentTime.value = 0
  }

  const setVideoMetadata = (meta: { duration: number, frameRate?: number }) => {
    duration.value = meta.duration
    if (meta.frameRate) {
      frameRate.value = meta.frameRate
    }
  }

  const frameStep = computed(() => {
    return frameRate.value > 0 ? Math.floor(duration.value * frameRate.value) : 0
  })

  const setPlaying = (playing: boolean) => {
    isPlaying.value = playing
  }

  const togglePlay = () => {
    isPlaying.value = !isPlaying.value
  }

  const seekTo = (time: number) => {
    currentTime.value = time
  }
  const updateCurrentTime = (time: number) => {
    currentTime.value = time
  }
  const clearVideo = () => {
    if (videoSource.value) {
      URL.revokeObjectURL(videoSource.value)
    }
    videoSource.value = null
  }
  const setMarkers = (takeoff: number, peak: number, landing: number) => {
    takeoffFrame.value = takeoff
    peakFrame.value = peak
    landingFrame.value = landing
    calculateResults()
  }

  const calculateResults = () => {
    if (!takeoffFrame.value || !peakFrame.value || !landingFrame.value) return

    // Calculate air time (ms)
    airTime.value = ((landingFrame.value - takeoffFrame.value) / frameRate.value) * 1000

    // Calculate jump height using physics: h = ½ * g * t^2
    // Where g = 9.81 m/s² and t is half the air time in seconds
    const t = (airTime.value / 1000) / 2
    jumpHeight.value = 0.5 * 9.81 * Math.pow(t, 2)

    // Additional calculations can be added here
  }

  const clearAnalysis = () => {
    takeoffFrame.value = null
    peakFrame.value = null
    landingFrame.value = null
    jumpHeight.value = null
    airTime.value = null
    powerOutput.value = null
  }


  return {
    // video State
    videoSource,
    frameStep,
    isPlaying,
    currentTime,
    duration,
    clearVideo,
    videoDuration,
    frameRate,
    setPlaying,
    setVideoMetadata,
    // Getters
    progressPercentage,
    progress,
    // Markers
    takeoffFrame,
    peakFrame,
    landingFrame,
    // Results
    jumpHeight,
    airTime,
    powerOutput,
    // Computed Times
    takeoffTime,
    peakTime,
    landingTime,
    // Actions
    updateCurrentTime,
    setVideoSource,
    togglePlay,
    seekTo,
    setMarkers,
    calculateResults,
    clearAnalysis
  }
})
