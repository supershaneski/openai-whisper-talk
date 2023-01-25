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