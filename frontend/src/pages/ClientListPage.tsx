import React, { useState } from 'react'
import { Box } from '@mui/material'
import { ModernLayout } from '../components/layout/ModernLayout'
import { ClientList, ClientDetail } from '../components'

interface Client {
    client_id: string
    name: string
    risk_level: 'Low' | 'Medium' | 'High'
    country: string
    last_review_date: string | null
    status: 'Active' | 'Inactive' | 'Under Review'
    review_count: number
    pending_reviews: number
}

export const ClientListPage: React.FC = () => {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)

    const handleClientSelect = (client: Client) => {
        setSelectedClient(client)
    }

    const handleBackToList = () => {
        setSelectedClient(null)
    }

    return (
        <ModernLayout title={selectedClient ? `Client: ${selectedClient.name}` : 'Client Management'}>
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    p: { xs: 2, sm: 3, lg: 4, xl: 6 },
                    maxWidth: 'none',
                }}
            >
                {selectedClient ? (
                    <ClientDetail
                        clientId={selectedClient.client_id}
                        onBack={handleBackToList}
                    />
                ) : (
                    <ClientList onClientSelect={handleClientSelect} />
                )}
            </Box>
        </ModernLayout>
    )
}