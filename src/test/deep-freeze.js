/**
 * Recursively freezes `value` and everything reachable from it, so that code which writes to it
 * throws a TypeError instead of quietly succeeding. Tests use it on reducer input: a reducer that
 * mutates the state it was handed fails loudly rather than passing by accident.
 */
export function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) {
        return value
    }
    seen.add(value)
    Object.freeze(value)
    for (const key of Object.getOwnPropertyNames(value)) {
        deepFreeze(value[key], seen)
    }
    return value
}
