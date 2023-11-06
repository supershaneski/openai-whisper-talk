import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: useRuntimeConfig().openaiApiKey,
    maxRetries: 3,
    timeout: 60 * 1000 // 60s
})

export async function embedding({
    input,
    model = 'text-embedding-ada-002',
    encoding_format = 'float'
}) {

    try {

        const result = await openai.embeddings.create({
            model,
            input,
            encoding_format
        })
        
        return result.data.map((d) => d.embedding)

    } catch(error) {

        console.log(error.name, error.message)

        throw error

    }
}

export async function chat({
    model = 'gpt-3.5-turbo-0613',
    max_tokens = 1024,
    temperature = 0,
    messages,
    functions,
    function_call = 'auto',
}) {

    let options = { messages, model, temperature, max_tokens }

    if(functions) {

        options.functions = functions

        if(function_call) {
            options.function_call = function_call
        }
    
    }

    try {

        const result = await openai.chat.completions.create(options)

        return result.choices[0]

    } catch(error) {
        
        console.log(error.name, error.message)

        throw error

    }

}

export async function whisper({
    file,
    model = 'whisper-1',
    prompt = '',
    response_format = 'json',
    temperature = 0,
    language = 'en',
}) {

    try {

        const resp = await openai.audio.transcriptions.create({
            file,
            model,
            prompt,
            response_format,
            temperature,
            language,
        })

        return resp

    } catch(error) {
        
        console.log(error.name, error.message)

        throw error
        
    }
}