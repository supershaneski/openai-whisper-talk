import OpenAI from 'openai'

import formidable from 'formidable'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

import { formatData, mockTalk, trim_array } from '../../lib/utils'
import contacts from '../../assets/contacts.json'

const openai = new OpenAI({
    apiKey: useRuntimeConfig().openaiApiKey,
    maxRetries: 3,
    timeout: 45 * 1000 // 45s
})

// simple server variable to persist 
// this will be use to store previous conversation
// it is probably better to use session variable
let chatData = ''

let message_items = []

export default defineEventHandler(async (event) => {

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

                /*
                resolve({
                    status: "error",
                    message: "File not found",
                })
                */

            }

            // resets previous conversation
            if(fields.reset) {
                
                chatData = ''
                
                message_items = []

            }

            // selected AI bot
            selPerson = contacts.items.find(item => item.name.toLowerCase() === fields.name.toLowerCase())

            if(isAudioExist) {

                if (files.file.mimetype.startsWith("application/octet-stream")) {
                
                    let filename = Date.now() + Math.round(Math.random() * 100000) + files.file.originalFilename
                    let newPath = `${path.join("public", "upload", filename)}`
                    
                    let oldPath = files.file.filepath
                    
                    // it is probably not necessary to copy the file to the upload folder
                    // and just directly use the original file location
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

            //const sCommand = `ffmpeg -i "${filename}" -f segment -segment_time 120 -c copy ${outFile}`
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

        //////////

        // Check file size
        let sizeKB = 0
        let sizeKB2 = 0

        try {
            
            const stats = fs.statSync(sfilename)
            const fileSizeInBytes = stats.size
            sizeKB = fileSizeInBytes / 1024

            if(sfilename !== filename) {

                const stats2 = fs.statSync(filename)
                const fileSizeInBytes2 = stats2.size
                sizeKB2 = fileSizeInBytes2 / 1024

            }

        } catch (err) {
            
            console.error(err.name, err.message)

        }

        // Do not send to whisper if less than 100KB
        const testFlag = false

        console.log("Size (KB)", sfilename, sizeKB, (new Date()).toLocaleTimeString())
        if(sizeKB2 > 0) {
            console.log("Size2 (KB)", filename, sizeKB2)
        }

        if(testFlag || sizeKB < 16) {

            return {
                status: 'error'
            }

        }
        
        //////////

        const lang = selPerson.hasOwnProperty("lang") && selPerson.lang ? selPerson.lang : "en"
    
        const whisper_prompt = `Umm, the transcript is like, about someone talking over the phone, to their friend, hmmm.`

        ////// WHISPER-API //////
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(sfilename),
            model: "whisper-1",
            language: lang,
            response_format: 'text',
            temperature: 0,
            prompt: whisper_prompt,
        })

        console.log('whisper-transcript', transcription.length, transcription)
        
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

    console.log(`user: ${user_message}`, user_message.length)

    //selPerson.prompt

    const today = new Date()

    let system_prompt = `In this session, we will simulate a voice conversation between two friends.\n` +
        
        //`You will act as Alice, a cheerful and friendly chatbot.\n` +
        //`You will respond in Valspeak.\n` +

        `You will act as ${selPerson.name}, a cheerful and friendly chatbot.\n` +
        `${selPerson.prompt}\n` +

        //`You will act as Mark, a cheerful and friendly chatbot.\n` +
        //`You will respond in Shakespearean, archaic English.\n` +

        //`You will act as Mark, a cheerful and friendly chatbot.\n` +
        //`You will respond in Shakespearean, archaic English.\n` +

        `The user is talking to you over voice on their phone, and your response will be read out loud with realistic text-to-speech (TTS) technology.\n` +
        `Use natural, conversational language that are clear and easy to follow (short sentences, simple words).\n` +
        `Keep the conversation flowing.\n` +
        `Sometimes the user might just want to chat. Ask them relevant follow-up questions.\n` +

        //`You will respond to user queries with enthusiasm, positivity, and a warm tone.\n` +
        //`You will act as the virtual best friend of the user.\n` +
        //`You will always be happy to help and engage in friendly conversations.\n` +
        //`Please ensure that your responses are consistent with this cheerful and friendly persona.\n` +
        `Please ensure that your responses are consistent with this persona.\n` +
        `Today is ${today}`

    let messages = [
        { role: 'system', content: system_prompt }
    ]

    if(message_items.length > 0) {

        const history_context = trim_array(message_items)

        messages = messages.concat(history_context)
    }

    const new_usermessage = { role: 'user', content: user_message }

    message_items.push(new_usermessage)
    messages.push(new_usermessage)

    let result_text = ''

    try {
        
        const result = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-0613',
            max_tokens: 1024,
            temperature: 0.3,
            messages,
        })

        result_text = result.choices[0].message.content

        console.log('history-count', message_items.length)
        console.log('assistant', result_text)

        const new_botmessage = { role: 'assistant', content: result_text }
        message_items.push(new_botmessage)

    } catch(error) {
        
        console.log(error.name, error.message)

    }
    
    return result_text ? {
        status: "ok",
        text: result_text,
    } : {
        status: "error"
    }

})