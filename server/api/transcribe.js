import formidable from 'formidable'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

import { chat, whisper, speech } from '../../services/openai'
import MongoDB from '~~/services/mongodb'

import { trim_array } from '../../lib/utils'

import add_calendar_entry from '../../lib/add_calendar_entry.json'
import get_calendar_entry from '../../lib/get_calendar_entry.json'
import delete_calendar_entry from '../../lib/delete_calendar_entry.json'
import edit_calendar_entry from '../../lib/edit_calendar_entry.json'

import save_new_memory from '../../lib/save_new_memory.json'
import get_info_from_memory from '../../lib/get_info_from_memory.json'

import contacts from '../../assets/contacts.json'
import user_info from '../../assets/user.json'

export default defineEventHandler(async (event) => {

    const mongoDb = new MongoDB()
    await mongoDb.initialize()

    let selPerson = null

    const form = formidable({ multiples: true })

    let data = await new Promise((resolve, reject) => {
    
        form.parse(event.req, (err, fields, files) => {
        
            if (err) {
                reject(err)
            }

            let isAudioExist = true

            if (!files.file) {

                isAudioExist = false

            }
            
            selPerson = contacts.items.find(item => item.name.toLowerCase() === fields.name.toLowerCase())

            if(isAudioExist) {

                if (files.file.mimetype.startsWith("application/octet-stream")) {
                
                    let filename = Date.now() + Math.round(Math.random() * 100000) + files.file.originalFilename
                    let newPath = `${path.join("public", "upload", filename)}`
                    let oldPath = files.file.filepath
                    
                    fs.copyFileSync(oldPath, newPath)
                    
                    resolve({
                        status: "ok",
                        file: filename,
                    })
    
                } else {
    
                    resolve({
                        status: "error",
                        message: "File not audio data",
                    })
    
                }

            } else {

                resolve({
                    status: "ok",
                    text: fields.message
                })

            }

        })

    })

    if(data.status === "error") {

        return {
            status: "error"
        }

    }

    let user_message = data.text ? data.text : ''

    if(data.file) {

        const outputDir = path.join("public", "upload")
        const filename = `${outputDir}/${data.file}`
        const outFile = `${outputDir}/out-${data.file}`
        
        // remove silence
        const retval = await new Promise((resolve, reject) => {

            const sCommand = `ffmpeg -i ${filename} -af silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB ${outFile}`
    
            exec(sCommand, (error, stdout, stderr) => {
                
                if (error) {
                    
                    resolve({
                        status: 'error',
                    })
    
                } else {
    
                    resolve({
                        status: 'success',
                        error: stderr,
                        out: stdout,
                    })
    
                }
                
            })
    
        })

        let sfilename = filename

        if(retval.status === 'success') {
            sfilename = outFile
        }

        let sizeKB = 0

        try {
            
            const stats = fs.statSync(sfilename)
            const fileSizeInBytes = stats.size
            sizeKB = fileSizeInBytes / 1024

        } catch (err) {
            
            console.error(err.name, err.message)

        }

        if(sizeKB < 16) {

            return {
                status: 'error'
            }

        }
        
        const lang = selPerson.hasOwnProperty("lang") && selPerson.lang ? selPerson.lang : "en"
    
        const transcription = await whisper({
            file: fs.createReadStream(sfilename),
            language: lang,
            response_format: 'text',
            temperature: 0,
        })

        if(transcription.trim().length === 0) {

            return {
                status: "error"
            }

        }

        user_message = transcription

    }

    if(user_message.trim().length === 0) {

        return {
            status: "error"
        }

    }

    const today = new Date()

    let system_prompt = `In this session, we will simulate a voice conversation between two friends.\n\n` +
        
        `# Persona\n` +
        `You will act as ${selPerson.name}.\n` +
        `${selPerson.prompt}\n\n` +
        `Please ensure that your responses are consistent with this persona.\n\n` +

        `# Instructions\n` +
        `The user is talking to you over voice on their phone, and your response will be read out loud with realistic text-to-speech (TTS) technology.\n` +
        `Use natural, conversational language that are clear and easy to follow (short sentences, simple words).\n` +
        `Keep the conversation flowing.\n` +
        `Sometimes the user might just want to chat. Ask them relevant follow-up questions.\n\n` +
        
        `# Functions\n` +
        `You have the following functions that you can call depending on the situation.\n` +
        `add_calendar_entry, to add a new event.\n` +
        `get_calendar_entry, to get the event at a particular date.\n` +
        `edit_calendar_entry, to edit or update existing event.\n` +
        `delete_calendar_entry, to delete an existing event.\n` +
        `save_new_memory, to save new information to memory.\n` +
        `get_info_from_memory, to retrieve information from memory.\n\n` +

        `When you present the result from the function, only mention the relevant details for the user query.\n` +
        `Omit information that is redundant and not relevant to the query.\n` +
        `Always be concise and brief in your replies.\n\n` +

        `# User\n` +
        `As for me, in this simulation I am known as ${user_info.name}.\n` +
        `${user_info.prompt}\n\n` +
        
        `# Today\n` +
        `Today is ${today}.\n`
        

    let messages = [
        { role: 'system', content: system_prompt }
    ]

    let message_items = await mongoDb.getMessages()

    if(message_items.length > 0) {

        const history_context = (trim_array(message_items.filter((v) => v.uid === selPerson.id))).map((v) => ({ role: v.role, content: v.content }))

        messages = messages.concat(history_context)

    }

    console.log('user', user_message, (new Date()).toLocaleTimeString())

    const new_usermessage = { uid: selPerson.id, role: 'user', content: user_message }
    await mongoDb.addMessage(new_usermessage)

    messages.push({ role: new_usermessage.role, content: new_usermessage.content })

    let result_message = null
    let result_file = null

    try {
        
        let result = await chat({
            temperature: 0.3,
            messages,
            tools: [
                { type: 'function', function: add_calendar_entry },
                { type: 'function', function: get_calendar_entry },
                { type: 'function', function: edit_calendar_entry },
                { type: 'function', function: delete_calendar_entry },
                { type: 'function', function: save_new_memory },
                { type: 'function', function: get_info_from_memory }
            ]
        })
        

        result_message = result.message

        console.log('assistant1', result_message)
        
        if(result.message.content) {

            const new_botmessage = { uid: selPerson.id, role: 'assistant', content: result.message.content }
            await mongoDb.addMessage(new_botmessage)

            let filename = 'voice' + Date.now() + Math.round(Math.random() * 100000) + '.mp3'
            const audioFile = path.join('public', 'upload', filename)

            let text_speak = result.message.content.replace(/\n/g, '')

            await speech({
                voice: selPerson.voice.name || 'alloy',
                input: text_speak,
                filename: audioFile,
            })

            result_file = `/upload/${filename}`

        }

    } catch(error) {
        
        console.log(error.name, error.message)

    }
    
    return {
        status: "ok",
        output: result_message,
        file: result_file,
    }

})