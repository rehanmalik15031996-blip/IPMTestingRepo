import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    return (
        <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const ctx = useContext(SidebarContext);
    return ctx || { mobileOpen: false, setMobileOpen: () => {} };
}
