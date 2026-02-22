export const enum StorageEnum {
  LocalStorage = 1,
  SessionStorage = 2,
  IndexDB = 3,
}
export type StorageType =
  | StorageEnum.LocalStorage
  | StorageEnum.SessionStorage
  | StorageEnum.IndexDB;

export interface PulseGet<T> {
  get: (pulseObject: Pulse<T>) => T;
}

export interface PulseSet<T> {
  // get?: PulseGet<T>;
  set: (pulseObject: Pulse<T>, value: T) => void;
  // value: T;
}

export type PulseGetFunction<T> = ({ get }: { get: PulseGet<T> }) => T;
export type PulseSetFunction<T> = ({
  get,
  set,
  newValue,
}: {
  get: (pulseObject: Pulse<T>) => T;
  set: (pulseObject: Pulse<T>, value: T) => void;
  newValue: T;
}) => void;

// export type getPulseType = <T>(pulseObject: Pulse<T>) => T;
// export type setPulseType = <T>(pulseObject: Pulse<T>, value: T) => Pulse<T>;

export type GetPulseFunction = <T>(pulseObject: Pulse<T>) => T;
export type SetPulseFunction = <T>(pulseObject: Pulse<T>, value: T) => void;

export type getPulseType<T> = (params: { get: GetPulseFunction }) => T;
export type setPulseType<T> = (params: {
  get: GetPulseFunction;
  set: SetPulseFunction;
  newValue: T;
}) => void;

export interface Pulse<T> {
  id: number;
  key?: string;
  storageType?: StorageType;
  defaultValue?: T;
  value: T;
  get?: getPulseType<T>;
  set?: setPulseType<T>;
  reset?: () => void;
}

export interface PulseParams<T> {
  defaultValue: T;
  key?: string;
  storageType?: StorageType;
  get?: getPulseType<T>;
  set?: setPulseType<T>;
  reset?: () => void;
}

export type PulseCallback<T> = () => void | Promise<void>;
