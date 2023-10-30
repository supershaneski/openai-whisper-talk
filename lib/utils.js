
/**
 * Checks if number is even
 * @param {Integer} n 
 * @returns 
 */
export const isEven = (n) => n % 2 == 0

/**
 * Trims array to desired length
 * @param {Array} arr - Array to trim 
 * @param {Integer} max_length 
 * @returns {Array}
 */
export function trim_array( arr, max_length = 20 ) {

    let new_arr = arr
    
    if(arr.length > max_length) {
        
        let cutoff = Math.ceil(arr.length - max_length)
        cutoff = isEven(cutoff) ? cutoff : cutoff + 1
        
        new_arr = arr.slice(cutoff)

    }

    return new_arr

}

export function capitalName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1)
}

export function formatData(data) {

    let txts = data.split("\n").filter(item => item.length > 0).filter(item => item.indexOf('[') === 0).map(item => {
        let n = item.indexOf(']')
        return item.substr(n + 1).trim()
    })

    return txts.length > 0 ? txts.join(' ') : ''
    
}

export function mockTalk() {
    const messages = [
        "Yeah, you're right...",
        "To prove that I am not crazy here is the data that proves it.",
        "It returned random stuff. Then I realized it had lost all previous context.",
        "It can be applied to virtually any task that requires understanding or generating natural language and code.",
        "Okay, got it.",
        "Yeah being able to sort and organise it is sorely needed.",
        "Let me think about it.",
        "Thank you!",
        "Thank you...",
        "No, I don' think so"
    ]

    const index = Math.ceil(messages.length * Math.random())

    return messages[index]
}