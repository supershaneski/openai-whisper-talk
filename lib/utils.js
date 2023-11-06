
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

export function chunkText({
    text, // The input text to be split
    // The desired maximum length of each piece in characters
    // This uses 4 characters as an approximation of the average token length
    // since there isn't a good JS tokenizer at the moment
    maxCharLength = 250 * 4,
  }) {
    
    // Create an empty array to store the pieces
    const chunks = [];
  
    // Create a variable to hold the current piece
    let currentChunk = "";
  
    // Remove any newline characters from the text and split it by periods
    // This assumes that periods mark the end of sentences, which may not be true for some languages
    const sentences = text.replace(/\n/g, " ").split(/([.])/);
  
    for (const sentence of sentences) {
      // Remove any extra whitespace from the beginning and end of the sentence
      const trimmedSentence = sentence.trim();
  
      // If the sentence is empty, skip it
      if (!trimmedSentence) continue;
  
      // Check if adding the sentence to the current piece would make it too long, too short, or just right
      // This uses a tolerance range of 50% of the maximum length to allow some flexibility
      // If the piece is too long, save it and start a new one
      // If the piece is too short, add the sentence and continue
      // If the piece is just right, save it and start a new one
      const chunkLength = currentChunk.length + trimmedSentence.length + 1;
      const lowerBound = maxCharLength - maxCharLength * 0.5;
      const upperBound = maxCharLength + maxCharLength * 0.5;
  
      if (
        chunkLength >= lowerBound &&
        chunkLength <= upperBound &&
        currentChunk
      ) {
        // The piece is just right, so we save it and start a new one
        // We remove any periods or spaces from the beginning of the piece and trim any whitespace
        currentChunk = currentChunk.replace(/^[. ]+/, "").trim();
        // We only push the piece if it is not empty
        if (currentChunk) chunks.push(currentChunk);
        // Reset the current piece
        currentChunk = "";
      } else if (chunkLength > upperBound) {
        // The piece is too long, so save it and start a new one with the sentence
        // Remove any periods or spaces from the beginning of the piece and trim any whitespace
        currentChunk = currentChunk.replace(/^[. ]+/, "").trim();
        // We only push the piece if it is not empty
        if (currentChunk) chunks.push(currentChunk);
        // Set the current piece to the sentence
        currentChunk = trimmedSentence;
      } else {
        // The piece is too short, so add the sentence and continue
        // Add a space before the sentence unless it is a period
        currentChunk += `${trimmedSentence === "." ? "" : " "}${trimmedSentence}`;
      }
    }
  
    // If there is any remaining piece, save it
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  
    // Return the array of pieces
    return chunks;
}