<script setup lang="ts">

const config = useRuntimeConfig()

useHead({
  title: config.public.appTitle,
  meta: [
    { name: 'description', content: 'A chatbox application using OpenAI Completion endpoint to simulate conversation.' }
  ],
})
</script>

<template>
  <Head>
    <Link rel="icon" href="/icon.png" />
  </Head>
  <NuxtPage />
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.3s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>