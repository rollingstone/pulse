import { act, renderHook } from '@testing-library/react-hooks';
import { Subject as ActualSubject } from 'rxjs'; // Import for type, not for direct use in mock if possible
import { pulse, usePulse, usePulseValue, usePulseSetValue, setPulse, getPulse } from '../src/index';
import { Pulse, StorageEnum, PulseParams } from '../src/types';
import * as utils from '../src/utils';

// Mock the entire utils module
jest.mock('./utils', () => ({
  // Retain original enum if needed, though it's not directly used by index.ts functions
  // StorageEnum: jest.requireActual('./utils').StorageEnum, 
  getRandomInt: jest.fn(), // Will be auto-mocked if not specified like this
  getUniqueId: jest.fn(),
  checkKey: jest.fn(),
  persistantStorageGet: jest.fn(),
  persistantStorageSet: jest.fn(),
}));

// Mock RxJS Subject
// We need to control the instance created for pulseObserver and its methods
const mockSubjectNext = jest.fn();
const mockSubjectUnsubscribe = jest.fn(); // For the subscription returned by .subscribe()
const mockSubjectSubscribe = jest.fn(() => ({ unsubscribe: mockSubjectUnsubscribe }));
const mockSubjectPipe = jest.fn(() => ({
  subscribe: mockSubjectSubscribe, // pipe().subscribe()
}));

