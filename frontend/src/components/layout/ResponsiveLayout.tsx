import React, { useState, useEffect } from 'react'
import { useAccessibleModal } from '../../hooks/useAccessibility'

interface ResponsiveLayoutProps {
    children: React.ReactNode
    sidebar?: React.ReactNode
    header?: React.ReactNode
    className?: string
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
    children,
    sidebar,
    header,
    className = ''
}) => {
    const [isMobile, setIsMobile] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { modalProps } = useAccessibleModal(sidebarOpen && isMobile)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        // Close sidebar when switching to desktop
        if (!isMobile) {
            setSidebarOpen(false)
        }
    }, [isMobile])

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen)
    }

    return (
        <div className={`responsive-layout ${className}`}>
            {header && (
                <header className="responsive-layout__header">
                    {isMobile && sidebar && (
                        <button
                            className="responsive-layout__menu-toggle"
                            onClick={toggleSidebar}
                            aria-label="Toggle navigation menu"
                            aria-expanded={sidebarOpen}
                        >
                            <span className="responsive-layout__hamburger">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </button>
                    )}
                    {header}
                </header>
            )}

            <div className="responsive-layout__body">
                {sidebar && (
                    <>
                        {isMobile ? (
                            <>
                                {/* Mobile sidebar overlay */}
                                {sidebarOpen && (
                                    <div
                                        className="responsive-layout__overlay"
                                        onClick={() => setSidebarOpen(false)}
                                        aria-hidden="true"
                                    />
                                )}

                                {/* Mobile sidebar */}
                                <aside
                                    {...modalProps}
                                    className={`responsive-layout__sidebar responsive-layout__sidebar--mobile ${sidebarOpen ? 'responsive-layout__sidebar--open' : ''
                                        }`}
                                    aria-label="Navigation menu"
                                >
                                    <div className="responsive-layout__sidebar-header">
                                        <button
                                            className="responsive-layout__close-button"
                                            onClick={() => setSidebarOpen(false)}
                                            aria-label="Close navigation menu"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="responsive-layout__sidebar-content">
                                        {sidebar}
                                    </div>
                                </aside>
                            </>
                        ) : (
                            /* Desktop sidebar */
                            <aside
                                className="responsive-layout__sidebar responsive-layout__sidebar--desktop"
                                aria-label="Navigation menu"
                            >
                                {sidebar}
                            </aside>
                        )}
                    </>
                )}

                <main className="responsive-layout__main">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default ResponsiveLayout