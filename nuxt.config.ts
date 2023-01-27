// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    app: {
        pageTransition: { name: 'page', mode: 'out-in' },
        head: {
            charset: 'utf-8',
            viewport: 'maximum-scale=1.0, minimum-scale=1.0, initial-scale=1.0, width=device-width, user-scalable=0',
            title: 'Whisper Talk',
            meta: [
                { name: 'description', content: 'A voice conversation app powered by OpenAI technologies' }
            ],
        }
    },
    modules: ["formidable"],
    runtimeConfig: {
        openaiApiKey: '',
        public: {
            appTitle: 'Whisper Talk'
        }
    },
    css: [
        '~/assets/main.css'
    ]
})
