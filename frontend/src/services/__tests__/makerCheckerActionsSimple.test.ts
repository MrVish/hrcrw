import { vi } from 'vitest'
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

            it('throws MakerCheckerError when API call fails', async () => {
                const apiError = new Error('Review not found')
                mockApiClient.approveReview.mockRejectedValue(apiError)

                await expect(approveReview(1)).rejects.toThrow(MakerCheckerError)
                await expect(approveReview(1)).rejects.toThrow('Review not found')
            })

            it('validates review ID is a positive number', async () => {
                await expect(approveReview(0)).rejects.toThrow(MakerCheckerError)
                await expect(approveReview(-1)).rejects.toThrow(MakerCheckerError)
                await expect(approveReview(NaN)).rejects.toThrow(MakerCheckerError)
            })

            it('trims whitespace from comments', async () => {
                const mockResponse = { id: 1, status: 'approved' }
                mockApiClient.approveReview.mockResolvedValue(mockResponse)

                await approveReview(1, '  trimmed comment  ')

                expect(mockApiClient.approveReview).toHaveBeenCalledWith(1, 'trimmed comment')
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
                await expect(rejectReview(1, '')).rejects.toThrow('Rejection reason is required')
            })

            it('throws error when reason is only whitespace', async () => {
                await expect(rejectReview(1, '   ')).rejects.toThrow(MakerCheckerError)
                await expect(rejectReview(1, '   ')).rejects.toThrow('Rejection reason is required')
            })

            it('throws MakerCheckerError when API call fails', async () => {
                const apiError = new Error('Review not found')
                mockApiClient.rejectReview.mockRejectedValue(apiError)

                await expect(rejectReview(1, 'Valid reason')).rejects.toThrow(MakerCheckerError)
                await expect(rejectReview(1, 'Valid reason')).rejects.toThrow('Review not found')
            })

            it('validates review ID is a positive number', async () => {
                await expect(rejectReview(0, 'Valid reason')).rejects.toThrow(MakerCheckerError)
                await expect(rejectReview(-1, 'Valid reason')).rejects.toThrow(MakerCheckerError)
                await expect(rejectReview(NaN, 'Valid reason')).rejects.toThrow(MakerCheckerError)
            })

            it('trims whitespace from reason', async () => {
                const mockResponse = { id: 1, status: 'rejected' }
                mockApiClient.rejectReview.mockResolvedValue(mockResponse)

                await rejectReview(1, '  trimmed reason  ')

                expect(mockApiClient.rejectReview).toHaveBeenCalledWith(1, 'trimmed reason')
            })
        })
    })

    describe('Exception Actions', () => {
        describe('approveException', () => {
            it('throws error indicating not implemented', async () => {
                await expect(approveException(1, 'Comments')).rejects.toThrow(MakerCheckerError)
                await expect(approveException(1, 'Comments')).rejects.toThrow('Exception approval is not yet implemented')
            })

            it('validates exception ID is a positive number', async () => {
                await expect(approveException(0)).rejects.toThrow(MakerCheckerError)
                await expect(approveException(-1)).rejects.toThrow(MakerCheckerError)
                await expect(approveException(NaN)).rejects.toThrow(MakerCheckerError)
            })
        })

        describe('rejectException', () => {
            it('throws error indicating not implemented', async () => {
                await expect(rejectException(1, 'Valid reason')).rejects.toThrow(MakerCheckerError)
                await expect(rejectException(1, 'Valid reason')).rejects.toThrow('Exception rejection is not yet implemented')
            })

            it('throws error when reason is empty', async () => {
                await expect(rejectException(1, '')).rejects.toThrow(MakerCheckerError)
                await expect(rejectException(1, '')).rejects.toThrow('Rejection reason is required')
            })

            it('validates exception ID is a positive number', async () => {
                await expect(rejectException(0, 'Valid reason')).rejects.toThrow(MakerCheckerError)
                await expect(rejectException(-1, 'Valid reason')).rejects.toThrow(MakerCheckerError)
                await expect(rejectException(NaN, 'Valid reason')).rejects.toThrow(MakerCheckerError)
            })
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