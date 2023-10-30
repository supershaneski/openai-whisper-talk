<script setup>
//import phone from '../assets/phone.svg'
import contacts from '../assets/contacts.json'

/*
<div class="banner">
    <img class="logo" :src="phone" alt="logo" />
</div>
*/
</script>

<template>
    <div class="container">
       <div class="main">
            <div class="list">
                <NuxtLink v-for="person in contacts.items" :key="person.name" :to="`/talk/${person.name}`">
                    <div class="item">
                        <span class="text">{{ person.name }}</span><span v-if="person.lang">&nbsp;({{ person.lang === 'ja' ? '日本語' : person.lang }})</span>
                    </div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<style scoped>
.container {
    position: relative;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}
.main {
    position: relative;
}
.list {
    position: relative;
}
.item {
    background-color: var(--color-panel);
    width: 200px;
    margin-bottom: 0.5rem;
    padding: 1rem;
    text-align: center;
    border-radius: 0.3rem;
}
.text {
    font-size: 1.2rem;
}

.banner {
    position: relative;
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
}
.logo {
    border: 1px solid var(--color-border-hover);
    border-radius: 50%;
    width: 75px;
    height: 75px;
    padding: 12px;
    object-fit: cover;
    box-sizing: border-box;
}
</style>