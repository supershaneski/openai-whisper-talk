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
        <path fill="none" stroke-width="2" d="M20,8 C18.5974037,5.04031171 15.536972,3 12,3 C7.02943725,3 3,7.02943725 3,12 C3,16.9705627 7.02943725,21 12,21 L12,21 C16.9705627,21 21,16.9705627 21,12 M21,3 L21,9 L15,9" />
    </svg>
</template>