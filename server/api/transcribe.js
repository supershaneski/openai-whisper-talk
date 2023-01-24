import { Configuration, OpenAIApi } from "openai"
import formidable from "formidable"
import { exec } from 'child_process'
import fs from "fs"
import path from "path"
import { formatData, setPromptInto } from "~~/lib/utils"

const configuration = new Configuration({
    apiKey: useRuntimeConfig().openaiApiKey,
})

const openai = new OpenAIApi(configuration)

// simple server variable to persist 
// this will be use to store previous conversation
let chatData = ''

export default defineEventHandler(async (event) => {

    let botName = ""

    const form = formidable({ multiples: true })

    let data = await new Promise((resolve, reject) => {
    
        form.parse(event.req, (err, fields, files) => {
        
            if (err) {
                reject(err)
            }

            if (!files.file) {

                resolve({
                    status: "error",
                    message: "File not found",
                })

            }

            if(fields.reset) {
                chatData = ''
            }

            botName = fields.name || 'Daniel'

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

        })

    })

    if(data.status === "error") {
        return {
            status: "error"
        }
    }

    const outputDir = path.join("public", "upload")
    const filename = `${outputDir}/${data.file}`

    let sCommand = botName === "Junko" ? `whisper './${filename}' --language Japanese --task translate --model tiny --output_dir '${outputDir}'` : `whisper './${filename}' --language English --model tiny --output_dir '${outputDir}'`
    
    data = await new Promise((resolve, reject) => {

        exec(sCommand, (error, stdout, stderr) => {
            
            if (error) {
                
                resolve({
                    status: 'error',
                    message: "Failed to transcribe [1]",
                })

            } else {

                resolve({
                    status: 'ok',
                    error: stderr,
                    out: formatData(stdout),
                })

            }
            
        })

    })

    if(data.status === "error" || data.out.length === 0) {
        return {
            status: "error"
        }
    }

    // set prompt introduction depending on botname
    let prompt = setPromptInto(botName)

    chatData += '\n'
    chatData += `You: ${data.out}`

    // add previous conversion to add context in the conversation
    prompt += chatData

    // check token count
    const tokenPrompt = parseInt(prompt.length / 4) // we are making simple assumption that 4 chars = 1 token
    if(tokenPrompt > 1800) {

        /*
        The actual maximum number of tokens is around 2048 (new models support 4096).
        But I do not plan to hit it but put the ceiling a bit much lower then remove
        old messages after it is reached to continue chatting.
        */
        
        // remove several lines from stored data
        let tmpData = chatData.split("\n").filter((d, i) => i > 20)
        chatData = tmpData.join("\n")

    }

    const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 0.5,
        max_tokens: 180,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0,
        stop:["You:"]
    })

    let reply = completion.data.choices[0].text
    if(reply.length > 0) {
        
        if(reply.indexOf(botName) >= 0) {
            
            let token = reply.split(`${botName}:`)
            reply = token.length > 1 ? token[1].trim() : ''

            if(reply.length > 0) {
                
                chatData += `\n`
                chatData += `${botName}: ${reply}`

                console.log("You:", data.out)
                console.log(`${botName}:`, reply)

            }

        } else {
            reply = ''
        }

    }
    
    return {
        status: "ok",
        text: reply,
    }

})