import React, {useRef, useEffect} from 'react'
export const disableSpellCheck = (target) => {
    target.spellcheck = false;
    target.focus();
    target.blur();
}

// for useEffect
export const initiateElementWatch = (element, initialText, callback) => {
    if (!element.current) return;

    element.current.textContent = initialText;
    disableSpellCheck(element.current);

    const onKeyDown = event => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (callback) {
                callback(element.current.textContent);
            }
            element.current.blur();
        }
        if (event.key === "Escape") {
            element.current.textContent = initialText;
            element.current.blur();
        }
    };
    const onBlur = (event) => {
        if (callback && event.relatedTarget) {
            callback(element.current.textContent);
        }
    }

    element.current.addEventListener("keydown", onKeyDown);
    element.current.addEventListener("blur", onBlur);
    return { "keydown": onKeyDown, "bluer": onBlur };
}

export const watchCleanup = (element, watchFunctions) => {
    return () => {
        if (!element.current || !watchFunctions) return;

        Object.entries(watchFunctions).map(([event, func]) => {
            element.current.removeEventListener(event, func);
        })
    }
};


export function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

export function shallowEqual(objA, objB) {
    const hasOwnProperty = Object.prototype.hasOwnProperty;

    if (Object.is(objA, objB)) {
        return true;
    }

    if (
        typeof objA !== 'object' ||
        objA === null ||
        typeof objB !== 'object' ||
        objB === null
    ) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
        return false;
    }

    // Test for A's keys different from B.
    for (let i = 0; i < keysA.length; i++) {
        if (
            !hasOwnProperty.call(objB, keysA[i]) ||
            !Object.is(objA[keysA[i]], objB[keysA[i]])
        ) {
            console.log(objA[keysA[i]], objB[keysA[i]])
            return false;
        }
    }

    return true;
}