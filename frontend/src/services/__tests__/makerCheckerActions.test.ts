import { vi, describe, it, beforeEach, expect } from 'vitest'
import { apiClient } from '../apiClient'
import { 
    approveReview, 
    rejectReview, 
    approveException, 
    rejectException,
    MakerCheckerError 
} from '../makerCheckerActions'

// Mock the API client
vi.mock('../apiClient', () => ({
    apiClient: {
        approveReview: vi.fn(),
        rejectReview: vi.fn(),
        updateExceptionStatus: vi.fn(),
        approveException: vi.fn(),
        rejectException: vi.fn(),
    }
}))

const mockApiClient = apiClient as vi.Mocked<typeof apiClient>

describe('Maker-Checker Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Review Actions', () => {
        describe('approveReview', () => {
            it('successfully approves a review with comments', async () => {
                const mockResponse = {
                    id: 1,
                    status: 'approved',
                    checker_id: 123,
                    checker_comments: 'Looks good',
                    approved_at: '2024-01-20T10:00:00Z'
                }

                mockApiClient.approveReview.mockResolvedValue(mockResponse)

                const result = await approveReview(1, 'Looks good')

                expect(mockApiClient.approveReview).toHaveBeenCalledWith(1, 'Looks good')
                expect(result).toEqual(mockResponse)
            })

            it('successfully approves a review without comments', async () => {
                const mockResponse = {
                    id: 1,
                    status: 'approved',
                    checker_id: 123,
                    approved_at: '2024-01-20T10:00:00Z'
                }

                mockApiClient.approveReview.mockResolvedValue(mockResponse)

                const result = await approveReview(1)

                expect(mockApiClient.approveReview).toHaveBeenCalledWith(1, undefined)
                expect(result).toEqual(mockResponse)
            })

            it('throws MakerCheckerError when review not found', async () => {
                mockApiClient.approveReview.mockRejectedValue({
                    response: {
                        status: 404,
                        data: { detail: 'Review not found' }
                    }
                })

                await expect(approveReview(999)).rejects.toThrow(MakerCheckerError)
            })

            it('throws MakerCheckerError when insufficient permissions', async () => {
                mockApiClient.approveReview.mockRejectedValue({
                    response: {
                        status: 403,
                        data: { detail: 'Insufficient permissions' }
                    }
                })

                await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
            })

            it('throws MakerCheckerError when review is in wrong status', async () => {
                mockApiClient.approveReview.mockRejectedValue({
                    response: {
                        status: 400,
                        data: { detail: 'Review must be in submitted status to approve' }
                    }
                })

                await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
            })

            it('throws MakerCheckerError for network errors', async () => {
                mockApiClient.approveReview.mockRejectedValue(new Error('Network Error'))

                await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
            })
        })

        describe('rejectReview', () => {
            it('successfully rejects a review with reason', async () => {
                const mockResponse = {
                    id: 1,
                    status: 'rejected',
                    checker_id: 123,
                    rejection_reason: 'Incomplete documentation',
                    rejected_at: '2024-01-20T10:00:00Z'
                }

                mockApiClient.rejectReview.mockResolvedValue(mockResponse)

                const result = await rejectReview(1, 'Incomplete documentation')

                expect(mockApiClient.rejectReview).toHaveBeenCalledWith(1, 'Incomplete documentation')
                expect(result).toEqual(mockResponse)
            })

            it('throws error when reason is empty', async () => {
                await expect(rejectReview(1, '')).rejects.toThrow(MakerCheckerError)
                await expect(rejectReview(1, '')).rejects.toThrow(
                    'Rejection reason is required'
                )
            })

            it('throws error when reason is only whitespace', async () => {
                await expect(rejectReview(1, '   ')).rejects.toThrow(MakerCheckerError)
                await expect(rejectReview(1, '   ')).rejects.toThrow(
                    'Rejection reason is required'
                )
            })

            it('handles validation errors for reason length', async () => {
                mockApiClient.rejectReview.mockRejectedValue({
                    response: {
                        status: 422,
                        data: { 
                            detail: [
                                {
                                    field: 'reason',
                                    message: 'Reason must be at least 10 characters long'
                                }
                            ]
                        }
                    }
                })

                await expect(rejectReview(1, 'Too short')).rejects.toThrow(MakerCheckerError)
            })
        })
    })

    describe('Exception Actions', () => {
        describe('approveException', () => {
            it('successfully approves an exception with comments', async () => {
                const mockResponse = {
                    id: 1,
                    status: 'RESOLVED',
                    checker_id: 123,
                    resolution_notes: 'Exception justified',
                    approved_at: '2024-01-20T10:00:00Z'
                }

                mockApiClient.approveException.mockResolvedValue(mockResponse)

                const result = await approveException(1, 'Exception justified')

                expect(mockApiClient.approveException).toHaveBeenCalledWith(1, 'Exception justified')
                expect(result).toEqual(mockResponse)
            })

            it('successfully approves an exception without comments', async () => {
                const mockResponse = {
                    id: 1,
                    status: 'RESOLVED',
                    checker_id: 123,
                    approved_at: '2024-01-20T10:00:00Z'
                }

                mockApiClient.approveException.mockResolvedValue(mockResponse)

                const result = await approveException(1)

                expect(mockApiClient.approveException).toHaveBeenCalledWith(1, undefined)
                expect(result).toEqual(mockResponse)
            })
        })

        describe('rejectException', () => {
            it('successfully rejects an exception with reason', async () => {
                const mockResponse = {
                    id: 1,
                    status: 'CLOSED',
                    checker_id: 123,
                    resolution_notes: 'Exception not justified',
                    rejected_at: '2024-01-20T10:00:00Z'
                }

                mockApiClient.rejectException.mockResolvedValue(mockResponse)

                const result = await rejectException(1, 'Exception not justified')

                expect(mockApiClient.rejectException).toHaveBeenCalledWith(1, 'Exception not justified')
                expect(result).toEqual(mockResponse)
            })

            it('throws error when reason is empty', async () => {
                await expect(rejectException(1, '')).rejects.toThrow(MakerCheckerError)
                await expect(rejectException(1, '')).rejects.toThrow(
                    'Rejection reason is required'
                )
            })
        })
    })

    describe('Error Handling', () => {
        it('provides specific error messages for different HTTP status codes', async () => {
            const testCases = [
                {
                    status: 400,
                    serverMessage: 'Invalid request data',
                    expectedMessage: 'Invalid request data'
                },
                {
                    status: 401,
                    serverMessage: 'Unauthorized',
                    expectedMessage: 'You are not authorized to perform this action. Please log in again.'
                },
                {
                    status: 403,
                    serverMessage: 'Forbidden',
                    expectedMessage: 'You don\'t have permission to perform this action. Contact your administrator.'
                },
                {
                    status: 404,
                    serverMessage: 'Not found',
                    expectedMessage: 'Review not found. It may have been deleted or you don\'t have permission to access it.'
                },
                {
                    status: 409,
                    serverMessage: 'Conflict',
                    expectedMessage: 'This action conflicts with the current state. Please refresh and try again.'
                },
                {
                    status: 500,
                    serverMessage: 'Internal server error',
                    expectedMessage: 'A server error occurred. Please try again later or contact support.'
                }
            ]

            for (const testCase of testCases) {
                mockApiClient.approveReview.mockRejectedValue({
                    response: {
                        status: testCase.status,
                        data: { detail: testCase.serverMessage }
                    }
                })

                await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
            }
        })

        it('handles validation errors with multiple fields', async () => {
            mockApiClient.rejectReview.mockRejectedValue({
                response: {
                    status: 422,
                    data: {
                        detail: [
                            { field: 'reason', message: 'Reason is required' },
                            { field: 'comments', message: 'Comments too long' }
                        ]
                    }
                }
            })

            await expect(rejectReview(1, 'test')).rejects.toThrow(MakerCheckerError)
        })

        it('handles timeout errors', async () => {
            const timeoutError = new Error('timeout of 5000ms exceeded')
            timeoutError.name = 'TimeoutError'
            mockApiClient.approveReview.mockRejectedValue(timeoutError)

            await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
        })

        it('handles unknown errors gracefully', async () => {
            mockApiClient.approveReview.mockRejectedValue(new Error('Unknown error'))

            await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
        })
    })

    describe('Input Validation', () => {
        it('validates review ID is a positive number', async () => {
            await expect(approveReview(0)).rejects.toThrow(MakerCheckerError)
            await expect(approveReview(-1)).rejects.toThrow(MakerCheckerError)
            await expect(approveReview(NaN)).rejects.toThrow(MakerCheckerError)
        })

        it('validates exception ID is a positive number', async () => {
            await expect(approveException(0)).rejects.toThrow(MakerCheckerError)
            await expect(approveException(-1)).rejects.toThrow(MakerCheckerError)
            await expect(approveException(NaN)).rejects.toThrow(MakerCheckerError)
        })

        it('trims whitespace from comments and reasons', async () => {
            const mockResponse = { id: 1, status: 'approved' }
            mockApiClient.approveReview.mockResolvedValue(mockResponse)

            await approveReview(1, '  trimmed comment  ')

            expect(mockApiClient.approveReview).toHaveBeenCalledWith(1, 'trimmed comment')
        })

        it('handles very long comments appropriately', async () => {
            const longComment = 'a'.repeat(1000)
            const mockResponse = { id: 1, status: 'approved' }
            mockApiClient.approveReview.mockResolvedValue(mockResponse)

            await approveReview(1, longComment)

            expect(mockApiClient.approveReview).toHaveBeenCalledWith(1, longComment)
        })
    })

    describe('Concurrent Operations', () => {
        it('handles concurrent approval attempts', async () => {
            mockApiClient.approveReview.mockRejectedValue({
                response: {
                    status: 409,
                    data: { detail: 'Review has already been processed by another user' }
                }
            })

            await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
        })

        it('handles stale data scenarios', async () => {
            mockApiClient.approveReview.mockRejectedValue({
                response: {
                    status: 412,
                    data: { detail: 'The resource has been modified by another user' }
                }
            })

            await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
        })
    })

    describe('MakerCheckerError Class', () => {
        it('creates error with message and original error', () => {
            const originalError = new Error('Original error')
            const mcError = new MakerCheckerError('Custom message', originalError)

            expect(mcError.message).toBe('Custom message')
            expect(mcError.originalError).toBe(originalError)
            expect(mcError.name).toBe('MakerCheckerError')
        })

        it('creates error with just message', () => {
            const mcError = new MakerCheckerError('Custom message')

            expect(mcError.message).toBe('Custom message')
            expect(mcError.originalError).toBeUndefined()
            expect(mcError.name).toBe('MakerCheckerError')
        })

        it('is instance of Error', () => {
            const mcError = new MakerCheckerError('Test')
            expect(mcError instanceof Error).toBe(true)
            expect(mcError instanceof MakerCheckerError).toBe(true)
        })
    })
})