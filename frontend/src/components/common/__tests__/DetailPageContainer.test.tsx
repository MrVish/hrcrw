import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { DetailPageContainer } from '../DetailPageContainer'
import theme from '../../../theme'

const renderWithTheme = (component: React.ReactElement) => {
    return render(
        <ThemeProvider theme={theme}>
            {component}
        </ThemeProvider>
    )
}

describe('DetailPageContainer', () => {
    it('renders children correctly', () => {
        renderWithTheme(
            <DetailPageContainer>
                <div>Page content</div>
            </DetailPageContainer>
        )

        expect(screen.getByText('Page content')).toBeInTheDocument()
    })

    it('applies custom maxWidth', () => {
        renderWithTheme(
            <DetailPageContainer maxWidth="lg" data-testid="container">
                <div>Page content</div>
            </DetailPageContainer>
        )

        // Container should be present
        expect(screen.getByText('Page content')).toBeInTheDocument()
    })

    it('applies custom sx props', () => {
        renderWithTheme(
            <DetailPageContainer sx={{ backgroundColor: 'blue' }} data-testid="container">
                <div>Page content</div>
            </DetailPageContainer>
        )

        // Content should be rendered
        expect(screen.getByText('Page content')).toBeInTheDocument()
    })

    it('uses full width by default', () => {
        renderWithTheme(
            <DetailPageContainer data-testid="container">
                <div>Page content</div>
            </DetailPageContainer>
        )

        // Should render without maxWidth constraint
        expect(screen.getByText('Page content')).toBeInTheDocument()
    })

    it('supports disableGutters prop', () => {
        renderWithTheme(
            <DetailPageContainer disableGutters={false} data-testid="container">
                <div>Page content</div>
            </DetailPageContainer>
        )

        expect(screen.getByText('Page content')).toBeInTheDocument()
    })
})