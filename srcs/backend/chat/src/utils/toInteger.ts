export function toInteger(value: string): number {
    const result = parseInt(value, 10);
    if (isNaN(result)) {
        throw new Error(`Invalid number: ${value}`);
    }
    return result;
}
