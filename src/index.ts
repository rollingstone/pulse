import { useCallback, useEffect, useState } from "react";
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
): [T, (value: T) => void, boolean] {
  const [state, setState0] = useState<T>(pulseObject?.value);
  const [isLoading, setIsLoading] = useState(false);
  // const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<any>(null);

  const id = pulseObject.id;

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
        // observeOn(asyncScheduler)
      )
      .subscribe((value: T) => {
        pulseObject.value = value;
        setState0(value);

        if (callback) {
          if (isLoading) {
            return;
          }

          if (callback.constructor.name === "AsyncFunction") {
            setIsLoading(true);
            callback()
              ?.then((result: any) => {
                setResult(result);
                setIsLoading(false);
              })
              .catch((error: any) => {
                // console.error(error);
                setResult(null);
                setIsLoading(false);
              })
            return;
          }

          try {
            setIsLoading(true);
            const _result = callback();
            setResult(_result);
          } catch (error) {
            console.error(error);
            setResult(null);
          } finally {
            setIsLoading(false);
          }
        }
      });

    return () => {
      subs.unsubscribe();
    };
  }, [id]);

  return [state, setState, isLoading];
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
