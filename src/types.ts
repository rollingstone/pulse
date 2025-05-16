import { pulse } from ".";

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
}

export type PulseGet<T> = (pulseObject: Pulse<T>) => T | null;
export type PulseSet<T> = (get: Pulse<T>, set: (pulseObject: Pulse<T>, value: T) => void,  value: T) => void;

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
