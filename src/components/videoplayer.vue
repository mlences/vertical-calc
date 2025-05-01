<template>
    <div class="video-player-container">
      <div class="video-container">
        <video
          ref="videoPlayer"
          :videoSource="videoSource"
          v-if="videoSource" :src="videoSource"
          @timeupdate="updateTimeline"
          @loadedmetadata="initVideo"
          muted
        ></video>
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
        <div 
          class="timeline" 
          ref="timeline" 
          @mousedown="startDrag"
          @mousemove="handleDrag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
          @wheel.prevent="handleScroll"
        >
          <div class="timeline-background"></div>
          <div class="timeline-progress" :style="{ width: progressPercentage + '%' }"></div>
          <div 
            v-if="markInTime !== null" 
            class="mark-in" 
            :style="{ left: markInPercentage + '%' }"
          ></div>
          <div 
            v-if="markOutTime !== null" 
            class="mark-out" 
            :style="{ left: markOutPercentage + '%' }"
          ></div>
          <div 
            v-if="markInTime !== null && markOutTime !== null" 
            class="marked-range" 
            :style="{
              left: markInPercentage + '%',
              width: (markOutPercentage - markInPercentage) + '%'
            }"
          ></div>
          <div class="timeline-cursor" :style="{ left: progressPercentage + '%' }"></div>
        </div>
      </div>
  
      <div class="file-input-container">
        <label class="file-input-label">
          Select Video
          <input type="file" accept="video/*" @change="handleFileChange" class="file-input" />
        </label>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'videoPlayer',
    data() {
      return {
        videoSource: this.videoSource,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        markInTime: null,
        markOutTime: null,
        durationDifference: null,
        frameRate: 30,
        isDragging: false,
        animationFrameId: null
      }
    },
    computed: {
      progressPercentage() {
        return (this.currentTime / this.duration) * 100
      },
      markInPercentage() {
        return this.markInTime !== null ? (this.markInTime / this.duration) * 100 : 0
      },
      markOutPercentage() {
        return this.markOutTime !== null ? (this.markOutTime / this.duration) * 100 : 0
      },
      frameDuration() {
        return 1 / this.frameRate
      }
    },
   methods: {
     handleFileChange(event) {
       const file = event.target.files[0]
       if (file) {
         if (this.videoSource) {
           URL.revokeObjectURL(this.videoSource)
         }
         this.videoSource = URL.createObjectURL(file)
         this.resetMarks()
         this.$emit('video-source-changed', this.videoSource) // Emitovanie eventu s novým videoSource
       }
     },
     initVideo() {
       const video = this.$refs.videoPlayer
       this.duration = video.duration
  
       try {
         const videoTrack = video.captureStream().getVideoTracks()[0]
         const settings = videoTrack.getSettings()
         this.frameRate = settings.frameRate || 30
       } catch {
         this.frameRate = 30
       }
     },
     togglePlay() {
       const video = this.$refs.videoPlayer
       if (this.isPlaying) {
         video.pause()
         cancelAnimationFrame(this.animationFrameId)
       } else {
         video.play()
         this.startAnimation()
       }
       this.isPlaying = !this.isPlaying
     },
     startAnimation() {
       const video = this.$refs.videoPlayer
       const update = () => {
         this.currentTime = video.currentTime
         this.animationFrameId = requestAnimationFrame(update)
       }
       this.animationFrameId = requestAnimationFrame(update)
     },
     updateTimeline() {
       if (!this.isDragging) {
         this.currentTime = this.$refs.videoPlayer.currentTime
       }
     },
     startDrag(e) {
       this.isDragging = true
       this.seekToPosition(e)
     },
     handleDrag(e) {
       if (this.isDragging) {
         this.seekToPosition(e)
       }
     },
     endDrag() {
       this.isDragging = false
     },
     seekToPosition(event) {
       const timeline = this.$refs.timeline
       const rect = timeline.getBoundingClientRect()
       let position = (event.clientX - rect.left) / rect.width
       position = Math.max(0, Math.min(1, position))
        
       const video = this.$refs.videoPlayer
       video.currentTime = position * this.duration
       this.currentTime = video.currentTime
     },
     setMarkIn() {
       this.markInTime = this.currentTime
       this.calculateDuration()
     },
     setMarkOut() {
       this.markOutTime = this.currentTime
       this.calculateDuration()
     },
     resetMarks() {
       this.markInTime = null
       this.markOutTime = null
       this.durationDifference = null
     },
     calculateDuration() {
       if (this.markInTime !== null && this.markOutTime !== null) {
         this.durationDifference = Math.abs(this.markOutTime - this.markInTime)
       }
     },
     formatTime(seconds, showFrames = false) {
       if (seconds === null || isNaN(seconds)) return '00:00:00'
        
       const date = new Date(0)
       date.setSeconds(seconds)
       const timeString = date.toISOString().substr(11, 8)
  
       if (showFrames) {
         const frames = Math.floor((seconds % 1) * this.frameRate)
         return `${timeString}.${frames.toString().padStart(2, '0')}`
       }
       return timeString
     },
     stepForward() {
       const video = this.$refs.videoPlayer
       video.pause()
       this.isPlaying = false
       cancelAnimationFrame(this.animationFrameId)
       video.currentTime = Math.min(video.duration, video.currentTime + this.frameDuration)
       this.currentTime = video.currentTime
     },
     stepBackward() {
       const video = this.$refs.videoPlayer
       video.pause()
       this.isPlaying = false
       cancelAnimationFrame(this.animationFrameId)
       video.currentTime = Math.max(0, video.currentTime - this.frameDuration)
       this.currentTime = video.currentTime
     },
     handleScroll(e) {
       const video = this.$refs.videoPlayer
       const delta = e.deltaY > 0 ? 1 : -1
       video.currentTime = Math.max(0, Math.min(video.duration,
         video.currentTime + (delta * this.frameDuration)
       ));
       this.currentTime = video.currentTime;
     }
   },
    beforeDestroy() {
      cancelAnimationFrame(this.animationFrameId)
      if (this.videoSource) {
        URL.revokeObjectURL(this.videoSource)
      }
    },
  }
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