import mongoose from 'mongoose'

export default class MongoDB {

    constructor() {

        this.MemoryVectors = undefined

        this.Messages = undefined

        this.CalendarEntry = undefined

        this.error = false

    }

    async initialize() {

        const db_hostname = useRuntimeConfig().mongodbHostName
        const db_port = useRuntimeConfig().mongodbPort
        const db_name = useRuntimeConfig().mongodbDbName
        
        try {

            await mongoose.connect(`mongodb://${db_hostname}:${db_port}/${db_name}`)
    
            const messagesSchema = new mongoose.Schema({
                uid: String,
                role: String,
                content: String,
                function_call: {
                    arguments: String,
                    name: String,
                }
            })

            const memoryVectorsSchema = new mongoose.Schema({
                chunks: [{ embedding: [Number], text: String }]
            })

            memoryVectorsSchema.methods.getScore = function getScore(query_embedding) {
                return this.chunks.map((chunk) => {
                    const dot_product = chunk.embedding.reduce((sum, val, i) => sum + val * query_embedding[i], 0)
                    const magnitude = (vec) => Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0))
                    const cosine_similarity = dot_product / (magnitude(chunk.embedding) * magnitude(query_embedding))
                    return { text: chunk.text, score: cosine_similarity }
                })
            }

            const calendarEntrySchema = new mongoose.Schema({
                event: { type: String, index: true }, // String,
                date: String,
                time: String,
                additional_detail: String,
            })
            
            const MemoryVectors = mongoose.models.MemoryVectors || mongoose.model('MemoryVectors', memoryVectorsSchema)
            const Messages = mongoose.models.Messages || mongoose.model('Messages', messagesSchema)
            const CalendarEntry = mongoose.models.CalendarEntry || mongoose.model('CalendarEntry', calendarEntrySchema)

            this.MemoryVectors = MemoryVectors
            this.Messages = Messages
            this.CalendarEntry = CalendarEntry

        } catch(error) {

            console.log(error.name, error.message)

            this.error = true

            throw error

        }

    }

    async addCalendarEntry(calEntry) {

        if(this.error) return

        const newCalEntry = new this.CalendarEntry(calEntry)

        const exist_entry = await this.CalendarEntry.find({
            event: newCalEntry.event,
            date: newCalEntry.date,
            time: newCalEntry.time,
        })

        if(exist_entry.length > 0) {
            return { status: 'error' }
        }

        await newCalEntry.save()

        return { status: 'ok' }
    }

    async getCalendarEntryByDate(date) {

        if(this.error) return

        return await this.CalendarEntry.find({ date: date })

    }

    async getCalendarEntryByEvent(event) {

        if(this.error) return

        return await this.CalendarEntry.find({ $text: { $search: event } })

    }

    async editCalendarEntry(editedEvent) {

        if(this.error) return

        let { event, ...rest } = editedEvent

        //return await this.CalendarEntry.updateOne({ event: event }, { $set: rest })
        return await this.CalendarEntry.updateOne({ $text: { $search: event } }, { $set: rest })

    }

    async deleteCalendarEntry(deletedEvent) {

        if(this.error) return

        let { delete_type, event, date } = deletedEvent

        if(delete_type === 'event_name') {

            //return await this.CalendarEntry.deleteOne({ event: event })
            return await this.CalendarEntry.deleteOne({ $text: { $search: event } })

        } else {

            const events_by_date = this.CalendarEntry.find({ date: date })

            if(events_by_date.length > 1) {
                return { message: 'More than one events found in same date. Which one do you want to delete?', events: (await events_by_date).map((v) => v.event) }
            } else {
                return await this.CalendarEntry.deleteOne({ date: date })
            }
            
        }

    }

    async addMessage(message) {

        if(this.error) return

        const newMessage = new this.Messages(message)

        await newMessage.save()

    }

    async getMessages() {

        if(this.error) return
        
        return await this.Messages.find()

    }

    async deleteMessages(uid) {

        if(this.error) return

        return await this.Messages.deleteMany({ uid: uid })

    }

    async clearMessages() {

        if(this.error) return

        return await this.Messages.deleteMany({ __v: 0 })

    }

    async addEntry(chunks) {

        if(this.error) return

        const newVector = new this.MemoryVectors({
            chunks
        })

        await newVector.save()

    }

    async getCount() {

        if(this.error) return 0

        const vectors = await this.MemoryVectors.find()
        return vectors.length
    }

    /**
     * For text-embedding-ada-002, use 0.72 threshold
     * For text-embedding-3-small, text-embedding-3-large, use 0.3 
     */
    getCosineSimilarity(vectors, search_query, cosineSimThreshold = 0.3, maxFilesLength = 2000 * 3, maxResults = 10) {
        //cosineSimThreshold = 0.72, for text-embedding-ada-002

        if(this.error) return

        const vector_result = vectors.map((v) => {

            const s = v.getScore(search_query)
            //return v.getScore(search_query)
            
            console.log(s)

            return s
        }).flat().sort((a, b) => b.score - a.score).filter((chunk) => chunk.score > cosineSimThreshold).slice(0, maxResults)
        
        return vector_result.length > 0 ? vector_result.map((v) => `score: ${v.score}\n${v.text}`).join("\n").slice(0, maxFilesLength) : ''
        
    }

    async searchEntry(search_query) {

        if(this.error) return

        const vectors = await this.MemoryVectors.find()
        
        return this.getCosineSimilarity(vectors, search_query)

    }

}