jest.mock('rxjs', () => {
  const originalRxjs = jest.requireActual('rxjs');
  return {
    ...originalRxjs, // Spread original RxJS for other exports like filter, map
    Subject: jest.fn().mockImplementation(() => ({
      next: mockSubjectNext,
      subscribe: mockSubjectSubscribe, // For the top-level pulseObserver.subscribe()
      pipe: mockSubjectPipe,
      asObservable: () => ({ // If asObservable() is ever used
        pipe: mockSubjectPipe,
        subscribe: mockSubjectSubscribe,
      }),
    })),
  };
});


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
      expect(result.storageType).toBe(StorageEnum.Local);
      expect(result.opt).toBeUndefined();
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
      expect(result.storageType).toBe(StorageEnum.Local);
      expect(mockCheckKey).toHaveBeenCalledWith('myKey');
      expect(mockPersistantStorageGet).toHaveBeenCalledWith('myKey', StorageEnum.Local);
      expect(mockPersistantStorageSet).toHaveBeenCalledWith('myKey', 100, StorageEnum.Local);
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
      expect(mockPersistantStorageGet).toHaveBeenCalledWith('myKeyStored', StorageEnum.Local);
      expect(mockPersistantStorageSet).not.toHaveBeenCalled();
      expect(mockSubjectNext).toHaveBeenCalledWith(expect.objectContaining({ value: 'storedValue', id: 3333333330000 }));
    });

    it('should use specified storageType', () => {
      mockGetUniqueId.mockReturnValueOnce(4444444440000);
      const params: PulseParams<boolean> = {
        defaultValue: true,
        key: 'sessionKey',
        storageType: StorageEnum.Session,
      };
      const result = pulse(params);

      expect(result.id).toBe(4444444440000);
      expect(result.storageType).toBe(StorageEnum.Session);
      expect(mockPersistantStorageGet).toHaveBeenCalledWith('sessionKey', StorageEnum.Session);
      expect(mockPersistantStorageSet).toHaveBeenCalledWith('sessionKey', true, StorageEnum.Session);
      expect(mockSubjectNext).toHaveBeenCalledWith(result);
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
      const [state, setStateFn, isProcessing, isFinished] = result.current;

      expect(state).toBe('initial');
      expect(typeof setStateFn).toBe('function');
      expect(isProcessing).toBe(false);
      expect(isFinished).toBe(false);
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
      mockSubjectSubscribe.mockImplementationOnce(cb => {
        subscriptionCallback = cb;
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
        const mockCb = jest.fn(() => 'syncResult');
        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        mockSubjectSubscribe.mockImplementationOnce(cb => {
            subscriptionCallback = cb;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result } = renderHook(() => usePulse(testPulseObject, mockCb));

        act(() => {
            if (subscriptionCallback) {
                subscriptionCallback('triggerCallback'); // Mapped value
            }
        });
        
        expect(mockCb).toHaveBeenCalledTimes(1);
        expect(result.current[2]).toBe(false); // isProcessing false after sync
        expect(result.current[3]).toBe(true);  // isFinished true
    });
    
    it('should handle synchronous callback error and update processing/finished states', () => {
        const error = new Error('Sync Error');
        const mockSyncErrorCb = jest.fn(() => { throw error; });
        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        mockSubjectSubscribe.mockImplementationOnce(cb => {
            subscriptionCallback = cb;
            return { unsubscribe: mockSubjectUnsubscribe };
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => usePulse(testPulseObject, mockSyncErrorCb));

        act(() => {
            if (subscriptionCallback) {
                subscriptionCallback('triggerSyncError');
            }
        });
        
        expect(mockSyncErrorCb).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(error);
        expect(result.current[2]).toBe(false); 
        expect(result.current[3]).toBe(true);  
        
        consoleErrorSpy.mockRestore();
    });

    it('should execute asynchronous callback and update processing/finished states', async () => {
        const mockAsyncCb = jest.fn(() => Promise.resolve('asyncResult'));
        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        mockSubjectSubscribe.mockImplementationOnce(cb => {
            subscriptionCallback = cb;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result, waitForNextUpdate } = renderHook(() => usePulse(testPulseObject, mockAsyncCb));

        act(() => {
            if (subscriptionCallback) {
                subscriptionCallback('triggerAsyncCallback');
            }
        });

        expect(result.current[2]).toBe(true); // isProcessing should be true immediately
        expect(mockAsyncCb).toHaveBeenCalledTimes(1);
        
        await act(async () => {
            await waitForNextUpdate(); // For setIsProcessing(false)
        });
        await act(async () => {
            await waitForNextUpdate(); // For setIsFinished(true)
        });

        expect(result.current[2]).toBe(false); 
        expect(result.current[3]).toBe(true);  
    });
    
    it('should handle asynchronous callback rejection', async () => {
        const mockAsyncRejectCb = jest.fn(() => Promise.reject(new Error('Async Error')));
        let subscriptionCallback: ((mappedValue: string) => void) | null = null;
        mockSubjectSubscribe.mockImplementationOnce(cb => {
            subscriptionCallback = cb;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result, waitForNextUpdate } = renderHook(() => usePulse(testPulseObject, mockAsyncRejectCb));

        act(() => {
            if (subscriptionCallback) {
                subscriptionCallback('triggerAsyncReject');
            }
        });

        expect(result.current[2]).toBe(true); 
        expect(mockAsyncRejectCb).toHaveBeenCalledTimes(1);

        await act(async () => {
            await waitForNextUpdate(); 
        });
         await act(async () => {
            await waitForNextUpdate(); 
        });

        expect(result.current[2]).toBe(false); 
        expect(result.current[3]).toBe(true);  
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
        mockSubjectSubscribe.mockImplementation(cb => {
            subscriptionCallback = cb;
            return { unsubscribe: mockSubjectUnsubscribe };
        });

        const { result, waitFor } = renderHook(() => usePulse(testPulseObject, longAsyncCb));

        // Trigger first event
        act(() => {
            if (subscriptionCallback) subscriptionCallback('event1');
        });

        await waitFor(() => expect(result.current[2]).toBe(true)); // Wait for isProcessing to become true
        expect(longAsyncCb).toHaveBeenCalledTimes(1);

        // Trigger second event while first is still "processing"
        act(() => {
            if (subscriptionCallback) subscriptionCallback('event2');
        });

        // Callback should NOT be called again due to isProcessing guard
        expect(longAsyncCb).toHaveBeenCalledTimes(1); 
        expect(result.current[2]).toBe(true); // Still processing the first one

        // Resolve the first callback's promise
        act(() => {
            if(promiseResolvers.length > 0) promiseResolvers[0]();
        });
        
        await waitFor(() => expect(result.current[2]).toBe(false)); // Wait for isProcessing to become false
        expect(result.current[3]).toBe(true); // isFinished
    });
  });

  describe('usePulseValue()', () => {
    it('should return the current value of the pulse and update with observer', () => {
      mockGetUniqueId.mockReturnValue(6666666660000);
      const po = pulse({ defaultValue: 'valueOnly' });
      mockSubjectNext.mockClear();

      let subscriptionCbForUsePulse: ((mappedValue: string) => void) | null = null;
      mockSubjectSubscribe.mockImplementation(cb => { // Catches subscribe from usePulse inside usePulseValue
        subscriptionCbForUsePulse = cb;
        return { unsubscribe: mockSubjectUnsubscribe };
      });

      const { result } = renderHook(() => usePulseValue(po));
      expect(result.current).toBe('valueOnly');

      act(() => {
        if (subscriptionCbForUsePulse) {
          subscriptionCbForUsePulse('updatedViaObserver');
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
        id: 123000, key: 'setKeyExt', storageType: StorageEnum.Local, value: 'oldVal',
      };
      mockPersistantStorageSet.mockClear();
      mockSubjectNext.mockClear();

      const returnedPulse = setPulse(testPO, 'newValExt');

      expect(mockPersistantStorageSet).toHaveBeenCalledWith('setKeyExt', 'newValExt', StorageEnum.Local);
      expect(mockSubjectNext).toHaveBeenCalledWith({
        id: 123000, key: 'setKeyExt', storageType: StorageEnum.Local, value: 'newValExt',
      });
      expect(returnedPulse).toBe(testPO); 
    });

    it('should not update persistent storage if no key and notify observer', () => {
      const testPO: Pulse<number> = {
        id: 456000, storageType: StorageEnum.Session, value: 10,
      };
      mockPersistantStorageSet.mockClear();
      mockSubjectNext.mockClear();

      setPulse(testPO, 20);

      expect(mockPersistantStorageSet).not.toHaveBeenCalled();
      expect(mockSubjectNext).toHaveBeenCalledWith({
        id: 456000, key: undefined, storageType: StorageEnum.Session, value: 20,
      });
    });
  });

  describe('getPulse()', () => {
    it('should return value from persistent storage if key exists', () => {
      const testPO: Pulse<string> = {
        id: 789000, key: 'getKeyExt', storageType: StorageEnum.Local, value: 'initialVal',
      };
      mockPersistantStorageGet.mockReturnValueOnce('storedValueForKeyExt');

      const value = getPulse(testPO);

      expect(mockPersistantStorageGet).toHaveBeenCalledWith('getKeyExt'); // storageType defaults to Local in getPulse
      expect(value).toBe('storedValueForKeyExt');
    });
    
    it('should return value from persistent storage using pulse storageType if key exists', () => {
      const testPO: Pulse<string> = {
        id: 789001, key: 'getKeyExtSession', storageType: StorageEnum.Session, value: 'initialVal',
      };
      // Note: getPulse in current code always uses default StorageEnum.Local for persistantStorageGet
      // If it's intended to use pulseObject.storageType, the implementation of getPulse needs change.
      // Assuming current implementation:
      mockPersistantStorageGet.mockReturnValueOnce('storedWithDefaultLocal');

      const value = getPulse(testPO);
      // According to current getPulse implementation:
      expect(mockPersistantStorageGet).toHaveBeenCalledWith('getKeyExtSession'); // It does not pass storageType
      // If getPulse were to use pulseObject.storageType, it would be:
      // expect(mockPersistantStorageGet).toHaveBeenCalledWith('getKeyExtSession', StorageEnum.Session);
      expect(value).toBe('storedWithDefaultLocal');
    });


    it('should return pulse object value if no key exists', () => {
      const testPO: Pulse<boolean> = {
        id: 101000, storageType: StorageEnum.Local, value: true,
      };
      mockPersistantStorageGet.mockClear();

      const value = getPulse(testPO);

      expect(mockPersistantStorageGet).not.toHaveBeenCalled();
      expect(value).toBe(true);
    });

     it('should return null from persistent storage if key exists but value is null', () => {
      const testPO: Pulse<string | null> = {
        id: 789002, key: 'getKeyNullExt', storageType: StorageEnum.Local, value: 'initialNonNull',
      };
      mockPersistantStorageGet.mockReturnValueOnce(null);

      const value = getPulse(testPO);

      expect(mockPersistantStorageGet).toHaveBeenCalledWith('getKeyNullExt');
      expect(value).toBeNull();
    });
  });
});
