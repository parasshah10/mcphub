import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Content from '@/components/layout/Content';

const MainLayout: React.FC = () => {
  // Control sidebar state - closed by default on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Detect screen size and adjust sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        setSidebarOpen(false); // Reset mobile menu state on desktop
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <Header onToggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={closeMobileSidebar}
          />
        )}

        {/* Sidebar - responsive behavior */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-40 md:z-0
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${!sidebarCollapsed ? 'w-64' : 'w-16'}
        `}>
          <Sidebar collapsed={sidebarCollapsed} onNavigate={closeMobileSidebar} />
        </div>
        
        {/* Main content */}
        <Content>
          <Outlet />
        </Content>
      </div>
    </div>
  );
};

export default MainLayout;