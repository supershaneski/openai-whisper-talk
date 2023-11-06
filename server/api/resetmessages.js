import MongoDB from '~~/services/mongodb'

export default defineEventHandler(async (event) => {

    const { id } = await readBody(event)

    const mongoDb = new MongoDB()
    await mongoDb.initialize()

    let retdel = await mongoDb.deleteMessages(id)

    return {
        status: retdel.deletedCount > 0 ? 'ok' : 'error'
    }

})