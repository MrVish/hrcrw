import React from 'react'
import { Box } from '@mui/material'
import { ModernLayout } from '../components/layout/ModernLayout'
import { UserManagement } from '../components/admin'

export const UserManagementPage: React.FC = () => {
    return (
        <ModernLayout title="User Management">
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    p: { xs: 2, sm: 3, md: 3, lg: 4, xl: 5 },
                }}
            >
                <UserManagement />
            </Box>
        </ModernLayout>
    )
}