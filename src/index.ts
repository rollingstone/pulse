import { useCallback, useEffect, useState } from 'react';
import { filter, map, Subject } from 'rxjs';
import { Pulse, PulseParams, StorageEnum } from './types';
import { checkKey, getUniqueId, persistantStorageGet, persistantStorageSet } from './utils';

const pulseObserver: Subject<Pulse<any>> = new Subject<Pulse<any>>();
pulseObserver.subscribe()

export function pulse<T>({defaultValue, key, storageType}: PulseParams<T>): Pulse<T> {
    const storage_type = storageType ?? StorageEnum.Local;
    const pulseObject: Pulse<T> = {
        id: getUniqueId(),
        key: key,
        storageType: storage_type,
        value: defaultValue
    }

    if (key) {
        checkKey(key);
        const value: T | null = persistantStorageGet(key, pulseObject.storageType);
        if (value) {
            pulseObject.value = value;
        } else {
            persistantStorageSet(key, defaultValue, pulseObject.storageType);
        }
    }

    pulseObserver.next(pulseObject);
    return pulseObject;
}

export function usePulse<T>(pulseObject: Pulse<T>): [T, (value: T) => void] {
    const [state, setState0] = useState<T>(pulseObject.value);

    const id = pulseObject.id;

    const setState = useCallback((value: T) => {

        if (pulseObject.key) {
            persistantStorageSet(pulseObject.key, value, pulseObject.storageType);
        }

        pulseObserver.next({
            id: id,
            key: pulseObject.key,
            storageType: pulseObject.storageType,
            value: value
        });
    }, [id])


    useEffect(() => {
        const subs = pulseObserver.pipe(
            filter((value: Pulse<T>) => value.id === id),
            map((value: any) => value.value),
            // observeOn(asyncScheduler)
        ).subscribe((value: T) => {
            setState0(value);
        });

        return () => {
            subs.unsubscribe();
        };
    }, [id]);


    return [state, setState];
}

export function usePulseValue<T>(pulseObject: Pulse<T>): T {
    const [state] = usePulse(pulseObject);
    return state;
}

export function usePulseSetValue<T>(pulseObject: Pulse<T>): (value: T) => void {
    const [, setState] = usePulse(pulseObject);
    return setState;
}


