export const enum StorageEnum {
  LocalStorage = 1,
  SessionStorage = 2,
}
export type StorageType = StorageEnum.LocalStorage | StorageEnum.SessionStorage;

export interface Pulse<T> {
  id: number;
  key?: string;
  storageType?: StorageType;
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
  get?: ({ get }) => Promise<T>;
  set?: ({ get, set, newValue }) => Promise<void>;
  reset?: () => Promise<void>;  
}

