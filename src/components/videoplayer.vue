<template>
  <div class="video-player-container">
    <div class="video-container">
      <video ref="videoElement" v-if="videoSource" :src="videoSource" muted></video>
    </div>

    <div class="controls">
      <button @click="togglePlay">
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      <button @click="setMarkIn">Mark In</button>
      <button @click="setMarkOut">Mark Out</button>
      <button @click="resetMarks">Reset Marks</button>
      <span class="time-display">
        {{ formatTime(currentTime, true) }}
      </span>
      <span v-if="durationDifference" class="duration-display">
        Selection: {{ formatTime(durationDifference, true) }}
      </span>
    </div>

    <div class="timeline-container" ref="timelineContainer">
      <div class="timeline" ref="timeline" @mousedown="startDrag" @mousemove="handleDrag" @mouseup="endDrag"
        @mouseleave="endDrag" @wheel.prevent="handleScroll">
        <div class="timeline-background"></div>
        <div class="timeline-progress" :style="{ width: progressPercentage + '%' }"></div>
        <div v-if="markInTime !== null" class="mark-in" :style="{ left: markInPercentage + '%' }"></div>
        <div v-if="markOutTime !== null" class="mark-out" :style="{ left: markOutPercentage + '%' }"></div>
        <div v-if="markInTime !== null && markOutTime !== null" class="marked-range" :style="{
          left: markInPercentage + '%',
          width: (markOutPercentage - markInPercentage) + '%'
        }"></div>
        <div class="timeline-cursor" :style="{ left: progressPercentage + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { useVideoStore } from '@/stores/dataStore'
import { storeToRefs } from 'pinia'

// Store
const videoStore = useVideoStore()
const { videoSource } = storeToRefs(videoStore)
const videoElement = ref < HTMLVideoElement | null > (null)

// Refs
const videoPlayer = ref(null)
const timelineContainer = ref(null)
const timeline = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const markInTime = ref(null)
const markOutTime = ref(null)
const durationDifference = ref(null)
const frameRate = ref(30) // Make sure this is defined
const isDragging = ref(false)
const animationFrameId = ref(null)

// Computed
const progressPercentage = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
})

const markInPercentage = computed(() => {
  return markInTime.value !== null ? (markInTime.value / duration.value) * 100 : 0
})

const markOutPercentage = computed(() => {
  return markOutTime.value !== null ? (markOutTime.value / duration.value) * 100 : 0
})

const frameDuration = computed(() => {
  return 1 / frameRate.value // Now frameRate is properly defined
})

// Methods
const initVideo = () => {
  if (videoPlayer.value) {
    duration.value = videoPlayer.value.duration
    try {
      const videoTrack = videoPlayer.value.captureStream().getVideoTracks()[0]
      const settings = videoTrack.getSettings()
      frameRate.value = settings.frameRate || 30
    } catch {
      frameRate.value = 30
    }
  }
}

const formatTime = (seconds, showFrames = false) => {
  if (seconds === null || isNaN(seconds)) return '00:00:00'

  const date = new Date(0)
  date.setSeconds(seconds)
  const timeString = date.toISOString().substr(11, 8)

  if (showFrames) {
    const frames = Math.floor((seconds % 1) * frameRate.value) // Now using frameRate.value
    return `${timeString}.${frames.toString().padStart(2, '0')}`
  }
  return timeString
}

const togglePlay = () => {
  if (isPlaying.value) {
    videoPlayer.value.pause()
    cancelAnimationFrame(animationFrameId.value)
  } else {
    videoPlayer.value.play()
    startAnimation()
  }
  isPlaying.value = !isPlaying.value
}

const startAnimation = () => {
  const update = () => {
    currentTime.value = videoPlayer.value.currentTime
    animationFrameId.value = requestAnimationFrame(update)
  }
  animationFrameId.value = requestAnimationFrame(update)
}

const updateTimeline = () => {
  if (!isDragging.value) {
    currentTime.value = videoPlayer.value.currentTime
  }
}

const startDrag = (e) => {
  isDragging.value = true
  seekToPosition(e)
}

const handleDrag = (e) => {
  if (isDragging.value) {
    seekToPosition(e)
  }
}

const endDrag = () => {
  isDragging.value = false
}

