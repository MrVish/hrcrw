import React from 'react'
import { Navigation } from './Navigation'
import { ResponsiveLayout } from './ResponsiveLayout'
import type { ReactNode } from 'react'
import './ResponsiveLayout.css'

interface LayoutProps {
    children: ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <ResponsiveLayout
            sidebar={<Navigation />}
            className="app-layout"
        >
            <div className="content-wrapper">
                {children}
            </div>
        </ResponsiveLayout>
    )
}