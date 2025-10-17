import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ExceptionDisplay from '../ExceptionDisplay'
import type { ExceptionDisplayData } from '../ExceptionDisplay'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'

describe('ExceptionDisplay', () => {
    const mockExceptions: ExceptionDisplayData[] = [
        {
            id: 1,
            type: 'kyc_non_compliance',
            description: 'Customer has incomplete KYC documentation',
            status: 'open',
            created_at: '2024-01-15T10:00:00Z',
            created_by: 1,
            creator_name: 'John Doe'
        },
        {
            id: 2,
            type: 'dormant_funded_ufaa',
            description: 'Account is dormant with funds',
            status: 'resolved',
            created_at: '2024-01-10T09:00:00Z',
            created_by: 2,
            creator_name: 'Jane Smith',
            resolved_at: '2024-01-12T14:30:00Z',
            resolved_by: 3,
            resolver_name: 'Bob Johnson',
            resolution_notes: 'Customer contacted and account reactivated'
        }
    ]

    it('renders no exceptions message when list is empty', () => {
        render(<ExceptionDisplay exceptions={[]} />)

        expect(screen.getByText(/No exceptions raised for this review/i)).toBeInTheDocument()
    })

    it('renders exception list with correct count', () => {
        render(<ExceptionDisplay exceptions={mockExceptions} />)

        expect(screen.getByText(/Review Exceptions \(2\)/i)).toBeInTheDocument()
    })

    it('displays exception details correctly', () => {
        render(<ExceptionDisplay exceptions={mockExceptions} />)

        // Check first exception
        expect(screen.getByText('KYC Non-Compliance')).toBeInTheDocument()
        expect(screen.getByText('Customer has incomplete KYC documentation')).toBeInTheDocument()
        expect(screen.getByText('Exception #1')).toBeInTheDocument()
        expect(screen.getByText('Created by John Doe')).toBeInTheDocument()

        // Check second exception
        expect(screen.getByText('Dormant Funded Account (UFAA)')).toBeInTheDocument()
        expect(screen.getByText('Account is dormant with funds')).toBeInTheDocument()
        expect(screen.getByText('Exception #2')).toBeInTheDocument()
        expect(screen.getByText('Created by Jane Smith')).toBeInTheDocument()
    })

    it('shows resolution information for resolved exceptions', () => {
        render(<ExceptionDisplay exceptions={mockExceptions} />)

        expect(screen.getByText('Resolved by Bob Johnson')).toBeInTheDocument()
        expect(screen.getByText('Customer contacted and account reactivated')).toBeInTheDocument()
    })

    it('handles exception click when onExceptionClick is provided', () => {
        const onExceptionClick = vi.fn()
        render(<ExceptionDisplay exceptions={mockExceptions} onExceptionClick={onExceptionClick} />)

        const firstException = screen.getByText('KYC Non-Compliance').closest('.exception-card')
        fireEvent.click(firstException!)

        expect(onExceptionClick).toHaveBeenCalledWith(mockExceptions[0])
    })

    it('shows action buttons when showActions is true', () => {
        render(<ExceptionDisplay exceptions={mockExceptions} showActions={true} onExceptionClick={vi.fn()} />)

        const actionButtons = screen.getAllByText('View Details')
        expect(actionButtons).toHaveLength(2)
    })

    it('displays correct status indicators', () => {
        render(<ExceptionDisplay exceptions={mockExceptions} />)

        expect(screen.getByText('open')).toBeInTheDocument()
        expect(screen.getByText('resolved')).toBeInTheDocument()
    })

    it('formats dates correctly', () => {
        render(<ExceptionDisplay exceptions={mockExceptions} />)

        // Should show formatted dates (exact format may vary based on locale)
        expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()
        expect(screen.getByText(/Jan 10, 2024/)).toBeInTheDocument()
    })

    it('handles different exception types correctly', () => {
        const differentTypeExceptions: ExceptionDisplayData[] = [
            {
                id: 3,
                type: 'dormant_overdrawn_exit',
                description: 'Overdrawn dormant account',
                status: 'in_progress',
                created_at: '2024-01-15T10:00:00Z',
                created_by: 1,
                creator_name: 'John Doe'
            }
        ]

        render(<ExceptionDisplay exceptions={differentTypeExceptions} />)

        expect(screen.getByText('Dormant Overdrawn Account (Exit)')).toBeInTheDocument()
        expect(screen.getByText('in progress')).toBeInTheDocument()
    })

    it('handles missing optional fields gracefully', () => {
        const minimalException: ExceptionDisplayData[] = [
            {
                id: 4,
                type: 'kyc_non_compliance',
                description: 'Minimal exception data',
                status: 'open',
                created_at: '2024-01-15T10:00:00Z',
                created_by: 1
                // Missing creator_name and other optional fields
            }
        ]

        render(<ExceptionDisplay exceptions={minimalException} />)

        expect(screen.getByText('Created by User 1')).toBeInTheDocument()
        expect(screen.getByText('Minimal exception data')).toBeInTheDocument()
    })
})