<script setup>
import EditIcon from '~~/components/EditIcon.vue'
import PersonCircleIcon from '~~/components/PersonCircleIcon.vue'
import ResetIcon from '~~/components/ResetIcon.vue'
import DialogEditPrompt from '~~/components/DialogEditPrompt.vue'
import contacts from '../assets/contacts.json'

const showEditPrompt = ref(false)
const isMounted = ref(false)
const dialogParam = ref({})
const messages = ref([])

function handleCloseDialog() {
    showEditPrompt.value = false
}

function handleOpenDialog() {
    dialogParam.value = { type: 'user' }
    showEditPrompt.value = true
}

function handleEdit(name) {
    
    dialogParam.value = { type: 'friend', name }
    showEditPrompt.value = true

}

async function getMessages() {

    try {

        const response = await fetch('/api/getmessages')
        const result = await response.json()
        messages.value = result.items

    } catch(error) {
        console.log(error.name, error.message)
    }

}

async function resetMessages(id) {

    try {

        const response = await $fetch('/api/resetmessages', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
            },
            body: { id }
        })

        if(response.status === 'ok') {
            getMessages()
        }

    } catch(error) {
        console.log(error.name, error.message)
    }

}

function isMessageExist(id) {
    if(messages.length === 0) return false
    return messages.value.filter((a) => a.uid === id).length > 0
}

const sortedContacts = computed(() => contacts.items.sort((a, b) => {
    if(a.name > b.name) return 1
    if(a.name < b.name) return -1
    return 0
}))

watch(isMounted, (newval) => {
    if(newval) {
        getMessages()
    }
})

onMounted(() => {
    isMounted.value = true
})
</script>

<template>
    <div class="container">
       <div class="main">
            <div class="topbar">
                <div class="topbar-inner">
                    <button @click="handleOpenDialog" class="icon-button">
                        <PersonCircleIcon />
                    </button>
                </div>
            </div>
            <div class="list">
                <div v-for="person in sortedContacts" :key="person.name" class="item">
                    <NuxtLink class="link" :to="`/talk/${person.name}`">
                        <span class="text">{{ person.name }}</span><span v-if="person.lang">&nbsp;({{ person["lang-caption"] }})</span>
                    </NuxtLink>
                    <button @click.stop="handleEdit(person.name)" class="icon-button">
                        <EditIcon />
                    </button>
                    <button v-if="isMessageExist(person.id)" @click="resetMessages(person.id)" class="icon-button">
                        <ResetIcon />
                    </button>
                </div>
            </div>
        </div>
        <Teleport to="body">
            <DialogEditPrompt :param="dialogParam" :show="showEditPrompt" @close="handleCloseDialog" />
        </Teleport>
    </div>
</template>

<style scoped>
.icon-button {
    background-color: transparent;
    appearance: none;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 5px;
    border-width: 0;
    border-radius: 50%;
    cursor: pointer;
}
.icon-button:hover {
    background-color: #efefef;
}
.container {
    position: relative;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}
.main {
    position: relative;
    width: 100%;
    height: 100%;
}
.topbar {
    position: relative;
    height: 50px;
}
.topbar-inner {
    position: relative;
    height: 45px;
    margin: 5px 5px 0 5px;
    padding: 5px 5px 0 0;
    display: flex;
    justify-content: flex-end;
    box-sizing: border-box;
}
.link {
    margin-right: 8px;
}
.link:hover {
    background-color: transparent;
    text-decoration: underline;
}

.list::-webkit-scrollbar {
    display: none;
}
.list {
    position: relative;
    height: calc(100% - 50px);
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
    scroll-behavior: smooth;
}
.item {
    position: relative;
    margin-bottom: 0.5rem;
    padding: 1rem;
    text-align: center;
    border-radius: 0.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
}
.text {
    font-size: calc(5px + 3vmin);
}
@media (prefers-color-scheme: dark) {
    .icon-button:hover {
        background-color: #5598;
    }
}
</style>