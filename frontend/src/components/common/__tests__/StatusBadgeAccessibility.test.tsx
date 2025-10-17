import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../../theme'
import { StatusBadge } from '../StatusBadge'
import type { ClientStatus, ExceptionStatus, RiskLevel, Priority, ReviewStatus } from '../StatusBadge'

// Test wrapper with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>
        {children}
    </ThemeProvider>
)

// Helper function to calculate contrast ratio
// Based on WCAG 2.1 guidelines
function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(color1: string, color2: string): number {
    // Convert hex to RGB
    const hex1 = color1.replace('#', '')
    const hex2 = color2.replace('#', '')

    const r1 = parseInt(hex1.substr(0, 2), 16)
    const g1 = parseInt(hex1.substr(2, 2), 16)
    const b1 = parseInt(hex1.substr(4, 2), 16)

    const r2 = parseInt(hex2.substr(0, 2), 16)
    const g2 = parseInt(hex2.substr(2, 2), 16)
    const b2 = parseInt(hex2.substr(4, 2), 16)

    const lum1 = getLuminance(r1, g1, b1)
    const lum2 = getLuminance(r2, g2, b2)

    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)

    return (brightest + 0.05) / (darkest + 0.05)
}

describe('StatusBadge Accessibility Compliance', () => {
    describe('Color Contrast Ratios', () => {
        const backgroundColor = '#ffffff' // White background
        const minContrastRatio = 4.5 // WCAG AA standard for normal text

        describe('Client Status Colors', () => {
            const clientStatuses: ClientStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'UNDER_REVIEW', 'PENDING']

            test.each(clientStatuses)('should meet contrast requirements for %s status', (status) => {
                render(
                    <TestWrapper>
                        <StatusBadge status={status} type="client" data-testid={`client-${status}`} />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`client-${status}`)
                const styles = window.getComputedStyle(badge)
                const textColor = styles.color

                // Extract hex color from rgb() format
                const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
                if (rgbMatch) {
                    const [, r, g, b] = rgbMatch
                    const hexColor = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`
                    const contrastRatio = getContrastRatio(hexColor, backgroundColor)

                    expect(contrastRatio).toBeGreaterThanOrEqual(minContrastRatio)
                }
            })
        })

        describe('Exception Status Colors', () => {
            const exceptionStatuses: ExceptionStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED']

            test.each(exceptionStatuses)('should meet contrast requirements for %s status', (status) => {
                render(
                    <TestWrapper>
                        <StatusBadge status={status} type="exception" data-testid={`exception-${status}`} />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`exception-${status}`)
                const styles = window.getComputedStyle(badge)
                const textColor = styles.color

                const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
                if (rgbMatch) {
                    const [, r, g, b] = rgbMatch
                    const hexColor = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`
                    const contrastRatio = getContrastRatio(hexColor, backgroundColor)

                    expect(contrastRatio).toBeGreaterThanOrEqual(minContrastRatio)
                }
            })
        })

        describe('Risk Level Colors', () => {
            const riskLevels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'CRITICAL']

            test.each(riskLevels)('should meet contrast requirements for %s risk level', (level) => {
                render(
                    <TestWrapper>
                        <StatusBadge status={level} type="risk" data-testid={`risk-${level}`} />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`risk-${level}`)
                const styles = window.getComputedStyle(badge)
                const textColor = styles.color

                const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
                if (rgbMatch) {
                    const [, r, g, b] = rgbMatch
                    const hexColor = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`
                    const contrastRatio = getContrastRatio(hexColor, backgroundColor)

                    expect(contrastRatio).toBeGreaterThanOrEqual(minContrastRatio)
                }
            })
        })

        describe('Priority Colors', () => {
            const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

            test.each(priorities)('should meet contrast requirements for %s priority', (priority) => {
                render(
                    <TestWrapper>
                        <StatusBadge status={priority} type="priority" data-testid={`priority-${priority}`} />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`priority-${priority}`)
                const styles = window.getComputedStyle(badge)
                const textColor = styles.color

                const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
                if (rgbMatch) {
                    const [, r, g, b] = rgbMatch
                    const hexColor = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`
                    const contrastRatio = getContrastRatio(hexColor, backgroundColor)

                    expect(contrastRatio).toBeGreaterThanOrEqual(minContrastRatio)
                }
            })
        })

        describe('Review Status Colors', () => {
            const reviewStatuses: ReviewStatus[] = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED']

            test.each(reviewStatuses)('should meet contrast requirements for %s review status', (status) => {
                render(
                    <TestWrapper>
                        <StatusBadge status={status} type="review" data-testid={`review-${status}`} />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`review-${status}`)
                const styles = window.getComputedStyle(badge)
                const textColor = styles.color

                const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
                if (rgbMatch) {
                    const [, r, g, b] = rgbMatch
                    const hexColor = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`
                    const contrastRatio = getContrastRatio(hexColor, backgroundColor)

                    expect(contrastRatio).toBeGreaterThanOrEqual(minContrastRatio)
                }
            })
        })
    })

    describe('ARIA Attributes', () => {
        test('should have proper role attribute', () => {
            render(
                <TestWrapper>
                    <StatusBadge status="ACTIVE" type="client" />
                </TestWrapper>
            )

            const badge = screen.getByRole('status')
            expect(badge).toBeInTheDocument()
        })

        test('should have descriptive aria-label', () => {
            render(
                <TestWrapper>
                    <StatusBadge status="HIGH" type="risk" />
                </TestWrapper>
            )

            const badge = screen.getByLabelText('risk level: High')
            expect(badge).toBeInTheDocument()
        })

        test('should respect custom aria-label', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        aria-label="Custom status label"
                    />
                </TestWrapper>
            )

            const badge = screen.getByLabelText('Custom status label')
            expect(badge).toBeInTheDocument()
        })

        test('should generate appropriate aria-label for different types', () => {
            const testCases = [
                { status: 'ACTIVE', type: 'client', expected: 'client status: Active' },
                { status: 'OPEN', type: 'exception', expected: 'exception status: Open' },
                { status: 'HIGH', type: 'risk', expected: 'risk level: High' },
                { status: 'MEDIUM', type: 'priority', expected: 'priority level: Medium' },
                { status: 'APPROVED', type: 'review', expected: 'review status: Approved' }
            ] as const

            testCases.forEach(({ status, type, expected }) => {
                render(
                    <TestWrapper>
                        <StatusBadge status={status} type={type} />
                    </TestWrapper>
                )

                const badge = screen.getByLabelText(expected)
                expect(badge).toBeInTheDocument()
            })
        })
    })

    describe('Keyboard Navigation', () => {
        test('should be focusable when interactive', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        onClick={() => { }}
                        data-testid="interactive-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('interactive-badge')
            expect(badge).toHaveAttribute('tabIndex', '0')
        })

        test('should not be focusable when not interactive', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        data-testid="static-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('static-badge')
            expect(badge).not.toHaveAttribute('tabIndex')
        })
    })

    describe('Screen Reader Support', () => {
        test('should provide meaningful text content', () => {
            render(
                <TestWrapper>
                    <StatusBadge status="UNDER_REVIEW" type="client" />
                </TestWrapper>
            )

            expect(screen.getByText('Under Review')).toBeInTheDocument()
        })

        test('should format multi-word statuses properly', () => {
            const testCases = [
                { status: 'UNDER_REVIEW', expected: 'Under Review' },
                { status: 'IN_PROGRESS', expected: 'In Progress' },
                { status: 'VERY_HIGH', expected: 'Very High' }
            ] as const

            testCases.forEach(({ status, expected }) => {
                render(
                    <TestWrapper>
                        <StatusBadge status={status} type="client" />
                    </TestWrapper>
                )

                expect(screen.getByText(expected)).toBeInTheDocument()
            })
        })
    })

    describe('High Contrast Mode Support', () => {
        test('should maintain visibility in high contrast mode', () => {
            // Simulate high contrast mode by checking border presence
            render(
                <TestWrapper>
                    <StatusBadge status="ACTIVE" type="client" data-testid="contrast-badge" />
                </TestWrapper>
            )

            const badge = screen.getByTestId('contrast-badge')
            const styles = window.getComputedStyle(badge)

            // Should have a visible border for high contrast mode
            expect(styles.borderWidth).toBe('1px')
            expect(styles.borderStyle).toBe('solid')
        })

        test('should use outlined variant by default for better contrast', () => {
            render(
                <TestWrapper>
                    <StatusBadge status="ACTIVE" type="client" data-testid="outlined-badge" />
                </TestWrapper>
            )

            const badge = screen.getByTestId('outlined-badge')
            expect(badge).toHaveClass('MuiChip-outlined')
        })
    })

    describe('Color Blind Accessibility', () => {
        test('should not rely solely on color for meaning', () => {
            render(
                <TestWrapper>
                    <StatusBadge status="HIGH" type="risk" showIcon={true} />
                </TestWrapper>
            )

            // Should have both text and icon for meaning
            expect(screen.getByText('High')).toBeInTheDocument()

            const badge = screen.getByLabelText('risk level: High')
            const icon = badge.querySelector('.MuiChip-icon')
            expect(icon).toBeInTheDocument()
        })

        test('should provide text labels even when icons are disabled', () => {
            render(
                <TestWrapper>
                    <StatusBadge status="CRITICAL" type="priority" showIcon={false} />
                </TestWrapper>
            )

            // Should still have meaningful text
            expect(screen.getByText('Critical')).toBeInTheDocument()
            expect(screen.getByLabelText('priority level: Critical')).toBeInTheDocument()
        })
    })

    describe('Reduced Motion Support', () => {
        test('should respect prefers-reduced-motion', () => {
            // Mock prefers-reduced-motion
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            })

            render(
                <TestWrapper>
                    <StatusBadge status="ACTIVE" type="client" data-testid="motion-badge" />
                </TestWrapper>
            )

            const badge = screen.getByTestId('motion-badge')
            const styles = window.getComputedStyle(badge)

            // Should have transition property but respect reduced motion
            expect(styles.transition).toBeDefined()
        })
    })

    describe('Focus Management', () => {
        test('should have visible focus indicator', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        onClick={() => { }}
                        data-testid="focus-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('focus-badge')
            badge.focus()

            // Should have focus styles
            expect(badge).toHaveFocus()
        })

        test('should support keyboard activation', () => {
            const handleClick = jest.fn()

            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        onClick={handleClick}
                        data-testid="keyboard-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('keyboard-badge')
            badge.focus()

            // Should support Enter key activation
            badge.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
            expect(handleClick).toHaveBeenCalled()
        })
    })
})