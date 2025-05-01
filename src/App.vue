<template>
    <div class="app-container">
        <MenuPanel @video-source-changed="handleData" />
        <VideoPlayer :open-video="videoSource" />
    </div>
    <div class="file-input-container">
        {{ videoSource }}
    </div>
</template>

<script>
import MenuPanel from './components/menupanel.vue';
import VideoPlayer from './components/videoplayer.vue';
var videoSource = null; // Premenná pre video source

import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        MenuPanel,
        VideoPlayer
    },
    data() {
        return {
            videoSource: null, // Premenná pre video source
        };
    },
    methods: {
        handleData(video) { // Emitovanie eventu s dátami
            videoSource = video; // Uloženie dát do premennej
        }
    },
});
</script>
<style>
html,
body {
    font-size: 1em;
    margin: 0;
    padding: 0;
    height: 100%;
    background: #262627;
    font-family: Arial, sans-serif;
}

body {
    margin: 0;
    overflow: hidden;
}

#app {
    height: 100vh;
    display: flex;
    flex-direction: column;
}
</style>