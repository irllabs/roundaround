// Pure helpers with no imports, so they can be used from anywhere (including the audio engine)
// without creating import cycles.
import { Colors } from './constants'

export const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min)) + min;
}

export const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const numberRange = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

export const randomBool = (probability = 0.5) => {
    return Math.random() < probability
}

export const randomItem = (items) => {
    return items[Math.floor(Math.random() * items.length)]
}

export const getRandomColor = () => {
    return randomItem(Colors)
}

/** Moves an array element in place. */
export const arraymove = (arr, fromIndex, toIndex) => {
    const element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
    return arr
}
