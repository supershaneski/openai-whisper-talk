import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

import { trim_array, chunkText } from '../../lib/utils'

import { chat, embedding, speech } from '../../services/openai'
import MongoDB from '~~/services/mongodb'

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

            selPerson = contacts.items.find(item => item.name.toLowerCase() === fields.name.toLowerCase())
            
            if(fields.tools) {

                resolve({
                    status: "ok",
                    //function: { content: null, role: 'assistant', function_call: fields.function.function_call }, // strip message
                    response: fields.tools
                })

            } else {

                resolve({
                    status: "error"
                })

            }

        })

    })

    if(data.status === "error") {

        return {
            status: "error"
        }

    }

    console.log("data-response", data.response)

    let function_return = data.response
    let api_outputs = []

    //function_return.tool_calls.forEach(async (tool) => {
    for(const tool of function_return.tool_calls) {
        
        let function_name = tool.function.name
        let function_args = JSON.parse(tool.function.arguments)

        let api_output = {}

        if(function_name === 'add_calendar_entry') {

            const retadd = await mongoDb.addCalendarEntry(function_args)

            api_output = { status: retadd.status, message: retadd.status === 'error' ? 'Event already existing' : 'New event added', event: function_args.event }

        } else if(function_name === 'get_calendar_entry') {

            const calendar_entries = await mongoDb.getCalendarEntryByDate(function_args.date)

            api_output = calendar_entries.length > 0 ? { message: `Found ${calendar_entries.length} entries`, items: calendar_entries } : { message: 'No entries found' }

        } else if(function_name === 'edit_calendar_entry') {

            const editret = await mongoDb.editCalendarEntry(function_args)

            api_output = { message: 'Entry edited' }

        } else if(function_name === 'delete_calendar_entry') {

            const delret = await mongoDb.deleteCalendarEntry(function_args)

            api_output = delret.deletedCount && delret.deletedCount >= 0 ? { message: delret.deletedCount > 0 ? 'Entry deleted' : 'No entry deleted' } : { ...delret.message }

        } else if(function_name === 'save_new_memory') {

            let embedding_text = `title: ${function_args.memory_title}\n` +
                `detail: ${function_args.memory_detail}\n`
            
            if(function_args.memory_date) embedding_text += `date: ${function_args.memory_date}\n`
            if(function_args.memory_tags) embedding_text += `tags: ${function_args.memory_tags.join(',')}`

            let maxCharLength = 250 * 4
            let batchSize = 20

            const text_chunks = chunkText({ text: embedding_text, maxCharLength })

            const batches = [];
            for (let i = 0; i < text_chunks.length; i += batchSize) {
                batches.push(text_chunks.slice(i, i + batchSize))
            }

            let text_embeddings = []

            try {

                const batch_promises = batches.map((batch) => embedding({ input: batch }))

                const embeddings = (await Promise.all(batch_promises)).flat()

                text_embeddings = embeddings.map((embedding, index) => ({
                    embedding,
                    text: text_chunks[index],
                }))

                await mongoDb.addEntry(text_embeddings)

                api_output = { message: 'New memory saved' }

            } catch(error) {

                console.log(error.name, error.message)

                api_output = { message: 'Failed to save memory' }

            }

        } else if(function_name === 'get_info_from_memory') {

            let text_result = ''

            const record_count = await mongoDb.getCount()

            if(record_count > 0) {

                try {

                    const query_embedding_response = await embedding({
                        input: function_args.search.join(','),
                    })

                    const query_embedding = query_embedding_response.length > 0 ? query_embedding_response[0] : []

                    text_result = await mongoDb.searchEntry(query_embedding)

                    api_output = { message: `Retrieved related info for ${function_args.search}`, result: text_result }

                } catch(error) {
                    
                    console.log(error.name, error.message)

                    api_output = { message: 'Failed to retrieve info from memory' }

                }

            } else {

                api_output = { message: 'Memory is empty' }

            }

        } else {

            api_output = { message: 'function not found' }

        }

        api_outputs.push({ tool_call_id: tool.id, role: 'tool', name: tool.function.name, content: JSON.stringify(api_output, null, 2) })

    }
    //})

    console.log('api-output', api_outputs)

    /*
    const flagForce = true
    if(flagForce) {
        return {
            status: "error"
        }
    }
    */
    
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
        `get_info_from_memoryn, to retrieve information from memory.\n\n` +

        `When you present the result from the function, only mention the relevant details for the user query.\n` +
        `Omit information that is redundant and not relevant to the query.\n` +
        `Always be concise and brief in your replies.\n` +
        `When you received an error status or message on function output, please stop function calling and inform the user.\n\n` +

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

    messages.push(function_return)
    //messages.push({ role: 'function', name: function_name, content: JSON.stringify(api_output, null, 2) })
    for(const api_output_item of api_outputs) {
        messages.push(api_output_item)
    }

    let result_message = null
    let result_file = null

    try {

        let result = await chat({
            //model: 'gpt-3.5-turbo-0613',
            //max_tokens: 1024,
            temperature: 0.3,
            messages,
            /*functions: [
                add_calendar_entry, 
                get_calendar_entry, 
                edit_calendar_entry, 
                delete_calendar_entry,
                save_new_memory,
                get_info_from_memory
            ]*/
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
        
        console.log('assistant2', result_message)

        if(result.message.content) {
    
            const new_botmessage = { uid: selPerson.id, role: 'assistant', content: result.message.content }
            await mongoDb.addMessage(new_botmessage)

            let filename = 'voice' + Date.now() + Math.round(Math.random() * 100000) + '.mp3'
            const audioFile = path.join('public', 'upload', filename)

            await speech({
                voice: selPerson.voice.name2 || 'alloy',
                input: result.message.content.replace(/\n/g, ''),
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