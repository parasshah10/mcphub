import React, { ReactNode } from 'react';

interface ContentProps {
  children: ReactNode;
}

const Content: React.FC<ContentProps> = ({ children }) => {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 sm:px-6">
        {children}
      </div>
    </main>
  );
};

export default Content;