<script setup>
import ExitButton from '~~/components/ExitButton.vue'
import Avatar from '~~/components/Avatar.vue'

//import person from '../../assets/person-svgrepo-com.svg'
import contacts from '../../assets/contacts.json'

const MAX_COUNT = 35 //20 - 2s
const MIN_DECIBELS = -70 //-45

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

const startLoader = ref(false)

const messageInput = ref('')

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
    analyser.maxDecibels = -10
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

    // test
    audioFile.value = new File([blob], `file${Date.now()}.m4a`);

}

async function uploadFile(file) {

    //console.log("upload data")
    
    let formData = new FormData()
    formData.append("file", file)
    formData.append("name", selectedPerson.value.name)
    
    if(reset.value === true) {
        formData.append("reset", reset.value)
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

        if(response.hasOwnProperty('text')) {
            
            if(response.text.length > 0) {
                //speakMessage(response.text)
            }

        }

    } catch(err) {
        console.log(err)
    }

}

async function handleSend() {

    try {

        const message = messageInput.value

        console.log('user', message, (new Date()).toLocaleTimeString())

        messageInput.value = ''

        const response = await $fetch("/api/transcribe", {
            method: "POST",
            headers: {
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                name: selectedPerson.value.name,
                message
            }),
            signal: abortController.value.signal,
        })

        //console.log('send', response)

        if(response.status === 'ok' && response.text) {

            console.log('chatbot', response.text)

            //speakMessage(response.text)

        }

    } catch(error) {

        console.log(error)

    }

}

async function speakMessage(msg) {

    if(!synth) return

    if(msg.length === 0) return

    const utterThis = new SpeechSynthesisUtterance(msg);

    const voices = synth.getVoices();
    for (const voice of voices) {
        if (voice.name === 'Karen') { //selectedPerson.value.voice.name) {
            utterThis.voice = voice;
        }
    }
    
    utterThis.rate = 0.9 //selectedPerson.value.voice.rate
    utterThis.pitch = 1.3 //selectedPerson.value.voice.pitch
    

    utterThis.onstart = () => {
        startLoader.value = true
    }
    utterThis.onend = () => {
        startLoader.value = false
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

/*
<div class="avatar-container">
                    <Avatar class="avatar" color="#FFFFFF" />
                </div>
*/
</script>

<template>
    <div class="container">
        <div class="main">
            <div class="content">
                <p class="name">{{ route.params.id }}</p>
                <p v-if="errorMessage" class="error">{{ `Error: ${errorMessage}` }}</p>
                <div v-if="!errorMessage" class="loader-container">
                    <div class="loader">
                        <AnimatedBars :start="startLoader" />
                    </div>
                </div>
                <p v-if="!errorMessage" class="record-text">{{ isRecording ? 'Recording' : 'Not Recording' }}</p>
            </div>
            <div class="action">
                <div class="center">
                    <div class="input">
                        <input v-model="messageInput" placeholder="Send message" class="text-input" type="text" />
                        <button :disabled="!messageInput" @click="handleSend" class="send-button">Send</button>
                    </div>
                    <ExitButton @click="handleClose" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.text-input {
    font-size: .8rem;
    padding: 5px 10px;
    appearance: none;
    border-width: 0;
    /*border-top-left-radius: 12px;
    border-bottom-left-radius: 12px;*/
}
.send-button {
    appearance: none;
    border-width: 0;
    padding: 5px 10px;
    font-size: .8rem;
}
.center {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.input {
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
}
.avatar-container {
    position: relative;
    display: flex;
    justify-content: center;
}
.loader-container {
    display: flex;
    justify-content: center;
}
.loader {
    position: relative;
    width: 55px;
}
.error {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 0.7rem;
    color: #ff6767;
}
.record-text {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 0.7rem;
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
    /*background-color: #a25;*/
    position: relative;
    width: 100%;
    max-width: 414px;
    height: 100%;
    min-height: 500px;
}
.content {
    /*border: 1px solid chartreuse;*/
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
    /*border: 1px solid pink;*/
    position: relative;
    height: 50%;
    min-height: 250px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.avatar {
    border: 1px solid var(--color-border-hover);
    background-color: #e6e6e6;
    width: 120px;
    width: 120px;
}
@media (max-height: 400px) {
    .avatar {
        width: 100px;
        height: 100px;
    }
}

@media (prefers-color-scheme: dark) {
    .avatar {
        background-color: #999999;
    }
}
</style>