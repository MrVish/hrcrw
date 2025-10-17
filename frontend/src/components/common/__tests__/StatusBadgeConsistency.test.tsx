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

describe('StatusBadge Visual Consistency', () => {
    describe('Color Consistency Tests', () => {
        describe('Green for Positive States', () => {
            test('should use green for ACTIVE client status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="ACTIVE" type="client" data-testid="active-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('active-badge')
                const styles = window.getComputedStyle(badge)

                // Should use success color (green)
                expect(styles.borderColor).toBe(theme.palette.success.main)
            })

            test('should use green for RESOLVED exception status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="RESOLVED" type="exception" data-testid="resolved-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('resolved-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.success.main)
            })

            test('should use green for APPROVED review status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="APPROVED" type="review" data-testid="approved-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('approved-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.success.main)
            })

            test('should use green for LOW risk level', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="LOW" type="risk" data-testid="low-risk-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('low-risk-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.success.main)
            })

            test('should use green for LOW priority', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="LOW" type="priority" data-testid="low-priority-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('low-priority-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.success.main)
            })
        })

        describe('Red for Negative States', () => {
            test('should use red for SUSPENDED client status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="SUSPENDED" type="client" data-testid="suspended-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('suspended-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.main)
            })

            test('should use red for OPEN exception status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="OPEN" type="exception" data-testid="open-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('open-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.main)
            })

            test('should use red for REJECTED review status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="REJECTED" type="review" data-testid="rejected-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('rejected-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.main)
            })

            test('should use red for HIGH risk level', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="HIGH" type="risk" data-testid="high-risk-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('high-risk-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.main)
            })

            test('should use red for HIGH priority', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="HIGH" type="priority" data-testid="high-priority-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('high-priority-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.main)
            })
        })

        describe('Orange for Warning States', () => {
            test('should use orange for UNDER_REVIEW client status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="UNDER_REVIEW" type="client" data-testid="under-review-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('under-review-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.warning.main)
            })

            test('should use orange for IN_PROGRESS exception status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="IN_PROGRESS" type="exception" data-testid="in-progress-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('in-progress-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.warning.main)
            })

            test('should use orange for IN_REVIEW review status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="IN_REVIEW" type="review" data-testid="in-review-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('in-review-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.warning.main)
            })

            test('should use orange for MEDIUM risk level', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="MEDIUM" type="risk" data-testid="medium-risk-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('medium-risk-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.warning.main)
            })

            test('should use orange for MEDIUM priority', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="MEDIUM" type="priority" data-testid="medium-priority-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('medium-priority-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.warning.main)
            })
        })

        describe('Gray for Neutral/Inactive States', () => {
            test('should use gray for INACTIVE client status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="INACTIVE" type="client" data-testid="inactive-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('inactive-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.grey[500])
            })

            test('should use gray for CLOSED exception status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="CLOSED" type="exception" data-testid="closed-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('closed-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.grey[500])
            })

            test('should use gray for DRAFT review status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="DRAFT" type="review" data-testid="draft-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('draft-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.grey[500])
            })
        })

        describe('Blue for Informational States', () => {
            test('should use blue for PENDING client status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="PENDING" type="client" data-testid="pending-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('pending-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.info.main)
            })

            test('should use blue for SUBMITTED review status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="SUBMITTED" type="review" data-testid="submitted-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('submitted-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.info.main)
            })
        })

        describe('Dark Red for Critical States', () => {
            test('should use dark red for ESCALATED exception status', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="ESCALATED" type="exception" data-testid="escalated-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('escalated-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.dark)
            })

            test('should use dark red for CRITICAL risk level', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="CRITICAL" type="risk" data-testid="critical-risk-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('critical-risk-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.dark)
            })

            test('should use dark red for CRITICAL priority', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="CRITICAL" type="priority" data-testid="critical-priority-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('critical-priority-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.dark)
            })

            test('should use dark red for VERY_HIGH risk level', () => {
                render(
                    <TestWrapper>
                        <StatusBadge status="VERY_HIGH" type="risk" data-testid="very-high-risk-badge" />
                    </TestWrapper>
                )

                const badge = screen.getByTestId('very-high-risk-badge')
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(theme.palette.error.dark)
            })
        })
    })

    describe('Risk Level Color Intuition Tests', () => {
        test('risk levels should follow intuitive color progression', () => {
            const riskLevels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'CRITICAL']
            const expectedColors = [
                theme.palette.success.main,  // LOW - Green
                theme.palette.warning.main,  // MEDIUM - Orange
                theme.palette.error.main,    // HIGH - Red
                theme.palette.error.dark,    // VERY_HIGH - Dark Red
                theme.palette.error.dark     // CRITICAL - Dark Red
            ]

            riskLevels.forEach((level, index) => {
                render(
                    <TestWrapper>
                        <StatusBadge
                            status={level}
                            type="risk"
                            data-testid={`risk-${level.toLowerCase()}`}
                        />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`risk-${level.toLowerCase()}`)
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(expectedColors[index])
            })
        })

        test('priority levels should follow same color scheme as risk levels', () => {
            const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
            const expectedColors = [
                theme.palette.success.main,  // LOW - Green
                theme.palette.warning.main,  // MEDIUM - Orange
                theme.palette.error.main,    // HIGH - Red
                theme.palette.error.dark     // CRITICAL - Dark Red
            ]

            priorities.forEach((priority, index) => {
                render(
                    <TestWrapper>
                        <StatusBadge
                            status={priority}
                            type="priority"
                            data-testid={`priority-${priority.toLowerCase()}`}
                        />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`priority-${priority.toLowerCase()}`)
                const styles = window.getComputedStyle(badge)

                expect(styles.borderColor).toBe(expectedColors[index])
            })
        })
    })

    describe('Visual Styling Consistency Tests', () => {
        test('all badges should have consistent border radius', () => {
            const statuses = [
                { status: 'ACTIVE', type: 'client' },
                { status: 'OPEN', type: 'exception' },
                { status: 'APPROVED', type: 'review' },
                { status: 'HIGH', type: 'risk' },
                { status: 'MEDIUM', type: 'priority' }
            ] as const

            statuses.forEach(({ status, type }, index) => {
                render(
                    <TestWrapper>
                        <StatusBadge
                            status={status}
                            type={type}
                            data-testid={`badge-${index}`}
                        />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`badge-${index}`)
                const styles = window.getComputedStyle(badge)

                expect(styles.borderRadius).toBe('6px')
            })
        })

        test('all badges should have consistent font weight', () => {
            const statuses = [
                { status: 'ACTIVE', type: 'client' },
                { status: 'OPEN', type: 'exception' },
                { status: 'APPROVED', type: 'review' }
            ] as const

            statuses.forEach(({ status, type }, index) => {
                render(
                    <TestWrapper>
                        <StatusBadge
                            status={status}
                            type={type}
                            data-testid={`font-badge-${index}`}
                        />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`font-badge-${index}`)
                const styles = window.getComputedStyle(badge)

                expect(styles.fontWeight).toBe('500')
            })
        })

        test('all badges should have consistent height', () => {
            const statuses = [
                { status: 'ACTIVE', type: 'client' },
                { status: 'OPEN', type: 'exception' },
                { status: 'APPROVED', type: 'review' }
            ] as const

            statuses.forEach(({ status, type }, index) => {
                render(
                    <TestWrapper>
                        <StatusBadge
                            status={status}
                            type={type}
                            data-testid={`height-badge-${index}`}
                        />
                    </TestWrapper>
                )

                const badge = screen.getByTestId(`height-badge-${index}`)
                const styles = window.getComputedStyle(badge)

                expect(styles.height).toBe('24px')
            })
        })

        test('filled variant should have consistent background colors', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        variant="filled"
                        data-testid="filled-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('filled-badge')
            const styles = window.getComputedStyle(badge)

            // Should have background color with opacity
            expect(styles.backgroundColor).toContain(theme.palette.success.main.replace('#', ''))
        })

        test('outlined variant should have transparent background', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        variant="outlined"
                        data-testid="outlined-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('outlined-badge')
            const styles = window.getComputedStyle(badge)

            expect(styles.backgroundColor).toBe('transparent')
        })
    })

    describe('Accessibility Compliance Tests', () => {
        test('all badges should have proper ARIA labels', () => {
            const testCases = [
                { status: 'ACTIVE', type: 'client', expectedLabel: 'client status: Active' },
                { status: 'OPEN', type: 'exception', expectedLabel: 'exception status: Open' },
                { status: 'HIGH', type: 'risk', expectedLabel: 'risk level: High' },
                { status: 'MEDIUM', type: 'priority', expectedLabel: 'priority level: Medium' }
            ] as const

            testCases.forEach(({ status, type, expectedLabel }) => {
                render(
                    <TestWrapper>
                        <StatusBadge status={status} type={type} />
                    </TestWrapper>
                )

                const badge = screen.getByLabelText(expectedLabel)
                expect(badge).toBeInTheDocument()
            })
        })

        test('badges should have proper role attribute', () => {
            render(
                <TestWrapper>
                    <StatusBadge status="ACTIVE" type="client" data-testid="role-badge" />
                </TestWrapper>
            )

            const badge = screen.getByTestId('role-badge')
            expect(badge).toHaveAttribute('role', 'status')
        })

        test('custom ARIA labels should be respected', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        aria-label="Custom client status label"
                    />
                </TestWrapper>
            )

            const badge = screen.getByLabelText('Custom client status label')
            expect(badge).toBeInTheDocument()
        })
    })

    describe('Icon Consistency Tests', () => {
        test('should show icons when showIcon is true', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        showIcon={true}
                        data-testid="icon-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('icon-badge')
            const icon = badge.querySelector('.MuiChip-icon')
            expect(icon).toBeInTheDocument()
        })

        test('should hide icons when showIcon is false', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        showIcon={false}
                        data-testid="no-icon-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('no-icon-badge')
            const icon = badge.querySelector('.MuiChip-icon')
            expect(icon).not.toBeInTheDocument()
        })

        test('icons should have consistent color with text', () => {
            render(
                <TestWrapper>
                    <StatusBadge
                        status="ACTIVE"
                        type="client"
                        showIcon={true}
                        data-testid="icon-color-badge"
                    />
                </TestWrapper>
            )

            const badge = screen.getByTestId('icon-color-badge')
            const icon = badge.querySelector('.MuiChip-icon')
            const styles = window.getComputedStyle(icon!)

            expect(styles.color).toBe(theme.palette.success.main)
        })
    })

    describe('Text Formatting Consistency Tests', () => {
        test('should format status text consistently', () => {
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

        test('should handle single word statuses correctly', () => {
            const testCases = [
                { status: 'ACTIVE', expected: 'Active' },
                { status: 'OPEN', expected: 'Open' },
                { status: 'HIGH', expected: 'High' }
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
})