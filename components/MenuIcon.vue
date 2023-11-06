<script setup>
defineProps({
    color: {
        type: String,
        default: '#00DC82',
    }
})
</script>

<template>
    <svg width="100%" height="100%" :stroke="color" :fill="color" stroke-width="0"  viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
    </svg>
</template>