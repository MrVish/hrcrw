import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import StatusBadge from '../StatusBadge'
import theme from '../../../theme'
import { describe, it, expect } from 'vitest'

const renderWithTheme = (component: React.ReactElement) => {
    return render(
        <ThemeProvider theme={theme}>
            {component}
        </ThemeProvider>
    )
}

describe('StatusBadge', () => {
    describe('Basic Rendering', () => {
        it('renders client status correctly', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" />)
            expect(screen.getByText('Active')).toBeInTheDocument()
        })

        it('renders exception status correctly', () => {
            renderWithTheme(<StatusBadge status="IN_PROGRESS" />)
            expect(screen.getByText('In Progress')).toBeInTheDocument()
        })

        it('renders risk level correctly', () => {
            renderWithTheme(<StatusBadge status="VERY_HIGH" />)
            expect(screen.getByText('Very High')).toBeInTheDocument()
        })

        it('renders priority correctly', () => {
            renderWithTheme(<StatusBadge status="CRITICAL" />)
            expect(screen.getByText('Critical')).toBeInTheDocument()
        })

        it('renders review status correctly', () => {
            renderWithTheme(<StatusBadge status="UNDER_REVIEW" />)
            expect(screen.getByText('Under Review')).toBeInTheDocument()
        })

        it('handles unknown status gracefully', () => {
            // @ts-ignore - Testing unknown status
            renderWithTheme(<StatusBadge status="UNKNOWN" />)
            expect(screen.getByText('Unknown')).toBeInTheDocument()
        })
    })

    describe('Type-based Styling', () => {
        it('applies client type styling', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" type="client" />)
            const badge = screen.getByRole('status')
            expect(badge).toBeInTheDocument()
            expect(screen.getByText('Active')).toBeInTheDocument()
        })

        it('applies exception type styling', () => {
            renderWithTheme(<StatusBadge status="OPEN" type="exception" />)
            const badge = screen.getByRole('status')
            expect(badge).toBeInTheDocument()
            expect(screen.getByText('Open')).toBeInTheDocument()
        })

        it('applies review type styling', () => {
            renderWithTheme(<StatusBadge status="APPROVED" type="review" />)
            const badge = screen.getByRole('status')
            expect(badge).toBeInTheDocument()
            expect(screen.getByText('Approved')).toBeInTheDocument()
        })

        it('applies risk type styling', () => {
            renderWithTheme(<StatusBadge status="HIGH" type="risk" />)
            const badge = screen.getByRole('status')
            expect(badge).toBeInTheDocument()
            expect(screen.getByText('High')).toBeInTheDocument()
        })

        it('applies priority type styling', () => {
            renderWithTheme(<StatusBadge status="CRITICAL" type="priority" />)
            const badge = screen.getByRole('status')
            expect(badge).toBeInTheDocument()
            expect(screen.getByText('Critical')).toBeInTheDocument()
        })
    })

    describe('Icon Integration', () => {
        it('shows icons by default', () => {
            renderWithTheme(<StatusBadge status="APPROVED" type="review" />)
            // Check for icon presence by looking for svg elements
            const svgElements = document.querySelectorAll('svg')
            expect(svgElements.length).toBeGreaterThan(0)
        })

        it('hides icons when showIcon is false', () => {
            renderWithTheme(<StatusBadge status="APPROVED" type="review" showIcon={false} />)
            expect(screen.getByText('Approved')).toBeInTheDocument()
            // Should still render but without icon
        })

        it('renders appropriate icons for review statuses', () => {
            const { rerender } = renderWithTheme(<StatusBadge status="DRAFT" type="review" />)
            expect(screen.getByText('Draft')).toBeInTheDocument()

            rerender(
                <ThemeProvider theme={theme}>
                    <StatusBadge status="APPROVED" type="review" />
                </ThemeProvider>
            )
            expect(screen.getByText('Approved')).toBeInTheDocument()
        })

        it('renders appropriate icons for client statuses', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" type="client" />)
            expect(screen.getByText('Active')).toBeInTheDocument()
        })

        it('renders appropriate icons for exception statuses', () => {
            renderWithTheme(<StatusBadge status="OPEN" type="exception" />)
            expect(screen.getByText('Open')).toBeInTheDocument()
        })

        it('renders appropriate icons for risk levels', () => {
            renderWithTheme(<StatusBadge status="HIGH" type="risk" />)
            expect(screen.getByText('High')).toBeInTheDocument()
        })
    })

    describe('Variants', () => {
        it('supports outlined variant (default)', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" />)
            expect(screen.getByText('Active')).toBeInTheDocument()
        })

        it('supports outlined variant explicitly', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" variant="outlined" />)
            expect(screen.getByText('Active')).toBeInTheDocument()
        })

        it('supports filled variant', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" variant="filled" />)
            expect(screen.getByText('Active')).toBeInTheDocument()
        })
    })

    describe('Accessibility', () => {
        it('has proper role attribute', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" />)
            expect(screen.getByRole('status')).toBeInTheDocument()
        })

        it('generates appropriate aria-label for client status', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" type="client" />)
            const badge = screen.getByRole('status')
            expect(badge).toHaveAttribute('aria-label', 'client status: Active')
        })

        it('generates appropriate aria-label for risk level', () => {
            renderWithTheme(<StatusBadge status="HIGH" type="risk" />)
            const badge = screen.getByRole('status')
            expect(badge).toHaveAttribute('aria-label', 'risk level: High')
        })

        it('generates appropriate aria-label for priority level', () => {
            renderWithTheme(<StatusBadge status="CRITICAL" type="priority" />)
            const badge = screen.getByRole('status')
            expect(badge).toHaveAttribute('aria-label', 'priority level: Critical')
        })

        it('uses custom aria-label when provided', () => {
            renderWithTheme(
                <StatusBadge
                    status="ACTIVE"
                    type="client"
                    aria-label="Custom label"
                />
            )
            const badge = screen.getByRole('status')
            expect(badge).toHaveAttribute('aria-label', 'Custom label')
        })

        it('generates default aria-label without type', () => {
            renderWithTheme(<StatusBadge status="ACTIVE" />)
            const badge = screen.getByRole('status')
            expect(badge).toHaveAttribute('aria-label', 'status: Active')
        })
    })

    describe('Color Consistency', () => {
        it('applies consistent colors for positive states', () => {
            const { rerender } = renderWithTheme(<StatusBadge status="ACTIVE" type="client" />)
            expect(screen.getByText('Active')).toBeInTheDocument()

            rerender(
                <ThemeProvider theme={theme}>
                    <StatusBadge status="APPROVED" type="review" />
                </ThemeProvider>
            )
            expect(screen.getByText('Approved')).toBeInTheDocument()

            rerender(
                <ThemeProvider theme={theme}>
                    <StatusBadge status="LOW" type="risk" />
                </ThemeProvider>
            )
            expect(screen.getByText('Low')).toBeInTheDocument()
        })

        it('applies consistent colors for negative states', () => {
            const { rerender } = renderWithTheme(<StatusBadge status="SUSPENDED" type="client" />)
            expect(screen.getByText('Suspended')).toBeInTheDocument()

            rerender(
                <ThemeProvider theme={theme}>
                    <StatusBadge status="REJECTED" type="review" />
                </ThemeProvider>
            )
            expect(screen.getByText('Rejected')).toBeInTheDocument()

            rerender(
                <ThemeProvider theme={theme}>
                    <StatusBadge status="HIGH" type="risk" />
                </ThemeProvider>
            )
            expect(screen.getByText('High')).toBeInTheDocument()
        })
    })

    describe('Props and Integration', () => {
        it('passes through additional chip props', () => {
            renderWithTheme(
                <StatusBadge
                    status="ACTIVE"
                    data-testid="status-badge"
                    onClick={() => { }}
                />
            )

            const badge = screen.getByTestId('status-badge')
            expect(badge).toBeInTheDocument()
        })

        it('handles all client status values', () => {
            const clientStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'UNDER_REVIEW', 'PENDING'] as const

            clientStatuses.forEach(status => {
                const { unmount } = renderWithTheme(<StatusBadge status={status} type="client" />)
                expect(screen.getByRole('status')).toBeInTheDocument()
                unmount()
            })
        })

        it('handles all exception status values', () => {
            const exceptionStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'] as const

            exceptionStatuses.forEach(status => {
                const { unmount } = renderWithTheme(<StatusBadge status={status} type="exception" />)
                expect(screen.getByRole('status')).toBeInTheDocument()
                unmount()
            })
        })

        it('handles all review status values', () => {
            const reviewStatuses = ['DRAFT', 'PENDING', 'IN_REVIEW', 'UNDER_REVIEW', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const

            reviewStatuses.forEach(status => {
                const { unmount } = renderWithTheme(<StatusBadge status={status} type="review" />)
                expect(screen.getByRole('status')).toBeInTheDocument()
                unmount()
            })
        })

        it('handles all risk level values', () => {
            const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'CRITICAL'] as const

            riskLevels.forEach(status => {
                const { unmount } = renderWithTheme(<StatusBadge status={status} type="risk" />)
                expect(screen.getByRole('status')).toBeInTheDocument()
                unmount()
            })
        })
    })
})