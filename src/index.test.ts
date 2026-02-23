import * as RTL from '@testing-library/react';
const { act, renderHook, waitFor } = RTL as any;
import { beforeEach, describe, expect, it, jest } from '@jest/globals'; 

// Mock variables MUST start with 'mock' to be used in jest.mock
const mockSubjectNext = jest.fn();
const mockSubjectUnsubscribe = jest.fn();
const mockSubjectSubscribe = jest.fn((...args: any[]) => ({ unsubscribe: mockSubjectUnsubscribe }));
const mockSubjectPipe = jest.fn(() => ({
  subscribe: mockSubjectSubscribe,
}));

jest.mock('rxjs', () => {
  const originalRxjs = jest.requireActual('rxjs') as any;
  return {
    ...originalRxjs,
    Subject: jest.fn().mockImplementation(() => ({
      next: mockSubjectNext,
      subscribe: mockSubjectSubscribe,
      pipe: mockSubjectPipe,
      asObservable: () => ({
        pipe: mockSubjectPipe,
        subscribe: mockSubjectSubscribe,
      }),
    })),
  };
});

// Mock the entire utils module
jest.mock('./utils', () => ({
  getRandomInt: jest.fn(),
  getUniqueId: jest.fn(),
  checkKey: jest.fn(),
  persistantStorageGet: jest.fn(),
  persistantStorageSet: jest.fn(),
}));

import { pulse, usePulse, usePulseValue, usePulseSetValue, setPulse, getPulse, resetPulse } from './index';
import { Pulse, StorageEnum, PulseParams } from './types';
import * as utils from './utils';



