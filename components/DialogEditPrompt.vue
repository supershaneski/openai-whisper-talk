<script setup>
import user from '../assets/user.json'
import contacts from '../assets/contacts.json'

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
    param: {
        type: Object
    }
})

const emit = defineEmits(['close'])

const title = ref('')
const name = ref('')
const prompt = ref('')
const language = ref('')
const id = ref('')
const isLoading = ref(false)

const parms = toRef(props, 'param')

async function handleSave() {

    let formData = new FormData()
    formData.append("type", props.param.type)
    formData.append("id", id.value)
    formData.append("name", name.value)
    formData.append("prompt", prompt.value)
    
    try {

        const response = await fetch('/api/editprompt', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
            },
            body: formData,
        })

        if(!response.ok) {
            console.log('Oops, an error occurred', response.status)
        }

        const result = await response.json()


        if(result.status === 'ok') {
            emit('close')
        }

    } catch(error) {

        console.log(error.name, error.message)

    }

}

watch(parms, (newvalue) => {
    if(newvalue) {
        
        if(newvalue.type === 'user') {

            title.value = 'user prompt'
            name.value = user.name
            prompt.value = user.prompt
            language.value = ''
            id.value = ''

        } else {

            const friend = contacts.items.find((c) => c.name === newvalue.name)

            if(friend) {

                title.value = 'friend prompt'
                id.value = friend.id
                name.value = friend.name
                prompt.value = friend.prompt
                language.value = friend['lang-caption']

            }

        }

    }
})

const noSaveFlag = computed(() => name.value.trim().length === 0 || prompt.value.trim().length === 0)

</script>

<template>
    <Transition name="nested">
        <div v-if="props.show" class="modal-mask">
            <div class="center">
                <div class="contents">
                    <div class="title-item">
                        <h4 class="title">{{ title }}</h4>
                    </div>
                    <div class="input-item">
                        <label class="label">Name</label>
                        <input :disabled="isLoading" class="input-text" type="text" v-model="name" />
                    </div>
                    <div class="input-item">
                        <label class="label">Persona</label>
                        <textarea :disabled="isLoading" class="input-textarea" v-model="prompt" />
                    </div>
                </div>
                <div class="action">
                    <div class="language">{{ language }}</div>
                    <div class="button-group">
                        <button :disabled="isLoading || noSaveFlag" class="button" @click="handleSave">Save</button>
                        <button :disabled="isLoading" class="button" @click="$emit('close')">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.contents {
    position: relative;
    width: 400px;
}
.input-item {
    position: relative;
    margin-bottom: 1rem;
}
.input-item:last-child {
    margin-bottom: 0;
}
.label {
    display: block;
    font-family: Arial, Helvetica, sans-serif;
}
.input-text {
    font-family: Arial, Helvetica, sans-serif;
    background-color: #f5f5f5;
    width: 100%;
    appearance: none;
    border-width: 0;
    border-radius: 4px;
    padding: 8px;
    box-sizing: border-box;
}
.input-textarea {
    font-family: Arial, Helvetica, sans-serif;
    background-color: #f5f5f5;
    width: 100%;
    appearance: none;
    border-width: 0;
    border-radius: 4px;
    padding: 8px;
    box-sizing: border-box;
    height: 7rem;
    line-height: 140%;
}
.title-item {
    margin-bottom: 1rem;
}
.title {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 1rem;
    font-weight: 500;
    text-transform: capitalize;
    text-align: center;
    margin: 0;
}
.button {
    background-color: #00DC82;
    appearance: none;
    border-width: 0;
    border-radius: 16px;
    padding: 8px 16px;
    color: #fff;
    cursor: pointer;
}
.button + .button {
    margin-left: 10px;
}
.button:hover {
    background-color: #00DC8299;
}
.button:active {
    transform: translateY(1px);
}

.button:disabled {
    background-color: #999;
    color: #CCC;
}
.button:disabled:active {
    transform: translateY(0px);
}
.action {
    margin-top: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.modal-mask {
    background-color: rgba(0, 0, 0, 0.5);
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9998;
}
.center {
    box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
    background-color: #fff;
    border-radius: 6px;
    padding: 1.5rem 1.5rem 1rem 1.5rem;
}
@media (prefers-color-scheme: dark) {
    .title {
        color: #fff;
    }
    .modal-mask {
        background-color: rgba(0, 0, 0, 0.5);
    }
    .center {
        background-color: #444;
    }
}
</style>