const seekToPosition = (event) => {
  const rect = timeline.value.getBoundingClientRect()
  let position = (event.clientX - rect.left) / rect.width
  position = Math.max(0, Math.min(1, position))

  videoPlayer.value.currentTime = position * duration.value
  currentTime.value = videoPlayer.value.currentTime
}

const setMarkIn = () => {
  markInTime.value = currentTime.value
  calculateDuration()
}

const setMarkOut = () => {
  markOutTime.value = currentTime.value
  calculateDuration()
}

const resetMarks = () => {
  markInTime.value = null
  markOutTime.value = null
  durationDifference.value = null
}

const calculateDuration = () => {
  if (markInTime.value !== null && markOutTime.value !== null) {
    durationDifference.value = Math.abs(markOutTime.value - markInTime.value)
  }
}


const stepForward = () => {
  videoPlayer.value.pause()
  isPlaying.value = false
  cancelAnimationFrame(animationFrameId.value)
  videoPlayer.value.currentTime = Math.min(duration.value, videoPlayer.value.currentTime + frameDuration.value)
  currentTime.value = videoPlayer.value.currentTime
}

const stepBackward = () => {
  videoPlayer.value.pause()
  isPlaying.value = false
  cancelAnimationFrame(animationFrameId.value)
  videoPlayer.value.currentTime = Math.max(0, videoPlayer.value.currentTime - frameDuration.value)
  currentTime.value = videoPlayer.value.currentTime
}

const handleScroll = (e) => {
  const delta = e.deltaY > 0 ? 1 : -1
  videoPlayer.value.currentTime = Math.max(0, Math.min(duration.value,
    videoPlayer.value.currentTime + (delta * frameDuration.value)
  ))
  currentTime.value = videoPlayer.value.currentTime
}

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    const source = URL.createObjectURL(file)
    videoStore.setVideoSource(source)
    resetMarks()
  }
}



// Register player with store
onMounted(() => {
  if (videoElement.value) {
    videoStore.registerPlayer(videoElement.value)
  }
})

// Cleanup
onBeforeUnmount(() => {
  videoStore.registerPlayer(null)
})
</script>

<style scoped>
.video-player-container {
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #f7f8fa;
  padding: 16px;
  border-radius: 8px;
}

.video-container {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  background: #000;
  margin-bottom: 16px;
  border-radius: 4px;
}

.video-container video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.controls {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.controls button {
  padding: 6px 12px;
  background: #fff;
  color: #3d3d3d;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.controls button:hover {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

.controls button:active {
  background: #ebebeb;
}

.time-display {
  margin-left: auto;
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  color: #5a5a5a;
}

.duration-display {
  font-family: 'Roboto Mono', monospace;
  color: #3d3d3d;
  font-weight: 500;
  font-size: 13px;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.timeline-container {
  width: 100%;
  overflow: hidden;
  margin-bottom: 16px;
}

.timeline {
  position: relative;
  height: 60px;
  width: 100%;
  background: transparent;
  cursor: pointer;
  user-select: none;
}

.timeline-background {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 20px;
  background: #e9e9e9;
  border-radius: 4px;
}

.timeline-progress {
  position: absolute;
  top: 20px;
  height: 20px;
  background: rgba(0, 122, 255, 0.2);
  border-radius: 4px;
  width: 0%;
}

.timeline-cursor {
  position: absolute;
  width: 2px;
  height: 40px;
  top: 10px;
  background: #000;
  z-index: 3;
  pointer-events: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  will-change: left;
}

.timeline-cursor::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: -4px;
  width: 10px;
  height: 10px;
  background: #000;
  border-radius: 50%;
}

.mark-in,
.mark-out {
  position: absolute;
  width: 3px;
  height: 40px;
  top: 10px;
  z-index: 2;
  border-radius: 2px;
}

.mark-in {
  background: #ff375f;
  box-shadow: 0 0 0 2px rgba(255, 55, 95, 0.3);
}

.mark-out {
  background: #007aff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3);
}

.marked-range {
  position: absolute;
  top: 20px;
  height: 20px;
  background: rgba(0, 122, 255, 0.15);
  z-index: 1;
  border-radius: 4px;
}

.file-input-container {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.file-input-label {
  display: inline-block;
  padding: 8px 16px;
  background: #007aff;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s ease;
}

.file-input-label:hover {
  background: #0062cc;
}

.file-input {
  display: none;
}
</style>