describe('Pulse Library', () => {
  // Typed mocks for convenience
  let mockGetUniqueId: jest.MockedFunction<typeof utils.getUniqueId>;
  let mockCheckKey: jest.MockedFunction<typeof utils.checkKey>;
  let mockPersistantStorageGet: jest.MockedFunction<typeof utils.persistantStorageGet>;
  let mockPersistantStorageSet: jest.MockedFunction<typeof utils.persistantStorageSet>;

  beforeEach(() => {
    // Assign mocked functions to typed variables
    mockGetUniqueId = utils.getUniqueId as jest.MockedFunction<typeof utils.getUniqueId>;
    mockCheckKey = utils.checkKey as jest.MockedFunction<typeof utils.checkKey>;
    mockPersistantStorageGet = utils.persistantStorageGet as jest.MockedFunction<typeof utils.persistantStorageGet>;
    mockPersistantStorageSet = utils.persistantStorageSet as jest.MockedFunction<typeof utils.persistantStorageSet>;

    // Reset all mocks before each test
    mockGetUniqueId.mockReset();
    mockCheckKey.mockReset();
    mockPersistantStorageGet.mockReset();
    mockPersistantStorageSet.mockReset();
    
    mockSubjectNext.mockReset();
    mockSubjectSubscribe.mockReset();
    mockSubjectPipe.mockReset();
    mockSubjectUnsubscribe.mockReset();
    
    // Default mock implementations
    mockGetUniqueId.mockReturnValue(1234567890000); // Consistent ID for tests
    mockCheckKey.mockReturnValue(true); // Assume key is always valid for these tests
    mockPersistantStorageGet.mockReturnValue(null); // Default to no stored value

    // Default behavior for pipe().subscribe() used in usePulse
    // The subscribe method of the object returned by pipe()
    mockSubjectPipe.mockReturnValue({ subscribe: mockSubjectSubscribe });
    // The subscribe method itself (called by pipe().subscribe() or directly)
    mockSubjectSubscribe.mockReturnValue({ unsubscribe: mockSubjectUnsubscribe });
  });

  describe('pulse()', () => {
    it('should create a pulse object with default values', () => {
      mockGetUniqueId.mockReturnValueOnce(1111111110000);
      const params: PulseParams<string> = { defaultValue: 'test' };
      const result = pulse(params);

      expect(mockGetUniqueId).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(1111111110000);
      expect(result.value).toBe('test');
      expect(result.key).toBeUndefined();
      expect(result.storageType).toBe(StorageEnum.LocalStorage);
      expect(mockCheckKey).not.toHaveBeenCalled();
      expect(mockPersistantStorageGet).not.toHaveBeenCalled();
      expect(mockPersistantStorageSet).not.toHaveBeenCalled();
      expect(mockSubjectNext).toHaveBeenCalledWith(result);
    });

    it('should create a pulse object with a key and no stored value', () => {
      mockGetUniqueId.mockReturnValueOnce(2222222220000);
      const params: PulseParams<number> = { defaultValue: 100, key: 'myKey' };
      const result = pulse(params);

      expect(mockGetUniqueId).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(2222222220000);
      expect(result.value).toBe(100);
      expect(result.key).toBe('myKey');
      expect(result.storageType).toBe(StorageEnum.LocalStorage);
      expect(mockCheckKey).toHaveBeenCalledWith('myKey');
      expect(mockPersistantStorageGet).toHaveBeenCalledWith('myKey', StorageEnum.LocalStorage);
      expect(mockPersistantStorageSet).toHaveBeenCalledWith('myKey', 100, StorageEnum.LocalStorage);
      expect(mockSubjectNext).toHaveBeenCalledWith(result);
    });

    it('should create a pulse object with a key and a stored value', () => {
      mockGetUniqueId.mockReturnValueOnce(3333333330000);
      mockPersistantStorageGet.mockReturnValueOnce('storedValue');
      const params: PulseParams<string> = { defaultValue: 'default', key: 'myKeyStored' };
      const result = pulse(params);

      expect(result.id).toBe(3333333330000);
      expect(result.value).toBe('storedValue'); // Value should be from storage
      expect(result.key).toBe('myKeyStored');
      expect(mockCheckKey).toHaveBeenCalledWith('myKeyStored');
      expect(mockPersistantStorageGet).toHaveBeenCalledWith('myKeyStored', StorageEnum.LocalStorage);
      expect(mockPersistantStorageSet).not.toHaveBeenCalled();
      expect(mockSubjectNext).toHaveBeenCalledWith(expect.objectContaining({ value: 'storedValue', id: 3333333330000 }));
    });

    it('should use specified storageType', () => {
      mockGetUniqueId.mockReturnValueOnce(4444444440000);
      const params: PulseParams<boolean> = {
        defaultValue: true,
        key: 'sessionKey',
        storageType: StorageEnum.SessionStorage,
      };
      const result = pulse(params);

      expect(result.id).toBe(4444444440000);
      expect(result.storageType).toBe(StorageEnum.SessionStorage);
      expect(mockPersistantStorageGet).toHaveBeenCalledWith('sessionKey', StorageEnum.SessionStorage);
      expect(mockPersistantStorageSet).toHaveBeenCalledWith('sessionKey', true, StorageEnum.SessionStorage);
      expect(mockSubjectNext).toHaveBeenCalledWith(result);
    });

    it('should initialize value using get if provided', () => {
      const mockGet = jest.fn(({ get }) => 42);
      const result = pulse({ defaultValue: 0, get: mockGet });

      expect(result.value).toBe(42);
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('usePulse()', () => {
    let testPulseObject: Pulse<string>;

    beforeEach(() => {
      // Create a fresh pulse object for each test to avoid interference
      mockGetUniqueId.mockReturnValue(5555555550000);
      testPulseObject = pulse({ defaultValue: 'initial' });
      // Clear mocks that might have been called during pulse() creation if they interfere with assertions
      mockSubjectNext.mockClear(); 
      mockPersistantStorageSet.mockClear();
    });

    it('should return initial state and setState function', () => {
      const { result } = renderHook(() => usePulse(testPulseObject));
      const [state, setStateFn, isLoading] = result.current;

      expect(state).toBe('initial');
      expect(typeof setStateFn).toBe('function');
      expect(isLoading).toBe(false);
      expect(mockSubjectPipe).toHaveBeenCalledTimes(1); // From useEffect
      expect(mockSubjectSubscribe).toHaveBeenCalledTimes(1); // From pipe().subscribe() in useEffect
    });

    it('setState should update state via observer and call persistantStorageSet if key exists', () => {
      mockGetUniqueId.mockReturnValue(5556667770000);
      const keyedPulseObject = pulse({ defaultValue: 'keyed', key: 'persistKey' });
      mockSubjectNext.mockClear(); // Clear calls from pulse()
      mockPersistantStorageSet.mockClear();

      const { result } = renderHook(() => usePulse(keyedPulseObject));
      
      act(() => {
        result.current[1]('updatedValue'); // Call setState
      });

      expect(mockPersistantStorageSet).toHaveBeenCalledWith('persistKey', 'updatedValue', keyedPulseObject.storageType);
      expect(mockSubjectNext).toHaveBeenCalledWith(expect.objectContaining({
        id: keyedPulseObject.id,
        key: 'persistKey',
        value: 'updatedValue',
      }));
    });
    
    it('setState should update state via observer and not call persistantStorageSet if no key', () => {
        const { result } = renderHook(() => usePulse(testPulseObject)); // testPulseObject has no key
        mockPersistantStorageSet.mockClear();
        mockSubjectNext.mockClear();

        act(() => {
            result.current[1]('newValueNoKey');
        });
        expect(mockPersistantStorageSet).not.toHaveBeenCalled();
        expect(mockSubjectNext).toHaveBeenCalledWith(expect.objectContaining({
            id: testPulseObject.id,
            value: 'newValueNoKey'
        }));
    });

    it('should update state when pulseObserver emits a new value for the same id', () => {
      let subscriptionCallback: ((mappedValue: string) => void) | null = null;
      // This mock is for the subscribe call inside useEffect
      mockSubjectSubscribe.mockImplementationOnce((cb: any) => {
        subscriptionCallback = typeof cb === 'function' ? cb : cb.next;
        return { unsubscribe: mockSubjectUnsubscribe };
      });
      
      const { result } = renderHook(() => usePulse(testPulseObject));
      expect(result.current[0]).toBe('initial');

      act(() => {
        if (subscriptionCallback) {
          // Simulate the observer emitting the *mapped* value (after filter and map)
          subscriptionCallback('externallyUpdated');
        }
      });
      
      expect(result.current[0]).toBe('externallyUpdated');
    });

    it('should execute synchronous callback and update processing/finished states', () => {
        const mockCb = jest.fn(() => {});
        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        mockSubjectSubscribe.mockImplementationOnce((cb: any) => {
            subscriptionCallback = typeof cb === 'function' ? cb : cb.next;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result } = renderHook(() => usePulse(testPulseObject, mockCb));

        act(() => {
            if (subscriptionCallback) {
                (subscriptionCallback as any)('triggerCallback'); // Mapped value
            }
        });
        
        expect(mockCb).toHaveBeenCalledTimes(1);
        expect(result.current[2]).toBe(false); // isLoading false after sync
    });

    it('should handle synchronous callback error and update processing/finished states', () => {
        const error = new Error('Sync Error');
        const mockSyncErrorCb = jest.fn(() => { throw error; });
        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        mockSubjectSubscribe.mockImplementationOnce((cb: any) => {
            subscriptionCallback = typeof cb === 'function' ? cb : cb.next;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result } = renderHook(() => usePulse(testPulseObject, mockSyncErrorCb));

        act(() => {
            if (subscriptionCallback) {
                (subscriptionCallback as any)('triggerSyncError');
            }
        });
        
        expect(mockSyncErrorCb).toHaveBeenCalledTimes(1);
        expect(result.current[2]).toBe(false); 
        expect(result.current[3]).toBe(error); // Error captured in result (4th element)
    });

    it('should execute asynchronous callback and update processing/finished states', async () => {
        const mockAsyncCb = jest.fn(() => Promise.resolve());
        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        mockSubjectSubscribe.mockImplementationOnce((cb: any) => {
            subscriptionCallback = typeof cb === 'function' ? cb : cb.next;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result } = renderHook(() => usePulse(testPulseObject, mockAsyncCb));

        act(() => {
            if (subscriptionCallback) {
                (subscriptionCallback as any)('triggerAsyncCallback');
            }
        });

        expect(result.current[2]).toBe(true); // isLoading should be true immediately
        expect(mockAsyncCb).toHaveBeenCalledTimes(1);
        
        await waitFor(() => expect(result.current[2]).toBe(false)); 
    });
    
    it('should handle asynchronous callback rejection', async () => {
        const error = new Error('Async Error');
        const mockAsyncRejectCb = jest.fn(() => Promise.reject(error));
        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        mockSubjectSubscribe.mockImplementationOnce((cb: any) => {
            subscriptionCallback = typeof cb === 'function' ? cb : cb.next;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result } = renderHook(() => usePulse(testPulseObject, mockAsyncRejectCb));

        act(() => {
            if (subscriptionCallback) {
                (subscriptionCallback as any)('triggerAsyncReject');
            }
        });

        expect(result.current[2]).toBe(true); 
        expect(mockAsyncRejectCb).toHaveBeenCalledTimes(1);

        await waitFor(() => expect(result.current[2]).toBe(false)); 
        expect(result.current[3]).toBe(error); // Error captured in result
    });

    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => usePulse(testPulseObject));
      unmount();
      expect(mockSubjectUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should not execute callback if already processing', async () => {
        const promiseResolvers: Array<() => void> = [];
        const longAsyncCb = jest.fn(() => {
            return new Promise<void>(resolve => {
                promiseResolvers.push(resolve); // Store resolver to call later
            });
        });

        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        // Ensure this mock is active for this test's renderHook
        mockSubjectSubscribe.mockImplementation((cb: any) => {
            subscriptionCallback = typeof cb === 'function' ? cb : cb.next;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result } = renderHook(() => usePulse(testPulseObject, longAsyncCb));

        // Trigger first event
        act(() => {
            if (subscriptionCallback) (subscriptionCallback as any)('event1');
        });

        await waitFor(() => expect(result.current[2]).toBe(true)); // Wait for isLoading to become true
        expect(longAsyncCb).toHaveBeenCalledTimes(1);

        // Trigger second event while first is still "processing"
        act(() => {
            if (subscriptionCallback) subscriptionCallback('event2');
        });

        // Callback should NOT be called again due to isLoading guard
        expect(longAsyncCb).toHaveBeenCalledTimes(1); 
        expect(result.current[2]).toBe(true); // Still processing the first one

        // Resolve the first callback's promise
        act(() => {
            if(promiseResolvers.length > 0) promiseResolvers[0]();
        });
        
        await waitFor(() => expect(result.current[2]).toBe(false)); // Wait for isLoading to become false
    });
  });

  describe('usePulseValue()', () => {
    it('should return the current value of the pulse and update with observer', () => {
      mockGetUniqueId.mockReturnValue(6666666660000);
      const po = pulse({ defaultValue: 'valueOnly' });
      mockSubjectNext.mockClear();

      let subscriptionCbForUsePulse: ((mappedValue: string) => void) | null = null;
      mockSubjectSubscribe.mockImplementation((cb: any) => { // Catches subscribe from usePulse inside usePulseValue
        subscriptionCbForUsePulse = typeof cb === 'function' ? cb : cb.next;
        return { unsubscribe: mockSubjectUnsubscribe };
      });

      const { result } = renderHook(() => usePulseValue(po));
      expect(result.current).toBe('valueOnly');

      act(() => {
        if (subscriptionCbForUsePulse) {
          (subscriptionCbForUsePulse as any)('updatedViaObserver');
        }
      });
      expect(result.current).toBe('updatedViaObserver');
    });
  });

  describe('usePulseSetValue()', () => {
    it('should return the setState function for the pulse', () => {
      mockGetUniqueId.mockReturnValue(7777777770000);
      const po = pulse({ defaultValue: 'setValueTest' });
      mockSubjectNext.mockClear(); 

      const { result } = renderHook(() => usePulseSetValue(po));
      const setStateFn = result.current;

      expect(typeof setStateFn).toBe('function');
      
      act(() => {
        setStateFn('newSetValueViaHook');
      });

      expect(mockSubjectNext).toHaveBeenCalledWith(expect.objectContaining({
        id: po.id,
        value: 'newSetValueViaHook',
      }));
      // Also check persistantStorageSet if key existed on 'po'
      // For this po (no key), persistantStorageSet should not be called by the hook's setState
      expect(mockPersistantStorageSet).not.toHaveBeenCalled();
    });
  });

  describe('setPulse()', () => {
    it('should update persistent storage if key exists and notify observer', () => {
      const testPO: Pulse<string> = {
        id: 123000, key: 'setKeyExt', storageType: StorageEnum.LocalStorage, value: 'oldVal',
      };
      mockPersistantStorageSet.mockClear();
      mockSubjectNext.mockClear();

      const returnedPulse = setPulse(testPO, 'newValExt');

      expect(mockPersistantStorageSet).toHaveBeenCalledWith('setKeyExt', 'newValExt', StorageEnum.LocalStorage);
      expect(mockSubjectNext).toHaveBeenCalledWith(testPO);
      expect(returnedPulse).toBe(testPO); 
      expect(testPO.value).toBe('newValExt');
    });

    it('should not update persistent storage if no key and notify observer', () => {
      const testPO: Pulse<number> = {
        id: 456000, storageType: StorageEnum.SessionStorage, value: 10,
      };
      mockPersistantStorageSet.mockClear();
      mockSubjectNext.mockClear();

      setPulse(testPO, 20);

      expect(mockPersistantStorageSet).not.toHaveBeenCalled();
      expect(mockSubjectNext).toHaveBeenCalledWith(testPO);
      expect(testPO.value).toBe(20);
    });

    it('should use custom set function if provided', () => {
      const mockSet = jest.fn();
      const testPO: Pulse<number> = {
        id: 777,
        value: 10,
        set: mockSet,
      };

      setPulse(testPO, 20);

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        newValue: 20,
      }));
    });
  });

  describe('getPulse()', () => {
    it('should return value from persistent storage if key exists', () => {
      const testPO: Pulse<string> = {
        id: 789000, key: 'getKeyExt', storageType: StorageEnum.LocalStorage, value: 'initialVal',
      };
      mockPersistantStorageGet.mockReturnValueOnce('storedValueForKeyExt');

      const value = getPulse(testPO);

      expect(mockPersistantStorageGet).toHaveBeenCalledWith('getKeyExt', StorageEnum.LocalStorage); 
      expect(value).toBe('storedValueForKeyExt');
    });
    
    it('should return value from persistent storage using pulse storageType if key exists', () => {
      const testPO: Pulse<string> = {
        id: 789001, key: 'getKeyExtSession', storageType: StorageEnum.SessionStorage, value: 'initialVal',
      };
      mockPersistantStorageGet.mockReturnValueOnce('storedSessionValue');

      const value = getPulse(testPO);
      expect(mockPersistantStorageGet).toHaveBeenCalledWith('getKeyExtSession', StorageEnum.SessionStorage);
      expect(value).toBe('storedSessionValue');
    });


    it('should return pulse object value if no key exists', () => {
      const testPO: Pulse<boolean> = {
        id: 101000, storageType: StorageEnum.LocalStorage, value: true,
      };
      mockPersistantStorageGet.mockClear();

      const value = getPulse(testPO);

      expect(mockPersistantStorageGet).not.toHaveBeenCalled();
      expect(value).toBe(true);
    });

    it('should use custom get function if provided', () => {
      const mockGet = jest.fn(() => 'customStoredValue');
      const testPO: Pulse<string> = {
        id: 888,
        value: 'initial',
        get: mockGet,
      };

      const value = getPulse(testPO);

      expect(value).toBe('customStoredValue');
      expect(mockGet).toHaveBeenCalled();
    });

     it('should return null from persistent storage if key exists but value is null', () => {
      const testPO: Pulse<string | null> = {
        id: 789002, key: 'getKeyNullExt', storageType: StorageEnum.LocalStorage, value: 'initialNonNull',
      };
      mockPersistantStorageGet.mockReturnValueOnce(null);

      const value = getPulse(testPO);

      expect(mockPersistantStorageGet).toHaveBeenCalledWith('getKeyNullExt', StorageEnum.LocalStorage);
      expect(value).toBeNull();
    });
  });

  describe('resetPulse()', () => {
    it('should reset to default value if no custom reset is provided', () => {
      const testPO = pulse({ defaultValue: 'initial', key: 'resetKey' });
      setPulse(testPO, 'changed');
      mockSubjectNext.mockClear();
      mockPersistantStorageSet.mockClear();

      resetPulse(testPO);

      expect(testPO.value).toBe('initial');
      expect(mockPersistantStorageSet).toHaveBeenCalledWith('resetKey', 'initial', StorageEnum.LocalStorage);
      expect(mockSubjectNext).toHaveBeenCalledWith(testPO);
    });

    it('should call custom reset if provided', () => {
      const mockReset = jest.fn();
      const testPO = pulse({ defaultValue: 10, reset: mockReset });

      resetPulse(testPO);

      expect(mockReset).toHaveBeenCalled();
    });
  });
});
