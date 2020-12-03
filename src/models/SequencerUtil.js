
var _ = require('lodash');

export const uuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const NOTE_OPTIONS = [ 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', ];
export const getRandomNote = () => NOTE_OPTIONS[Math.floor(Math.random() * NOTE_OPTIONS.length)];

export function propertiesPathToArray(obj) {
  console.log('obj', obj)
  const isObject = val =>
  typeof val === 'object' && !Array.isArray(val) && val !== null;
  
  const addDelimiter = (a, b) =>
  a ? `${a}.${b}` : b;
  
  const paths = (obj = {}, head = '') => {
    return Object.entries(obj)
        .reduce((product, [key, value]) => 
            {
                let fullPath = addDelimiter(head, key)
                return isObject(value) ?
                    product.concat(paths(value, fullPath))
                : product.concat(fullPath)
            }, []);
  }

  return paths(obj);
}