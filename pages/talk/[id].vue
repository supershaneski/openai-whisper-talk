<script setup>
import ExitButton from '~~/components/ExitButton.vue'
import MicrophoneIcon from '../../components/MicrophoneIcon.vue'
import MicrophoneOffIcon from '../../components/MicrophoneOffIcon.vue'
import SendIcon from '../../components/SendIcon.vue'
import AnimatedBars from '~~/components/AnimatedBars.vue'

import contacts from '../../assets/contacts.json'

const MAX_COUNT = 3500
const MIN_DECIBELS = -45

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

const abortController = ref(null)
const selectedPerson = ref(null)
const languageStr = ref('')

const audioDomRef = ref(null)
const startLoader = ref(false)

const inputRef = ref(null)
const messageInput = ref('')

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

            if(isRecording.value === false && startLoader.value === false) {
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

    audioFile.value = new File([blob], `file${Date.now()}.webm`);

}

async function uploadFile(file) {

    let flagContinue = true
    let func = null
    let count = 0

    do {

        try {
            
            let formData = new FormData()
            formData.append("name", selectedPerson.value.name)
            formData.append("count", count)
            
            if(func) {
                
                formData.append("tools", func)

            } else {

                formData.append("file", file)

            }

            const url = func ? '/api/function_call' : '/api/transcribe'

            const response = await $fetch(url, {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                },
                body: formData,
                signal: abortController.value.signal,
            })

            if(response.status === 'ok' && response.file) {

                audioDomRef.value.src = response.file

            }

            if(response.output.tool_calls) {

                func = response.output

            } else {

                flagContinue = false

            }

        } catch(error) {

            console.log(error.name, error.message)

            flagContinue = false

        }

        count++

    } while(flagContinue)

}

async function handleSend() {

    const message = messageInput.value

    let flagContinue = true
    let func = null
    let count = 0

    do {

        try {
            
            let payload = {
                name: selectedPerson.value.name,
                message: message,
                count: count,
            }
            
            if(func) {
                
                payload.tools = func

            } else {
                
                messageInput.value = ''

            }

            const url = func ? '/api/function_call' : '/api/transcribe'

            const response = await $fetch(url, {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: abortController.value.signal,
            })

            if(response.status === 'ok' && response.file) {

                audioDomRef.value.src = response.file

            }

            console.log("response", response)

            if(response.output.tool_calls) {

                func = response.output

            } else {

                flagContinue = false

            }

        } catch(error) {

            console.log(error.name, error.message)

            flagContinue = false

        }

        count++

    } while(flagContinue)

}

function getAudioDuration() {

    console.log("get audio duration")

    audioDomRef.value.currentTime = 0
    audioDomRef.value.removeEventListener('timeupdate', getDuration)

    if(audioDomRef.value.duration === Infinity) {
        console.log("audio infinity error")
        startLoader.value = false
        return
    }

    audioDomRef.value.play()
    startLoader.value = true

}

function handleAudioLoad() {
    
    if(audioDomRef.value.duration === Infinity) {

        console.log("audio infinity 1")

        audioDomRef.value.currentTime = 1e101
        audioDomRef.value.addEventListener('timeupdate', getAudioDuration)

    } else {

        console.log("audio started 1")

        audioDomRef.value.play()
        startLoader.value = true

    }

}

function handleAudioEnded() {

    console.log("audio ended")

    startLoader.value = false
}

function handleAudioError() {
    console.log("Audio error")
    startLoader.value = false
}

watch(audioFile, (value) => {

    uploadFile(value)

})

