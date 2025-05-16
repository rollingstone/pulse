import { useCallback, useEffect, useState } from 'react';
import { filter, map, Observable, Subject } from 'rxjs';
import { Pulse, PulseParams, StorageEnum } from './types';
import { checkKey, getUniqueId, persistantStorageGet, persistantStorageSet } from './utils';

const pulseObserver: Subject<Pulse<any>> = new Subject<Pulse<any>>();
pulseObserver.subscribe()

export function pulse<T>({ defaultValue, key, storageType }: PulseParams<T>): Pulse<T> {
    const storage_type = storageType ?? StorageEnum.Local;
    const pulseObject: Pulse<T> = {
        id: getUniqueId(),
        key: key,
        storageType: storage_type,
        defaultValue: defaultValue,
        value: defaultValue,        
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

export function usePulse<T>(pulseObject: Pulse<T>, callback?: () => void | Promise<void>): [T, (value: T) => void, T, boolean, boolean] {
    const [state, setState0] = useState<T>(pulseObject.defaultValue);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [result, setResult] = useState<any>(null);

    const id = pulseObject.id;

    const setState = useCallback((value: T) => {
        setPulseValue(pulseObject, value);        
    }, [id])


    useEffect(() => {
        const subs = pulseObserver.pipe(
            filter((value: Pulse<T>) => value.id === id),
            map((value: any) => value.value),
            // observeOn(asyncScheduler)
        ).subscribe((value: T) => {
            pulseObject.value = value;
            setState0(value);
            
            if (callback) {
                if (isProcessing) {
                    return;
                }
                setIsFinished(false);
                if (callback.constructor.name === "AsyncFunction") {                    
                    setIsProcessing(true);
                    callback()?.then((result: any) => {
                        setResult(result);
                    }).catch((error: any) => {
                        // console.error(error);
                        setResult(null);
                    }
                    ).finally(() => {
                        setIsProcessing(false);
                        setIsFinished(true);
                    });
                }
                else {
                    try {
                        setIsProcessing(true);
                        const _result = callback();
                        setResult(_result);                        
                    } catch (error) {
                        console.error(error);
                        setResult(null);
                    }finally {
                        setIsProcessing(false);
                        setIsFinished(true);
                    }
                }
            }
        });

        return () => {
            subs.unsubscribe();
        };
    }, [id]);


    return [state, setState, result, isProcessing, isFinished];
}


export function usePulseValue<T>(pulseObject: Pulse<T>, callback?: () => void | Promise<void>): T {
    const [state] = usePulse(pulseObject, callback);
    return state;
}

export function usePulseSetValue<T>(pulseObject: Pulse<T>, callback?: () => void | Promise<void>): (value: T) => void {
    const [, setState] = usePulse(pulseObject, callback);
    return setState;
}

// send
export function setPulseValue<T>(pulseObject: Pulse<T>, value: T): Pulse<T> {
    if (pulseObject.key) {
        persistantStorageSet(pulseObject.key, value, pulseObject.storageType);
    }
    pulseObserver.next({
        id: pulseObject.id,
        key: pulseObject.key,
        storageType: pulseObject.storageType,
        defaultValue: pulseObject.defaultValue,
        value: value
    });
    
    return pulseObject;
}

export function getPulseValue<T>(pulseObject: Pulse<T>): T | null {
    if (pulseObject.key) {
        return persistantStorageGet(pulseObject.key, pulseObject.storageType);
    }
    return pulseObject.value
}