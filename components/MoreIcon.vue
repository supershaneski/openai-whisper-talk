<script setup>
defineProps({
    color: {
        type: String,
        default: '#00DC82',
    }
})
</script>

<template>
    <svg width="100%" height="100%" :stroke="color" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"  viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="19" r="1" />
    </svg>
</template>