<template>
  <div class="video-player-container">
    <!-- Video Player -->
    <div class="video-container">
      <video
        ref="videoPlayer"
        v-if="videoStore.videoSource"
        :src="videoStore.videoSource"
        @timeupdate="handleTimeUpdate"
        @loadedmetadata="handleLoadedMetadata"
        @play="videoStore.setPlaying(true)"
        @pause="videoStore.setPlaying(false)"
        muted
      ></video>
      <div v-else class="no-video">
        No video loaded
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button @click="togglePlay">
        {{ videoStore.isPlaying ? 'Pause' : 'Play' }}
      </button>
      <button @click="setMarker('takeoff')">Mark Takeoff</button>
      <button @click="setMarker('landing')">Mark Landing</button>
      <button @click="videoStore.resetAnalysis()">Reset</button>
      
      <span class="time-display">
        {{ formatTime(videoStore.currentTime) }} / {{ formatTime(videoStore.duration) }}
        <br>
        {{ videoStore.frameRate }} FPS
        <br>
        {{ videoStore.frameDuration }} ms/frame
      </span>
    </div>

    <!-- Timeline -->
    <div class="timeline-container" ref="timelineContainer">
      <div 
        class="timeline" 
        ref="timeline" 
        @mousedown="startDrag"
        @mousemove="handleDrag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
        @click="handleTimelineClick"
        @wheel="handleScroll"
      >
        
        <!-- Markers -->
        <div 
          v-if="videoStore.takeoffTime !== null" 
          class="marker takeoff" 
          :style="{ left: `${videoStore.takeoffTime / videoStore.duration * 100}%` }"
        ></div>
        <div 
          v-if="videoStore.landingTime !== null" 
          class="marker landing" 
          :style="{ left: `${videoStore.landingTime / videoStore.duration * 100}%` }"
        ></div>
        
        <div class="timeline-cursor" :style="{ left: `${videoStore.progressPercentage}%` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useVideoStore } from '@/stores/dataStore'

const animationRef = ref(null)
const videoStore = useVideoStore()
const videoPlayer = ref(null)
const isPlaying = ref(false)
const timeline = ref(null)
const timelineCursor = ref(null)

const initVideo = () => {
  if (videoPlayer.value) {
    videoPlayer.value.addEventListener('canplay', () => {
      videoStore.isReady = true
    })
  }
}

const togglePlay = async () => {
  if (!videoPlayer.value) {
    console.warn('Video nie je pripravené na prehrávanie')
    return
  }

  try {
    if (isPlaying.value) {
      await videoPlayer.value.pause()
      cancelAnimationFrame(animationRef.value)
    } else {
      await videoPlayer.value.play()
      animationRef.value = requestAnimationFrame(updateFrame)
    }
    isPlaying.value = !isPlaying.value
    videoStore.isPlaying = isPlaying.value
  } catch (error) {
    console.error('Chyba pri prehrávaní:', error)
  }
}
// Event Handlers
const seekToPosition = (clientX) => {
  if (!videoPlayer.value || !timeline.value) return
  
  const rect = timeline.value.getBoundingClientRect()
  let pos = (clientX - rect.left) / rect.width
  pos = Math.max(0, Math.min(1, pos))
  
  const frameTime = videoStore.frameDuration
  const exactTime = Math.round(pos * videoPlayer.value.duration / frameTime) * frameTime
  
  videoPlayer.value.currentTime = exactTime
  videoStore.currentTime = exactTime
}


const handleTimeUpdate = () => {
  if (!videoStore.isDragging && !videoStore.isScrubbing) {
    videoStore.updateCurrentTime(videoPlayer.value.currentTime)
  }
}

const handleLoadedMetadata = () => {
  if (videoPlayer.value) {
    videoStore.setVideoMetadata({
      duration: videoPlayer.value.duration,
      frameRate: getFrameRate()
    })
  }
}

