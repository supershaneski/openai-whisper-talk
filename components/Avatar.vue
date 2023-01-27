<script setup>
import PersonIcon from './PersonIcon.vue';

defineProps({
    color: {
        type: String,
        default: '#00DC82',
    },
})
</script>

<template>
    <div class="avatar">
        <PersonIcon size="100%" :color="color" />
    </div>
</template>

<style scoped>
.avatar {
    position: relative;
    border-radius: 50%;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
}
</style>