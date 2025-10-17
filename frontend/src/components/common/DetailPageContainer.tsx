import React from 'react'
import { Box } from '@mui/material'

interface DetailPageContainerProps {
    children: React.ReactNode
    className?: string
}

export const DetailPageContainer: React.FC<DetailPageContainerProps> = ({
    children,
    className = '',
}) => {
    return (
        <Box
            className={className}
            sx={{
                width: '100%',
                height: '100%',
                p: { xs: 2, sm: 3, lg: 4, xl: 6 },
                maxWidth: 'none',
                backgroundColor: 'background.default',
                minHeight: '100vh',
            }}
        >
            {children}
        </Box>
    )
}

export default DetailPageContainer