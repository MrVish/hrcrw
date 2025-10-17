import React from 'react'
import {
    Card,
    CardContent,
    Typography,
    Stack,
    useTheme,
} from '@mui/material'

interface InfoCardProps {
    title: string
    children: React.ReactNode
    icon?: React.ReactNode
    elevation?: number
    hover?: boolean
}

export const InfoCard: React.FC<InfoCardProps> = ({
    title,
    children,
    icon,
    elevation = 0,
    hover = true,
}) => {
    const theme = useTheme()

    return (
        <Card
            elevation={elevation}
            sx={{
                height: '100%',
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 3,
                transition: 'all 0.2s ease-in-out',
                ...(hover && {
                    '&:hover': {
                        borderColor: theme.palette.grey[300],
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-2px)',
                    },
                }),
            }}
        >
            <CardContent sx={{ p: { xs: 3, lg: 4, xl: 5 } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                    {icon && (
                        <div style={{ color: theme.palette.primary.main }}>
                            {icon}
                        </div>
                    )}
                    <Typography variant="h6" fontWeight={600}>
                        {title}
                    </Typography>
                </Stack>
                {children}
            </CardContent>
        </Card>
    )
}

export default InfoCard