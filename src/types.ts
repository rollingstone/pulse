export const enum StorageEnum {
  LocalStorage = 1,
  SessionStorage = 2,
  IndexDB = 3,
}
export type StorageType = StorageEnum.LocalStorage | StorageEnum.SessionStorage | StorageEnum.IndexDB;

export interface PulseGet<T> {
  get: (pulseObject: Pulse<T>) => T;
}

export interface PulseSet<T> {
  // get?: PulseGet<T>;
  set: (pulseObject: Pulse<T>, value: T) => void;
  // value: T;
}

export type PulseGetFunction<T> = ({ get }: { get: PulseGet<T> }) => T;
export type PulseSetFunction<T> = ({ get, set, newValue }: { get: (pulseObject: Pulse<T>) => T, set: (pulseObject: Pulse<T>, value: T) => void, newValue: T }) => void;

export interface Pulse<T> {
  id: number;
  key?: string;
  storageType?: StorageType;
  defaultValue?: T;
  value: T;
  opt?: PulseOptions<T>;
  get?: PulseGetFunction<T>;
  // set?: ({ get, set, newValue }) => Promise<void>;
  set?: PulseSetFunction<T>;
  reset?: () => void;  
  // conditions?: () => boolean;
}




export interface PulseOptions<T> {
  get?: PulseGet<T>;
  set?: PulseSet<T>;
}

export interface PulseParams<T> {
  defaultValue: T;
  key?: string;
  storageType?: StorageType;
  // get?: ({ get }) => Promise<T>;
  // set?: ({ get, set, newValue }) => Promise<void>;
  get?: PulseGetFunction<T>;
  set?: PulseSetFunction<T>;
  reset?: () => void;  
  opt?: PulseOptions<T>;
  conditions?: () => boolean;
}



export type PulseCallback<T> = () => void | Promise<void>;