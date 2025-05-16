import { StorageEnum, StorageType } from "./types";

const keyCache: { [key: string]: any } = {};
const pulseObjectCache: { [key: string]: any } = {};

export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max) * 1000;
}

export function getUniqueId() {
  return new Date().getTime() + getRandomInt(1000);
}

export function registerPulseObject(pulseObject: any) {
  if (pulseObjectCache[pulseObject.id]) {
    const msg = `Pulse object with id: ${pulseObject.id} already registered`;
    console.error(msg);
    throw new Error(msg);
  } else {
    pulseObjectCache[pulseObject.id] = pulseObject;
  }
}

export function unregisterPulseObject(pulseObject: any) {
  if (pulseObjectCache[pulseObject.id]) {
    delete pulseObjectCache[pulseObject.id];
  } else {
    const msg = `Pulse object with id: ${pulseObject.id} not registered`;
    console.error(msg);
    throw new Error(msg);
  }
}

export function resetPulseObject(pulseObject: any) {
  if (pulseObjectCache[pulseObject.id]) {
    pulseObjectCache[pulseObject.id].value = pulseObject.defaultValue;
  } else {
    const msg = `Pulse object with id: ${pulseObject.id} not registered`;
    console.error(msg);
    throw new Error(msg);
  }
}

export function resetAllPulseObjects() {
  Object.keys(pulseObjectCache).forEach((key) => {
    const pulseObject = pulseObjectCache[key];
    if (pulseObject) {
      pulseObject.value = pulseObject.defaultValue;
    }
  });
}

export function checkKey(key: string) {
  if (!key) {
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

export function persistantStorageSet<T>(
  key: string,
  value: T,
  storageType: StorageType = StorageEnum.Local
): void {
  if (storageType === StorageEnum.Session) {
    sessionStorage.setItem(key, JSON.stringify(value));
  } else if (storageType === StorageEnum.Local) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export function persistantStorageGet<T>(
  key: string,
  storageType: StorageType = StorageEnum.Local
): T | null {
  let value: string | null = null;
  if (storageType === StorageEnum.Session) {
    value = sessionStorage.getItem(key);
  } else if (storageType === StorageEnum.Local) {
    value = localStorage.getItem(key);
  }

  const result: T | null = value ? JSON.parse(value) : null;
  return result;
}
