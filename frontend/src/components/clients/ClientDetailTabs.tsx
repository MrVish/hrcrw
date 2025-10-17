import React from 'react'
import {
    Box,
    Tabs,
    Tab,
    Badge,
    useTheme,
    useMediaQuery,
} from '@mui/material'
import {
    Dashboard,
    Assignment,
    Description,
} from '@mui/icons-material'

export type ClientTabType = 'overview' | 'reviews' | 'documents'

interface ClientDetailTabsProps {
    activeTab: ClientTabType
    onTabChange: (tab: ClientTabType) => void
    reviewCount: number
}

export const ClientDetailTabs: React.FC<ClientDetailTabsProps> = ({
    activeTab,
    onTabChange,
    reviewCount,
}) => {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

    const handleTabChange = (_event: React.SyntheticEvent, newValue: ClientTabType) => {
        onTabChange(newValue)
    }

    const tabsData = [
        {
            value: 'overview' as const,
            label: 'Overview',
            icon: <Dashboard />,
        },
        {
            value: 'reviews' as const,
            label: 'Reviews',
            icon: <Assignment />,
            badge: reviewCount,
        },
        {
            value: 'documents' as const,
            label: 'Documents',
            icon: <Description />,
        },
    ]

    return (
        <Box
            sx={{
                borderBottom: 1,
                borderColor: 'divider',
                mb: 3,
                backgroundColor: 'background.paper',
                borderRadius: '12px 12px 0 0',
                overflow: 'hidden',
            }}
        >
            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant={isMobile ? 'fullWidth' : 'standard'}
                aria-label="Client detail sections"
                sx={{
                    '& .MuiTabs-indicator': {
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                        background: theme.palette.primary.main,
                    },
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '1rem',
                        minHeight: 64,
                        color: theme.palette.text.secondary,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            color: theme.palette.primary.main,
                            backgroundColor: theme.palette.primary.main + '08',
                        },
                        '&.Mui-selected': {
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                        },
                    },
                }}
            >
                {tabsData.map((tab) => (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        id={`${tab.value}-tab`}
                        aria-controls={`${tab.value}-tabpanel`}
                        aria-label={
                            tab.badge !== undefined && tab.badge > 0
                                ? `${tab.label} (${tab.badge} items)`
                                : tab.label
                        }
                        label={
                            tab.badge !== undefined && tab.badge > 0 ? (
                                <Badge
                                    badgeContent={tab.badge}
                                    color="primary"
                                    aria-label={`${tab.badge} ${tab.label.toLowerCase()}`}
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            fontSize: '0.75rem',
                                            height: '20px',
                                            minWidth: '20px',
                                            borderRadius: '10px',
                                            fontWeight: 600,
                                        },
                                    }}
                                >
                                    {tab.label}
                                </Badge>
                            ) : (
                                tab.label
                            )
                        }
                        icon={tab.icon}
                        iconPosition="start"
                        sx={{
                            '& .MuiTab-iconWrapper': {
                                marginRight: 1,
                                marginBottom: 0,
                            },
                        }}
                    />
                ))}
            </Tabs>
        </Box>
    )
}

export default ClientDetailTabs