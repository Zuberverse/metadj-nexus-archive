"use client"

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react'
import 'driver.js/dist/driver.css'
import { useUI } from '@/contexts/UIContext'
import { BREAKPOINTS } from '@/lib/app.constants'
import { GLOBAL_TOUR_STEPS } from '@/lib/tour/tour-config'
import type { Driver } from 'driver.js'

interface TourContextType {
    startTour: () => void
    isActive: boolean
}

const TourContext = createContext<TourContextType | null>(null)

export function TourProvider({ children }: { children: React.ReactNode }) {
    const driverRef = useRef<Driver | null>(null)
    const initPromiseRef = useRef<Promise<Driver> | null>(null)
    const {
        setWelcomeOpen,
        setInfoOpen,
        setMetaDjAiOpen,
        setActiveView,
        setLeftPanelTab,
        openLeftPanel,
    } = useUI()
    const [isActive, setIsActive] = useState(false)
    const openLeftPanelRef = useRef(openLeftPanel)
    const setLeftPanelTabRef = useRef(setLeftPanelTab)
    const setMetaDjAiOpenRef = useRef(setMetaDjAiOpen)

    // Keep refs in sync without re-initializing the driver instance.
    useEffect(() => {
        openLeftPanelRef.current = openLeftPanel
    }, [openLeftPanel])
    useEffect(() => {
        setLeftPanelTabRef.current = setLeftPanelTab
    }, [setLeftPanelTab])
    useEffect(() => {
        setMetaDjAiOpenRef.current = setMetaDjAiOpen
    }, [setMetaDjAiOpen])

    const ensureDriver = useCallback(async (): Promise<Driver> => {
        if (driverRef.current) return driverRef.current
        if (initPromiseRef.current) return initPromiseRef.current

        initPromiseRef.current = import('driver.js')
            .then(({ driver }) => {
                const instance = driver({
                    showProgress: true,
                    animate: true,
                    steps: GLOBAL_TOUR_STEPS,
                    onDestroyed: () => {
                        setIsActive(false)
                    },
                    onHighlightStarted: (element) => {
                        const id = element?.getAttribute('id')

                        if (id === 'tour-toggle-music' || id === 'tour-music-tabs') {
                            setLeftPanelTabRef.current?.('browse')
                            openLeftPanelRef.current?.()
                        }

                        if (id === 'tour-toggle-ai') {
                            setMetaDjAiOpenRef.current?.(true)
                        }
                    }
                })

                driverRef.current = instance
                return instance
            })
            .catch((error) => {
                initPromiseRef.current = null
                throw error
            })

        return initPromiseRef.current
    }, [])

    const startTour = useCallback(() => {
        // Close other overlays to ensure clean slate
        setWelcomeOpen(false)
        setInfoOpen(false)
        setMetaDjAiOpen(false)
        setActiveView('hub')
        setLeftPanelTab('browse')

        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.DESKTOP_PANELS

        if (!isDesktop) {
            // Interactive tour is desktop-only for now; open the User Guide instead.
            setTimeout(() => {
                setInfoOpen(true)
            }, 150)
            return
        }

        setIsActive(true)

        const driverPromise = ensureDriver()

        // Wait a brief moment for modals to close before starting
        setTimeout(() => {
            void driverPromise
                .then((instance) => instance.drive())
                .catch(() => {
                    setIsActive(false)
                    setInfoOpen(true)
                })
        }, 300)
    }, [setWelcomeOpen, setInfoOpen, setMetaDjAiOpen, setActiveView, setLeftPanelTab, ensureDriver])

    return (
        <TourContext.Provider value={{ startTour, isActive }}>
            {children}
        </TourContext.Provider>
    )
}

export function useTour() {
    const context = useContext(TourContext)
    if (!context) {
        throw new Error('useTour must be used within a TourProvider')
    }
    return context
}
