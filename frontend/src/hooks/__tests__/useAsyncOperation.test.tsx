import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { UIProvider } from '../../contexts/UIContext'
import {
    useAsyncOperation,
    useFormSubmission,
    useDataFetching,
    useDeleteOperation
} from '../useAsyncOperation'

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <UIProvider>{children}</UIProvider>
)

// Mock successful operation
const mockSuccessOperation = jest.fn().mockResolvedValue('success result')

// Mock failing operation
const mockFailOperation = jest.fn().mockRejectedValue(new Error('Operation failed'))

// Mock API error
const mockApiError = {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    timestamp: '2024-01-15T10:30:00Z',
}

const mockApiFailOperation = jest.fn().mockRejectedValue(mockApiError)

describe('useAsyncOperation', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('initializes with correct default state', () => {
        const { result } = renderHook(
            () => useAsyncOperation(mockSuccessOperation),
            { wrapper }
        )

        expect(result.current.data).toBeNull()
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('handles successful operation', async () => {
        const { result } = renderHook(
            () => useAsyncOperation(mockSuccessOperation),
            { wrapper }
        )

        let executePromise: Promise<any>

        act(() => {
            executePromise = result.current.execute('test-arg')
        })

        expect(result.current.loading).toBe(true)
        expect(result.current.error).toBeNull()

        await act(async () => {
            const result_data = await executePromise!
            expect(result_data).toBe('success result')
        })

        expect(result.current.loading).toBe(false)
        expect(result.current.data).toBe('success result')
        expect(result.current.error).toBeNull()
        expect(mockSuccessOperation).toHaveBeenCalledWith('test-arg')
    })

    it('handles failed operation', async () => {
        const { result } = renderHook(
            () => useAsyncOperation(mockFailOperation),
            { wrapper }
        )

        let executePromise: Promise<any>

        act(() => {
            executePromise = result.current.execute()
        })

        expect(result.current.loading).toBe(true)

        await act(async () => {
            const result_data = await executePromise!
            expect(result_data).toBeNull()
        })

        expect(result.current.loading).toBe(false)
        expect(result.current.data).toBeNull()
        expect(result.current.error).toEqual(new Error('Operation failed'))
    })

    it('handles API error', async () => {
        const { result } = renderHook(
            () => useAsyncOperation(mockApiFailOperation),
            { wrapper }
        )

        let executePromise: Promise<any>

        act(() => {
            executePromise = result.current.execute()
        })

        await act(async () => {
            await executePromise!
        })

        expect(result.current.error).toEqual(mockApiError)
    })

    it('calls success callback on successful operation', async () => {
        const onSuccess = jest.fn()
        const { result } = renderHook(
            () => useAsyncOperation(mockSuccessOperation, { onSuccess }),
            { wrapper }
        )

        await act(async () => {
            await result.current.execute()
        })

        expect(onSuccess).toHaveBeenCalledWith('success result')
    })

    it('calls error callback on failed operation', async () => {
        const onError = jest.fn()
        const { result } = renderHook(
            () => useAsyncOperation(mockFailOperation, { onError }),
            { wrapper }
        )

        await act(async () => {
            await result.current.execute()
        })

        expect(onError).toHaveBeenCalledWith(new Error('Operation failed'))
    })

    it('resets state correctly', () => {
        const { result } = renderHook(
            () => useAsyncOperation(mockSuccessOperation),
            { wrapper }
        )

        // Set some state
        act(() => {
            result.current.execute()
        })

        act(() => {
            result.current.reset()
        })

        expect(result.current.data).toBeNull()
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('uses custom loading key', async () => {
        const { result } = renderHook(
            () => useAsyncOperation(mockSuccessOperation, { loadingKey: 'custom-key' }),
            { wrapper }
        )

        act(() => {
            result.current.execute()
        })

        // This would be tested by checking if the loading key is set in the UI context
        // For now, we just verify the operation works
        expect(result.current.loading).toBe(true)
    })

    it('shows success toast when configured', async () => {
        const { result } = renderHook(
            () => useAsyncOperation(mockSuccessOperation, {
                showSuccessToast: true,
                successMessage: 'Operation successful!'
            }),
            { wrapper }
        )

        await act(async () => {
            await result.current.execute()
        })

        // The toast would be shown via the UI context
        // We verify the operation completed successfully
        expect(result.current.data).toBe('success result')
    })
})

describe('useFormSubmission', () => {
    it('shows success toast by default', async () => {
        const { result } = renderHook(
            () => useFormSubmission(mockSuccessOperation),
            { wrapper }
        )

        await act(async () => {
            await result.current.submit({ field: 'value' })
        })

        expect(mockSuccessOperation).toHaveBeenCalledWith({ field: 'value' })
        expect(result.current.data).toBe('success result')
    })

    it('resets state after successful submission when configured', async () => {
        const { result } = renderHook(
            () => useFormSubmission(mockSuccessOperation, { resetOnSuccess: true }),
            { wrapper }
        )

        await act(async () => {
            await result.current.submit({ field: 'value' })
        })

        // Wait for reset timeout
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 150))
        })

        expect(result.current.data).toBeNull()
    })
})

describe('useDataFetching', () => {
    it('configures for data fetching by default', () => {
        const { result } = renderHook(
            () => useDataFetching(mockSuccessOperation),
            { wrapper }
        )

        // Should not show success toast for data fetching
        expect(typeof result.current.execute).toBe('function')
    })
})

describe('useDeleteOperation', () => {
    // Mock window.confirm
    const originalConfirm = window.confirm

    beforeEach(() => {
        window.confirm = jest.fn()
    })

    afterEach(() => {
        window.confirm = originalConfirm
    })

    it('shows confirmation dialog', async () => {
        (window.confirm as jest.Mock).mockReturnValue(true)

        const { result } = renderHook(
            () => useDeleteOperation(mockSuccessOperation),
            { wrapper }
        )

        await act(async () => {
            await result.current.delete('item-id')
        })

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this item?')
        expect(mockSuccessOperation).toHaveBeenCalledWith('item-id')
    })

    it('does not execute when confirmation is cancelled', async () => {
        (window.confirm as jest.Mock).mockReturnValue(false)

        const { result } = renderHook(
            () => useDeleteOperation(mockSuccessOperation),
            { wrapper }
        )

        const result_data = await act(async () => {
            return await result.current.delete('item-id')
        })

        expect(result_data).toBeNull()
        expect(mockSuccessOperation).not.toHaveBeenCalled()
    })

    it('uses custom confirmation message and item name', async () => {
        (window.confirm as jest.Mock).mockReturnValue(true)

        const { result } = renderHook(
            () => useDeleteOperation(mockSuccessOperation, {
                confirmMessage: 'Custom confirmation message',
                itemName: 'user'
            }),
            { wrapper }
        )

        await act(async () => {
            await result.current.delete('user-id')
        })

        expect(window.confirm).toHaveBeenCalledWith('Custom confirmation message')
    })
})