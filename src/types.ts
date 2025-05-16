export const enum StorageEnum {
  Local = 1,
  Session = 2,
}
export type StorageType = StorageEnum.Local | StorageEnum.Session;

export interface Pulse<T> {
  id: number;
  key?: string;
  storageType?: StorageType;
  defaultValue: T;
  value: T;
  opt?: PulseOptions<T>;
}

export interface PulseGet<T> {
    get: (pulseObject: Pulse<T>) => T | null;
} 

export interface PulseSet<T> {    
    get?: PulseGet<T>;
    set: (value: T) => void;
    value: T;
}



export interface PulseOptions<T> {
  get?: PulseGet<T>;
  set?: PulseSet<T>;
}

export interface PulseParams<T> {
  defaultValue: T;
  key?: string;
  storageType?: StorageType;
  opt?: PulseOptions<T>;
}
