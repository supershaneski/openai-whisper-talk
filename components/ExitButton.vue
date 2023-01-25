<script setup>
const emit = defineEmits(['click'])
</script>

<template>
    <button class="exit-button" @click="$emit('click')"><span>&#215;</span></button>
</template>

<style scoped>
.exit-button {
    font-family: Arial, Helvetica, sans-serif;
    appearance: none;
    background-color: #ff6767;
    border: 0;
    border-radius: 50%;
    font-size: 2.2rem;
    line-height: 100%;
    color: #ffffff;
    width: 60px;
    height: 60px;
    padding: 0;
    box-sizing: border-box;
    outline: none;
    cursor: pointer;
}
</style>