import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ResponsiveLayout from '../ResponsiveLayout'

// Mock useAccessibleModal hook
jest.mock('../../../hooks/useAccessibility', () => ({
    useAccessibleModal: jest.fn(() => ({
        modalProps: {
            ref: { current: null },
            role: 'dialog',
            'aria-modal': true,
            tabIndex: -1,
        },
    })),
}))

describe('ResponsiveLayout', () => {
    // Mock window.innerWidth
    const mockInnerWidth = (width: number) => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
        })
    }

    beforeEach(() => {
        // Reset to desktop size
        mockInnerWidth(1024)
    })

    it('renders children correctly', () => {
        render(
            <ResponsiveLayout>
                <div>Main content</div>
            </ResponsiveLayout>
        )

        expect(screen.getByText('Main content')).toBeInTheDocument()
    })

    it('renders header when provided', () => {
        render(
            <ResponsiveLayout header={<div>Header content</div>}>
                <div>Main content</div>
            </ResponsiveLayout>
        )

        expect(screen.getByText('Header content')).toBeInTheDocument()
    })

    it('renders sidebar when provided on desktop', () => {
        render(
            <ResponsiveLayout sidebar={<div>Sidebar content</div>}>
                <div>Main content</div>
            </ResponsiveLayout>
        )

        expect(screen.getByText('Sidebar content')).toBeInTheDocument()
        expect(screen.getByLabelText('Navigation menu')).toHaveClass('responsive-layout__sidebar--desktop')
    })

    it('shows menu toggle button on mobile when sidebar is provided', () => {
        mockInnerWidth(600)

        render(
            <ResponsiveLayout
                header={<div>Header</div>}
                sidebar={<div>Sidebar content</div>}
            >
                <div>Main content</div>
            </ResponsiveLayout>
        )

        // Trigger resize event to update mobile state
        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        expect(screen.getByLabelText('Toggle navigation menu')).toBeInTheDocument()
    })

    it('does not show menu toggle when no sidebar provided', () => {
        mockInnerWidth(600)

        render(
            <ResponsiveLayout header={<div>Header</div>}>
                <div>Main content</div>
            </ResponsiveLayout>
        )

        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        expect(screen.queryByLabelText('Toggle navigation menu')).not.toBeInTheDocument()
    })

    it('toggles mobile sidebar when menu button is clicked', () => {
        mockInnerWidth(600)

        render(
            <ResponsiveLayout
                header={<div>Header</div>}
                sidebar={<div>Sidebar content</div>}
            >
                <div>Main content</div>
            </ResponsiveLayout>
        )

        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        const menuButton = screen.getByLabelText('Toggle navigation menu')

        // Initially closed
        expect(menuButton).toHaveAttribute('aria-expanded', 'false')

        // Open sidebar
        fireEvent.click(menuButton)
        expect(menuButton).toHaveAttribute('aria-expanded', 'true')

        // Close sidebar
        fireEvent.click(menuButton)
        expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('shows close button in mobile sidebar', () => {
        mockInnerWidth(600)

        render(
            <ResponsiveLayout
                header={<div>Header</div>}
                sidebar={<div>Sidebar content</div>}
            >
                <div>Main content</div>
            </ResponsiveLayout>
        )

        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        // Open sidebar
        const menuButton = screen.getByLabelText('Toggle navigation menu')
        fireEvent.click(menuButton)

        expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument()
    })

    it('closes mobile sidebar when close button is clicked', () => {
        mockInnerWidth(600)

        render(
            <ResponsiveLayout
                header={<div>Header</div>}
                sidebar={<div>Sidebar content</div>}
            >
                <div>Main content</div>
            </ResponsiveLayout>
        )

        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        // Open sidebar
        const menuButton = screen.getByLabelText('Toggle navigation menu')
        fireEvent.click(menuButton)

        // Close sidebar using close button
        const closeButton = screen.getByLabelText('Close navigation menu')
        fireEvent.click(closeButton)

        expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('closes mobile sidebar when overlay is clicked', () => {
        mockInnerWidth(600)

        render(
            <ResponsiveLayout
                header={<div>Header</div>}
                sidebar={<div>Sidebar content</div>}
            >
                <div>Main content</div>
            </ResponsiveLayout>
        )

        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        // Open sidebar
        const menuButton = screen.getByLabelText('Toggle navigation menu')
        fireEvent.click(menuButton)

        // Click overlay to close
        const overlay = document.querySelector('.responsive-layout__overlay')
        expect(overlay).toBeInTheDocument()

        fireEvent.click(overlay!)
        expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('applies custom className', () => {
        render(
            <ResponsiveLayout className="custom-layout">
                <div>Main content</div>
            </ResponsiveLayout>
        )

        expect(document.querySelector('.custom-layout')).toBeInTheDocument()
    })

    it('handles window resize events', () => {
        const { rerender } = render(
            <ResponsiveLayout sidebar={<div>Sidebar</div>}>
                <div>Main content</div>
            </ResponsiveLayout>
        )

        // Start on desktop
        expect(screen.queryByLabelText('Toggle navigation menu')).not.toBeInTheDocument()

        // Resize to mobile
        mockInnerWidth(600)
        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        // Re-render to trigger effect
        rerender(
            <ResponsiveLayout
                header={<div>Header</div>}
                sidebar={<div>Sidebar</div>}
            >
                <div>Main content</div>
            </ResponsiveLayout>
        )

        expect(screen.getByLabelText('Toggle navigation menu')).toBeInTheDocument()
    })

    it('closes sidebar when switching from mobile to desktop', () => {
        mockInnerWidth(600)

        render(
            <ResponsiveLayout
                header={<div>Header</div>}
                sidebar={<div>Sidebar content</div>}
            >
                <div>Main content</div>
            </ResponsiveLayout>
        )

        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        // Open mobile sidebar
        const menuButton = screen.getByLabelText('Toggle navigation menu')
        fireEvent.click(menuButton)
        expect(menuButton).toHaveAttribute('aria-expanded', 'true')

        // Resize to desktop
        mockInnerWidth(1024)
        act(() => {
            window.dispatchEvent(new Event('resize'))
        })

        // Sidebar should be closed
        expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('has proper accessibility attributes', () => {
        render(
            <ResponsiveLayout
                header={<div>Header</div>}
                sidebar={<div>Sidebar content</div>}
            >
                <div>Main content</div>
            </ResponsiveLayout>
        )

        const sidebar = screen.getByLabelText('Navigation menu')
        expect(sidebar).toHaveAttribute('aria-label', 'Navigation menu')

        const main = screen.getByRole('main')
        expect(main).toBeInTheDocument()
    })

    it('cleans up event listeners on unmount', () => {
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

        const { unmount } = render(
            <ResponsiveLayout>
                <div>Main content</div>
            </ResponsiveLayout>
        )

        unmount()

        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

        removeEventListenerSpy.mockRestore()
    })
})