import { StorageEnum, StorageType } from "./types";



export function getRandomInt(max) {
  return Math.floor(Math.random() * max) *1000;
}


export const getUniqueId = () => {
    return new Date().getTime() + getRandomInt(1000);
}

const keyCache: { [key: string]: any } = {};

export const checkKey = (key: string) => {
    if(!key) {
        return true;
    }
    if (keyCache[key]) {
        const msg = `Key: ${key} already used by another pulse state`;
        console.error(msg);
        throw new Error(msg);        
    } else {
        keyCache[key] = true;
        return true;
    }
}


export function persistantStorageSet<T>(key: string, value: T, storageType: StorageType = StorageEnum.Local): void {
    if (storageType === StorageEnum.Session) {
        sessionStorage.setItem(key, JSON.stringify(value));
    } else if (storageType === StorageEnum.Local) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

export function persistantStorageGet<T>(key: string, storageType: StorageType = StorageEnum.Local): T | null {
    let value: string | null = null;
    if (storageType === StorageEnum.Session) {
        value = sessionStorage.getItem(key);
    } else if (storageType === StorageEnum.Local) {
        value = localStorage.getItem(key);
    }

    const result: T | null = value ? JSON.parse(value) : null;
    return result;
}