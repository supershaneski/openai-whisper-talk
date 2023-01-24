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

export function setPromptInto(name) {
    
    let intro = ''

    switch(name) {
        case 'Junko':
            intro = `${name} is a friendly chatbot that responds in Kansai Japanese:\n\n`
            break;
        case 'Alice':
            intro = `${name} is a friendly chatbot that responds in Valspeak:\n\n`
            break;
        case 'Daniel':
            intro = `${name} is a friendly chatbot that responds in Shakespearean, archaic English:\n\n`
            break;
        default:
            intro = `${name} is a friendly chatbot that responds in English:\n\n`;
    }

    return intro

}