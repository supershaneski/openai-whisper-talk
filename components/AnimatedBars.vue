<script setup>
const items = ref(Array(8).fill(1))
const timer = ref(null)

const props = defineProps(['start'])

const isStarto = computed(() => props.start)

watch(isStarto, (value) => {
    if(value) {
        timer.value = setInterval(() => {
            items.value = items.value.map((item, i) => {
                return 1 + Math.round(20 * Math.random())
            })
        }, 100)
    } else {
        items.value = items.value.map(item => 1)
        clearInterval(timer.value)
    }
})
</script>

<template>
    <div class="loading-bars">
        <div v-for="(item, index) in items" 
        :key="index" 
        :style="{
            height: `${item}px`
        }"
        class="bar-item"></div>
    </div>
</template>

<style scoped>
.loading-bars {
    position: relative;
    width: 100%;
    height: 40px; /* 20px */
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    box-sizing: border-box;
}
.bar-item {
    background-color: #FFA967; /*#FFD167;*/ /*#FFA967;*/ /*hsla(160, 100%, 37%, 1);*/
    border-radius: 12px;
    position: relative;
    width: calc((100% - 9px)/8);
    flex-grow: 0;
    flex-shrink: 0;
    transition: height 0.1s;
}
</style>