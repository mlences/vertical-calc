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
        @play="handlePlay"
        @pause="handlePause"
        @ended="handleVideoEnd"
        muted
      ></video>
      <div v-else class="no-video">
        No video loaded
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button @click="togglePlay">
        {{ showReplay ? 'Replay' : videoStore.isPlaying ? 'Pause' : 'Play' }}
      </button>
      <button @click="setMarker('takeoff')">Mark Takeoff</button>
      <button @click="setMarker('landing')">Mark Landing</button>
      <button @click="videoStore.resetAnalysis()">Reset</button>
      
      <span class="time-display">
        {{ formatTime(videoStore.currentTime) }} / {{ formatTime(videoStore.duration) }}
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
        @wheel.prevent="handleScroll"
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
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useVideoStore } from '@/stores/dataStore'

const videoStore = useVideoStore()
const videoPlayer = ref(null)
const timeline = ref(null)
const isDragging = ref(false)
const wasPlayingBeforeDrag = ref(false)
const animationRef = ref(null)
const showReplay = ref(false)

const initVideo = () => {
  if (videoPlayer.value) {
    videoPlayer.value.addEventListener('canplay', () => {
      videoStore.isReady = true
    })
  }
}

const togglePlay = async () => {
  if (!videoPlayer.value) return

  try {
    if (showReplay.value) {
      // Handle replay case
      videoPlayer.value.currentTime = 0
      await videoPlayer.value.play()
      showReplay.value = false
      videoStore.setPlaying(true)
      animationRef.value = requestAnimationFrame(updateFrame)
      return
    }

    if (videoStore.isPlaying) {
      await videoPlayer.value.pause()
      cancelAnimationFrame(animationRef.value)
    } else {
      await videoPlayer.value.play()
      animationRef.value = requestAnimationFrame(updateFrame)
    }
    videoStore.setPlaying(!videoStore.isPlaying)
  } catch (error) {
    console.error('Playback error:', error)
  }
}

const seekToPosition = (position) => {
  if (!videoPlayer.value || !videoStore.duration) return
  
  const newTime = Math.min(Math.max(position * videoStore.duration, 0), videoStore.duration)
  videoPlayer.value.currentTime = newTime
  videoStore.currentTime = newTime
}

const handleTimeUpdate = () => {
  if (!isDragging.value) {
    videoStore.currentTime = videoPlayer.value.currentTime
  }
}

const handleLoadedMetadata = () => {
  if (videoPlayer.value) {
    videoStore.setVideoMetadata({
      duration: videoPlayer.value.duration,
      frameRate: getFrameRate()
    })
    showReplay.value = false
  }
}

const updateFrame = () => {
  if (!videoPlayer.value || videoPlayer.value.paused || videoPlayer.value.ended) {
    return
  }
  
  videoStore.currentTime = videoPlayer.value.currentTime
  animationRef.value = requestAnimationFrame(updateFrame)
}

const setMarker = (type) => {
  if (videoPlayer.value) {
    videoStore.setMarker(type, videoPlayer.value.currentTime)
  }
}

const handlePlay = () => {
  videoStore.setPlaying(true)
  showReplay.value = false
}

const handlePause = () => {
  videoStore.setPlaying(false)
}

const handleVideoEnd = () => {
  videoStore.setPlaying(false)
  showReplay.value = true
}

// Timeline Interaction
const startDrag = (e) => {
  wasPlayingBeforeDrag.value = videoStore.isPlaying
  if (wasPlayingBeforeDrag.value) {
    videoPlayer.value.pause()
    videoStore.setPlaying(false)
    cancelAnimationFrame(animationRef.value)
  }
  isDragging.value = true
  handleDrag(e)
}

const endDrag = () => {
  if (isDragging.value && wasPlayingBeforeDrag.value) {
    videoPlayer.value.play()
    videoStore.setPlaying(true)
    animationRef.value = requestAnimationFrame(updateFrame)
  }
  isDragging.value = false
}

const handleDrag = (e) => {
  if (!isDragging.value || !timeline.value || !videoPlayer.value) return
  
  const rect = timeline.value.getBoundingClientRect()
  const pos = (e.clientX - rect.left) / rect.width
  const newTime = Math.min(Math.max(pos * videoStore.duration, 0), videoStore.duration)
  
  // Immediate update without waiting for timeupdate
  videoPlayer.value.currentTime = newTime
  videoStore.currentTime = newTime
}

const handleTimelineClick = (e) => {
  if (!isDragging.value) {
    const rect = timeline.value.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    seekToPosition(pos)
    showReplay.value = false
  }
}

const handleScroll = (e) => {
  if (!videoPlayer.value || !videoStore.duration) return
  
  // Pause during scroll for immediate feedback
  const wasPlaying = videoStore.isPlaying
  if (wasPlaying) {
    videoPlayer.value.pause()
    videoStore.setPlaying(false)
    cancelAnimationFrame(animationRef.value)
  }
  
  // Calculate exact frame step
  const frameStep = 1 / videoStore.frameRate
  const scrollDirection = Math.sign(e.deltaY) * -1
  const newTime = Math.max(0, Math.min(
    videoStore.currentTime + (scrollDirection * frameStep),
    videoStore.duration
  ))
  
  // Update immediately
  videoPlayer.value.currentTime = newTime
  videoStore.currentTime = newTime
  showReplay.value = false
  
  // Restore playback if needed
  if (wasPlaying) {
    videoPlayer.value.play()
    videoStore.setPlaying(true)
    animationRef.value = requestAnimationFrame(updateFrame)
  }
}

const getFrameRate = () => {
  try {
    if (videoPlayer.value.captureStream) {
      const stream = videoPlayer.value.captureStream()
      const track = stream.getVideoTracks()[0]
      return track.getSettings().frameRate || 30
    }
    return 30
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