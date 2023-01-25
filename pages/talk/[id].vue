<script setup>
import ExitButton from '~~/components/ExitButton.vue';

import person from '../../assets/person-svgrepo-com.svg'
import contacts from '../../assets/contacts.json'

const MAX_COUNT = 20
const MIN_DECIBELS = -45 //-45

const config = useRuntimeConfig()
const route = useRoute()

const isReady = ref(false)
const errorMessage = ref('')
const mediaRec = ref(null)
const chunks = ref([])

const isRecording = ref(false)
const startCountdown = ref(false)
const count = ref(0)
const animFrame = ref(null)
const timer = ref(null)

const audioFile = ref(null)
const reset = ref(true)

const abortController = ref(null)
const selectedPerson = ref(null)

let synth = null

useHead({
  title: `${config.public.appTitle} - Talking to ${route.params.id}`,
})

function handleClose() {
    navigateTo("/")
}

function handleError() {

    errorMessage.value = "Error calling getUserMedia"

}

function handleStream(stream) {

    isReady.value = true

    mediaRec.value = new MediaRecorder(stream)
    mediaRec.value.addEventListener('dataavailable', handleData)
    mediaRec.value.addEventListener("stop", handleStop)

    checkAudioLevel(stream)

}

function checkAudioLevel(stream) {

    const audioContext = new AudioContext()
    const audioStreamSource = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.minDecibels = MIN_DECIBELS
    audioStreamSource.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const domainData = new Uint8Array(bufferLength)

    const detectSound = () => {

        let soundDetected = false

        analyser.getByteFrequencyData(domainData)

        for (let i = 0; i < bufferLength; i++) {
            if (domainData[i] > 0) {
                soundDetected = true
            }
        }
        
        if(soundDetected === true) {

            if(isRecording.value === false) {
                startCountdown.value = false
                isRecording.value = true

                mediaRec.value.start()

            } else {
                if(startCountdown.value === true) {
                    startCountdown.value = false
                    count.value = 0
                }
            }

        } else {

            if(isRecording.value === true) {
                if(startCountdown.value === true) {

                    if(count.value >= MAX_COUNT) {
                        
                        startCountdown.value = false
                        count.value = 0
                        isRecording.value = false

                        mediaRec.value.stop()
                    }

                } else {
                    startCountdown.value = true
                }
            }

        }

        animFrame.value = window.requestAnimationFrame(detectSound)

    }

    animFrame.value = window.requestAnimationFrame(detectSound)

}

function handleData(e) {

    chunks.value.push(e.data)

}

async function handleStop() {

    const blob = new Blob(chunks.value, {type: 'audio/webm;codecs=opus'})
    chunks.value = []

    audioFile.value = new File([blob], `file${Date.now()}.m4a`);

}

async function uploadFile(file) {

    console.log("[ upload file ]")

    let formData = new FormData()
    formData.append("file", file)
    formData.append("name", selectedPerson.value.name)
    
    if(reset.value === true) {
        formData.append("reset", reset)
        reset.value = false
    }


    try {

        const response = await $fetch("/api/transcribe", {
            method: "POST",
            headers: {
                'Accept': 'application/json',
            },
            body: formData,
            signal: abortController.value.signal,
        })

        console.log("[ received response ]")

        if(response.hasOwnProperty('text')) {
        
            speakMessage(response.text)

        }

    } catch(err) {
        console.log(err)
    }

}

async function speakMessage(msg) {

    if(!synth) return

    if(msg.length === 0) return

    const utterThis = new SpeechSynthesisUtterance(msg);

    const voices = synth.getVoices();
    for (const voice of voices) {
        if (voice.name === selectedPerson.value.voice.name) {
            utterThis.voice = voice;
        }
    }
    
    utterThis.pitch = selectedPerson.value.voice.pitch
    utterThis.rate = selectedPerson.value.voice.rate

    utterThis.onstart = () => {
        console.log("[ start speech ]")
    }
    utterThis.onend = () => {
        console.log("[ end speech ]")
    }

    synth.speak(utterThis);

}

watch(audioFile, (value) => {

    uploadFile(value)

})

watch(startCountdown, (value) => {
    
    clearInterval(timer.value)

    if(value === true) {
        
        count.value = 0

        timer.value = setInterval(() => {
            
            count.value++

        }, 100)

    }

})

onMounted(() => {

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

        const options = { audio: true }
        navigator.mediaDevices.getUserMedia(options).then(handleStream).catch(handleError)

    } else {

        errorMessage.value = "Media devices not supported"
        
    }

    synth = window.speechSynthesis;

    abortController.value = new AbortController()

    selectedPerson.value = contacts.items.find(item => item.name.toLowerCase() === route.params.id.toLowerCase())

})

onBeforeUnmount(() => {

    abortController.value.abort()

    window.cancelAnimationFrame(animFrame.value)

})

</script>

<template>
    <div class="container">
        <div class="main">
            <div class="content">
                <div class="avatar">
                    <img class="icon" :src="person" alt="avatar" />
                </div>
                <p class="name">{{ route.params.id }}</p>
                <p v-if="errorMessage" class="error">{{ `Error: ${errorMessage}` }}</p>
                <p>{{ isRecording ? 'Recording...' : 'Not Recording' }}</p>
            </div>
            <div class="action">
                <ExitButton @click="handleClose" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.error {
    color: #ff6767;
}
.icon {
    width: 120px;
    height: 120px;
    object-fit: cover;
    box-sizing: border-box;
    border: 1px solid var(--color-border-hover);
    border-radius: 50%;
}
.name {
    text-transform: capitalize;
    font-size: 1.5rem;
    color: var(--color-text-green);
}
.container {
    position: relative;
    height: 100vh;
    min-height: 500px;
    display: flex;
    justify-content: center;
    align-items: center;
}
.main {
    position: relative;
    width: 100%;
    max-width: 414px;
    height: 100%;
    min-height: 500px;
}
.content {
    position: relative;
    height: 50%;
    min-height: 250px;
    display: flex;
    justify-content: center;
    flex-direction: column;
    text-align: center;
} 
.content p {
    margin: 0.1rem;
}

.action {
    position: relative;
    height: 50%;
    min-height: 250px;
    display: flex;
    justify-content: center;
    align-items: center;
}

@media (max-height: 400px) {
    .icon {
        width: 100px;
        height: 100px;
    }
}

</style>