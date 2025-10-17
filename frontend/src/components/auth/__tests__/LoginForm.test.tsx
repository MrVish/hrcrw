import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'

// Mock the auth context
const mockLogin = vi.fn()
const mockUseAuth = vi.fn(() => ({
    login: mockLogin,
    isLoading: false,
}))

vi.mock('../../../contexts', () => ({
    useAuth: () => mockUseAuth(),
}))

const renderWithRouter = (component: React.ReactElement) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    )
}

describe('LoginForm', () => {
    const user = userEvent.setup()

    beforeEach(() => {
        vi.clearAllMocks()
        mockUseAuth.mockReturnValue({
            login: mockLogin,
            isLoading: false,
        })
    })

    it('renders login form with all required fields', () => {
        renderWithRouter(<LoginForm />)

        expect(screen.getByText('High Risk Client Review System')).toBeInTheDocument()
        expect(screen.getByText('Please sign in to continue')).toBeInTheDocument()
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('allows user to type in form fields', async () => {
        renderWithRouter(<LoginForm />)

        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
        const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

        await user.type(emailInput, 'test@example.com')
        await user.type(passwordInput, 'password123')

        expect(emailInput.value).toBe('test@example.com')
        expect(passwordInput.value).toBe('password123')
    })

    it('calls login function when form is submitted with valid data', async () => {
        renderWithRouter(<LoginForm />)

        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { name: /sign in/i })

        await user.type(emailInput, 'test@example.com')
        await user.type(passwordInput, 'password123')
        await user.click(submitButton)

        expect(mockLogin).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
        })
    })

    it('shows loading state during authentication', () => {
        mockUseAuth.mockReturnValue({
            login: mockLogin,
            isLoading: true,
        })

        renderWithRouter(<LoginForm />)

        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
})