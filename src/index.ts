import { useCallback, useEffect, useState, useRef } from "react";
import { filter, map, Subject } from "rxjs";
import { Pulse, PulseParams, StorageEnum } from "./types";
import {
  checkKey,
  getUniqueId,
  persistantStorageGet,
  persistantStorageSet,
} from "./utils";

const pulseObserver: Subject<Pulse<any>> = new Subject<Pulse<any>>();
pulseObserver.subscribe();

export function pulse<T>({
  defaultValue,
  key,
  storageType,
  get,
  set,
  reset,
}: PulseParams<T>): Pulse<T> {
  const storage_type = storageType ?? StorageEnum.LocalStorage;
  const pulseObject: Pulse<T> = {
    id: getUniqueId(),
    key: key,
    storageType: storage_type,
    defaultValue: defaultValue,
    value: defaultValue,
    get: get,
    set: set,
    reset: reset,
  };

  if (key) {
    checkKey(key);
    const value: T = persistantStorageGet(key, pulseObject.storageType);
    if (value !== undefined && value !== null) {
      pulseObject.value = value;
    } else {
      persistantStorageSet(key, defaultValue, pulseObject.storageType);
    }
  }

  if (get) {
    pulseObject.value = get({ get: getPulse });
  }

  pulseObserver.next(pulseObject);
  return pulseObject;
}

// const p = pulse<number>({
//   defaultValue: 10,
//   get: ({ get}) => {},
// });

export function usePulse<T>(
  pulseObject: Pulse<T>,
  callback?: () => void | Promise<void>
): [T, (value: T) => void, boolean, any] {
  const [state, setState0] = useState<T>(pulseObject?.value);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const id = pulseObject.id;
  const callbackRef = useRef(callback);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const setState = useCallback(
    (value: T) => {
      setPulse(pulseObject, value);
    },
    [pulseObject]
  );

  useEffect(() => {
    const subs = pulseObserver
      .pipe(
        filter((value: Pulse<T>) => value.id === id),
        map((value: any) => value.value)
      )
      .subscribe((value: T) => {
        pulseObject.value = value;
        setState0(value);

        const currentCallback = callbackRef.current;
        if (currentCallback) {
          if (isLoadingRef.current) {
            return;
          }

          try {
            const potentialPromise = currentCallback();

            if (
              potentialPromise &&
              typeof (potentialPromise as any).then === "function"
            ) {
              isLoadingRef.current = true;
              setIsLoading(true);
              (potentialPromise as Promise<any>)
                .then((res) => {
                  setResult(res);
                })
                .catch((err) => {
                  setResult(err);
                })
                .finally(() => {
                  isLoadingRef.current = false;
                  setIsLoading(false);
                });
            } else {
              setResult(potentialPromise);
            }
          } catch (error) {
            setResult(error);
            isLoadingRef.current = false;
            setIsLoading(false);
          }
        }
      });

    return () => {
      subs.unsubscribe();
    };
  }, [id, pulseObject]);

  return [state, setState, isLoading, result];
}

export function usePulseValue<T>(
  pulseObject: Pulse<T>,
  callback?: () => void | Promise<void>
): T {
  const [state] = usePulse(pulseObject, callback);
  return state;
}

export function usePulseSetValue<T>(
  pulseObject: Pulse<T>,
  callback?: () => void | Promise<void>
): (value: T) => void {
  const [, setState] = usePulse(pulseObject, callback);
  return setState;
}

// internal send
function setPulse$<T>(pulseObject: Pulse<T>, value: T): void {
  if (pulseObject?.key) {
    persistantStorageSet(pulseObject.key, value, pulseObject.storageType);
  }

  if (pulseObject) {
    pulseObject.value = value;
    pulseObserver.next(pulseObject);
  }
}

// send
export function setPulse<T>(pulseObject: Pulse<T>, value: T): Pulse<T> {
  if (pulseObject.set) {
    pulseObject.set({
      get: getPulse,
      set: (p: Pulse<any>, v: any) => setPulse$(p, v),
      newValue: value,
    });
  } else {
    setPulse$(pulseObject, value);
  }

  return pulseObject;
}

export function getPulse<T>(pulseObject: Pulse<T>): T {
  if (pulseObject.get) {
    return pulseObject.get({ get: getPulse });
  }

  if (pulseObject.key) {
    return persistantStorageGet(pulseObject.key, pulseObject.storageType);
  }

  return pulseObject.value;
}

export function resetPulse<T>(pulseObject: Pulse<T>): Pulse<T> {
  if (pulseObject.reset) {
    pulseObject.reset();
  } else {
    setPulse(pulseObject, pulseObject.defaultValue as T);
  }
  return pulseObject;
}