watch(startCountdown, (value) => {
    
    clearInterval(timer.value)

    if(value === true) {
        
        count.value = 0

        timer.value = setInterval(() => {
            
            count.value += 100

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

    abortController.value = new AbortController()

    selectedPerson.value = contacts.items.find(item => item.name.toLowerCase() === route.params.id.toLowerCase())

    if(!selectedPerson.value) {
        
        navigateTo("/")

    } else {

        languageStr.value = selectedPerson.value["lang-caption"]

        inputRef.value.focus()

        audioDomRef.value = new Audio()
        audioDomRef.value.type = 'audio/mpeg'
        audioDomRef.value.addEventListener('loadedmetadata', handleAudioLoad)
        audioDomRef.value.addEventListener('ended', handleAudioEnded)
        audioDomRef.value.addEventListener('error', handleAudioError)

    }

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
                <div class="name">{{ route.params.id }}</div>
                <div v-if="selectedPerson" class="language">{{ languageStr }}</div>
                <div class="loader-container">
                    <div class="loader">
                        <AnimatedBars :start="startLoader" />
                    </div>
                </div>
            </div>
            <div class="mode">
                <div class="voice-input">
                    <div v-if="!errorMessage" :class="{recordON: isRecording}" class="voice-icon-container">
                        <MicrophoneIcon class="voice-icon" />
                    </div>
                    <div v-if="errorMessage" class="voice-icon-container">
                        <MicrophoneOffIcon class="voice-icon" />
                    </div>
                </div>
                <div class="message-input">
                    <div class="input">
                        <input ref="inputRef" v-model="messageInput" placeholder="Send message" class="text-input" type="text" />
                        <button :disabled="!messageInput" @click="handleSend" class="send-button">
                            <SendIcon class="send-icon" />
                        </button>
                    </div>
                </div>
            </div>
            <div class="action">
                <div class="center">
                    <ExitButton @click="handleClose" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.message-input {
    position: relative;
}
.input {
    position: relative;
    width: 100%;
}
.voice-input {
    position: relative;
    margin-bottom: 5rem;
    display: flex;
    justify-content: center;
}
.voice-icon-container {
    border-width: calc(1px + .5vmin);
    border-style: solid;
    border-color: #e6e6e6;
    border-radius: 50%;
    padding: 10px;
    width: calc(20px + 10vmin);
    height: calc(20px + 10vmin);
    box-sizing: border-box;
    transition: border .3s ease-in-out;
}
.voice-icon {
    fill: #e6e6e6;
    transition: border .3s ease-in-out;
}
.recordON {
    border-color: #00DC82;
}
.recordON .voice-icon{
    fill: #00DC82;
}

.text-input {
    font-size: calc(4px + 2vmin);
    padding: 8px 36px 8px 12px;
    appearance: none;
    border-width: 1px;
    border-style: solid;
    border-color: #dcdcdc;
    border-radius: 16px;
    background-color: transparent;
    width: 100%;
    outline: none;
    color: #333;
}
.text-input::placeholder {
    color: #bbb;
}
.text-input:focus {
    border-color: #555;
}
.send-button {
    background-color: transparent;
    color: #fff;
    appearance: none;
    border-width: 0;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    padding: 3px;
    position: absolute;
    right: 8px;
    cursor: pointer;
}
.send-button .send-icon {
    fill: #555;
}
.send-button:disabled .send-icon {
    fill: #dcdcdc;
}

.center {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.input {
    display: flex;
    align-items: center;
}
.loader-container {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
}
.loader {
    position: relative;
    width: 80px;
}

.name {
    text-transform: capitalize;
    font-size: calc(10px + 6vmin);
    color: var(--color-text-green);
    margin: 0;
    padding: 0;
    line-height: 120%;
}
.language {
    margin: 0;
    padding: 0;
    font-size: calc(2px + 3vmin);
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
    height: 40%;
    min-height: 250px;
    display: flex;
    justify-content: center;
    flex-direction: column;
    text-align: center;
}
.mode {
    position: relative;
    height: 40%;
    min-height: 250px;
}
.action {
    position: relative;
    height: 20%;
    min-height: 100px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
}

@media (prefers-color-scheme: dark) {
    .voice-icon-container {
        border-color: #555;
    }
    .voice-icon {
        fill: #555;
    }
    .recordON {
        border-color: #00DC82;
    }
    .recordON .voice-icon{
        fill: #00DC82;
    }

    .text-input {
        border-color: #999;
        color: #fff;
    }
    .text-input::placeholder {
        color: #777;
    }
    .text-input:focus {
        border-color: #fff;
    }

    .send-button {
        color: #fff;
    }
    .send-button .send-icon {
        fill: #fff;
    }
    .send-button:disabled .send-icon {
        fill: #555;
    }
}
</style>