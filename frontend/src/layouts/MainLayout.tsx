import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Content from '@/components/layout/Content';
import { EmbeddingSyncProvider } from '@/contexts/EmbeddingSyncContext';

const MainLayout: React.FC = () => {
  // Collapse sidebar on small screens by default, expand on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <EmbeddingSyncProvider>
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        {/* 顶部导航 */}
        <Header onToggleSidebar={toggleSidebar} />

        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile backdrop overlay */}
          {!sidebarCollapsed && (
            <div
              onClick={() => setSidebarCollapsed(true)}
              className="fixed inset-0 bg-black/40 z-20 md:hidden cursor-pointer"
            />
          )}

          {/* 侧边导航 */}
          <Sidebar collapsed={sidebarCollapsed} />

          {/* 主内容区域 */}
          <Content>
            <Outlet />
          </Content>
        </div>
      </div>
    </EmbeddingSyncProvider>
  );
};

export default MainLayout;