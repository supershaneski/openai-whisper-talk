import MongoDB from '~~/services/mongodb'

export default defineEventHandler(async (event) => {

    const mongoDb = new MongoDB()
    await mongoDb.initialize()

    let message_items = await mongoDb.getMessages()

    return {
        items: message_items
    }

})