const updateFrame = () => {
  if (!videoPlayer.value || videoPlayer.value.paused || videoPlayer.value.ended) {
    return
  }

  const currentTime = videoPlayer.value.currentTime
  const duration = videoPlayer.value.duration

  videoStore.currentTime = currentTime

  if (timelineCursor.value) {
    const percentage = (currentTime / duration) * 100
    timelineCursor.value.style.left = `${percentage}%`
  }

  animationRef.value = requestAnimationFrame(updateFrame)
}

const setMarker = (type) => {
  if (videoPlayer.value) {
    videoStore.setMarker(type, videoPlayer.value.currentTime)
  }
}

// Timeline Interaction
const startDrag = (e) => {
  videoStore.isDragging = true
  seekToPosition(e.clientX)
}

const handleDrag = (e) => {
  if (videoStore.isDragging) {
    const rect = timeline.value.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const exactFrame = Math.round(pos * videoStore.duration / videoStore.frameStep)
    videoPlayer.value.currentTime = exactFrame * videoStore.frameStep
    videoStore.currentTime = videoPlayer.value.currentTime
  }
}

const endDrag = () => {
  videoStore.isDragging = false
}

const handleTimelineClick = (e) => {
  seekToPosition(e.clientX)
}

const handleScroll = (e) => {
  if (!videoPlayer.value) return
  
  // Zablokuj default scroll správanie
  e.preventDefault()
  
  // Vypočítaj nový čas
  const delta = -Math.sign(e.deltaY) * videoStore.frameStep
  let newTime = videoPlayer.value.currentTime + delta
  
  // Obmedz na rozsah videa
  newTime = Math.max(0, Math.min(videoStore.duration, newTime))
  
  // Nastav presný frame
  const exactFrame = Math.round(newTime / videoStore.frameStep)
  const exactTime = exactFrame * videoStore.frameStep
  
  // Okamžitá aktualizácia
  videoPlayer.value.currentTime = exactTime
  videoStore.currentTime = exactTime
}

// Helpers
const getFrameRate = () => {
  try {
    const stream = videoPlayer.value.captureStream()
    const track = stream.getVideoTracks()[0]
    return track.getSettings().frameRate || 30
  } catch {
    return 30
  }
}

const formatTime = (seconds) => {
  if (isNaN(seconds)) return '00:00'
  const date = new Date(0)
  date.setSeconds(seconds)
  return date.toISOString().substr(14, 5)
}

// Lifecycle
onMounted(() => {
  initVideo()
  if (videoPlayer.value && videoStore.videoSource) {
    videoPlayer.value.load()
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationRef.value)
  if (videoStore.videoSource) {
    URL.revokeObjectURL(videoStore.videoSource)
  }
})
</script>

<style scoped>
.video-player-container {
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
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

.no-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: #333;
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
}

.controls button:hover {
  background: #f5f5f5;
}

.time-display {
  margin-left: auto;
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  color: #5a5a5a;
}

.timeline-container {
  width: 100%;
  margin-top: 10px;
}

.timeline {
  position: relative;
  background: #e9e9e9;
  border-radius: 3px;
  cursor: pointer;
  height: 100%;
  width: 100%;
  user-select: none;
}

.timeline-cursor {
  position: absolute;
  width: 6px;
  height: 120%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #42b983;
  border-radius: 5px;
}

.marker {
  position: absolute;
  width: 8px;
  height: 12px;
  top: -3px;
  transform: translateX(-50%);
}

.marker.takeoff {
  background: #ff4757;
}

.marker.peak {
  background: #2ed573;
}

.marker.landing {
  background: #1e90ff;
}
.timeline-container {
  width: 100%;
  height: 60px;
  margin-top: 16px;
  position: relative;
}


.timeline-bg {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%);
  border-radius: 2px;
}

.timeline:hover .timeline-bg,
.timeline:active .timeline-bg {
  height: 6px;
}

.timeline:hover .timeline-progress,
.timeline:active .timeline-progress {
  height: 6px;
}

.timeline:active .timeline-cursor {
  transform: translate(-50%, -50%) scale(1.2);
}
</style>