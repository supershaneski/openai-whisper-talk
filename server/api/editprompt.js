import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {

    const form = formidable({ multiples: true })

    let data = await new Promise((resolve, reject) => {
    
        form.parse(event.req, (err, fields) => {
        
            if (err) {
                reject(err)
            }

            resolve({
                status: "ok",
                type: fields.type,
                id: fields.id,
                name: fields.name,
                prompt: fields.prompt,
            })

        })

    })

    let error_flag = false

    const filename = data.type === 'user' ? path.join("assets", "user.json") : path.join("assets", "contacts.json")

    try {
        
        let raw_data = fs.readFileSync(filename, 'utf8')
        let objdata = JSON.parse(raw_data)

        if(data.type === 'user') {

            objdata.name = data.name
            objdata.prompt = data.prompt

        } else {

            objdata.items = objdata.items.map((item) => {
                return {
                    ...item,
                    name: item.id === data.id ? data.name : item.name,
                    prompt: item.id === data.id ? data.prompt : item.prompt,
                }
            })

        }

        raw_data = JSON.stringify(objdata)

        fs.writeFileSync(filename, raw_data)

    } catch(error) {

        console.log(error.name, error.message)

        error_flag = true

    }

    return {
        status: error_flag ? "error" : "ok",
    }

})