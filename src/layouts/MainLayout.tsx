import React from 'react';
import { UserAccount } from '../types';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNavigation } from './MobileNavigation';

interface MainLayoutProps {
    children: React.ReactNode;
    user: UserAccount;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
    onSettingsClick: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    canAccessClients: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    user,
    activeTab,
    onTabChange,
    onLogout,
    onSettingsClick,
    searchQuery,
    onSearchChange,
    canAccessClients
}) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex text-slate-900 overflow-x-hidden relative">
            <Sidebar
                user={user}
                activeTab={activeTab}
                onTabChange={onTabChange}
                onLogout={onLogout}
                canAccessClients={canAccessClients}
            />

            <main className="flex-1 flex flex-col min-h-screen lg:ml-64 transition-all duration-300">
                <Header
                    user={user}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                    onLogout={onLogout}
                    onSettingsClick={onSettingsClick}
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                />

                <section className="p-2 sm:p-6 lg:p-10 flex-1 max-w-7xl mx-auto w-full pb-32 lg:pb-10">
                    {children}
                </section>
            </main>

            <MobileNavigation
                activeTab={activeTab}
                onTabChange={onTabChange}
            />
        </div>
    );
};
