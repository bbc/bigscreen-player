export default function getValues<Value>(obj: { [s: string]: Value }): Value[] {
    const values = []
    
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            continue
        }
        
        values.push(obj[key])
    }
    
    return values
}