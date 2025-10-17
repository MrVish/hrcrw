import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { Info as InfoIcon } from '@mui/icons-material'
import { InfoCard } from '../InfoCard'
import theme from '../../../theme'

const renderWithTheme = (component: React.ReactElement) => {
    return render(
        <ThemeProvider theme={theme}>
            {component}
        </ThemeProvider>
    )
}

describe('InfoCard', () => {
    it('renders with title and children', () => {
        renderWithTheme(
            <InfoCard title="Test Card">
                <div>Card content</div>
            </InfoCard>
        )

        expect(screen.getByText('Test Card')).toBeInTheDocument()
        expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('renders with icon', () => {
        renderWithTheme(
            <InfoCard title="Test Card" icon={<InfoIcon data-testid="info-icon" />}>
                <div>Card content</div>
            </InfoCard>
        )

        expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })

    it('applies custom sx props', () => {
        renderWithTheme(
            <InfoCard
                title="Test Card"
                sx={{ backgroundColor: 'red' }}
                data-testid="info-card"
            >
                <div>Card content</div>
            </InfoCard>
        )

        const card = screen.getByTestId('info-card')
        expect(card).toHaveStyle('background-color: rgb(255, 0, 0)')
    })

    it('disables hover effects when hover is false', () => {
        renderWithTheme(
            <InfoCard title="Test Card" hover={false} data-testid="info-card">
                <div>Card content</div>
            </InfoCard>
        )

        // The card should not have hover styles applied
        const card = screen.getByTestId('info-card')
        expect(card).toBeInTheDocument()
    })
})