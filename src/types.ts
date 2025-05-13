

export const enum StorageEnum {
    Local = 1,
    Session = 2,
}
export type StorageType = StorageEnum.Local | StorageEnum.Session ; 

export interface Pulse<T> {
    id: number;
    key?: string;
    storageType?: StorageType;
    value: T;
}



export interface PulseParams<T> {
    defaultValue: T;
    key?: string;
    storageType?: StorageType;
}
