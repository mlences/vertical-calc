<template>
    <div class="app-container">
        <MenuPanel/>
        <VideoPlayer />
    </div>
</template>

<script>
import MenuPanel from './components/menupanel.vue';
import VideoPlayer from './components/videoplayer.vue';
import { defineStore } from 'pinia'

import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        MenuPanel,
        VideoPlayer
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