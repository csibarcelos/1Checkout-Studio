
import React, { Fragment } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { Dialog, Transition } from '@headlessui/react';
import { NAV_ITEMS, NAV_ITEMS_SUPER_ADMIN, AppLogoIcon, LogoutIcon, XMarkIcon } from '../../constants'; 
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { NavItemConfig } from '../../types';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const currentNavItems = isSuperAdmin ? NAV_ITEMS_SUPER_ADMIN : NAV_ITEMS;
  const dashboardPath = isSuperAdmin ? "/superadmin/dashboard" : "/dashboard";

  const navigationContent = (
    <>
      <div className="flex items-center justify-center h-20 border-b border-neutral-700 px-4">
        <NavLink to={dashboardPath} className="flex items-center text-neutral-100 group">
          <AppLogoIcon className="h-10 w-auto group-hover:opacity-90 transition-opacity" />
        </NavLink>
      </div>
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {currentNavItems.map((item: NavItemConfig) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === dashboardPath || item.href === '/dashboard'} 
            className={({ isActive }) =>
              `group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 relative
              ${isActive 
                ? 'bg-neutral-700/50 text-primary font-semibold' 
                : 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100'}
              ${item.soon ? 'opacity-50 cursor-not-allowed' : ''}`
            }
            onClick={(e) => {
              if (item.soon) e.preventDefault();
              if (sidebarOpen && window.innerWidth < 768) { 
                setSidebarOpen(false);
              }
            }}
          >
            {({ isActive: iconIsActive }) => (
              <>
                {iconIsActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>}
                <item.icon className={`mr-3 ml-1 flex-shrink-0 h-5 w-5 ${iconIsActive ? 'text-primary' : 'text-neutral-400 group-hover:text-neutral-300'}`} aria-hidden="true" />
                {item.name}
                {item.soon && <span className="ml-auto text-xs bg-neutral-600 text-neutral-200 px-1.5 py-0.5 rounded-full">EM BREVE</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t border-neutral-700">
        <Button 
          variant="ghost" 
          onClick={handleLogout} 
          className="w-full text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100"
          leftIcon={<LogoutIcon className="h-5 w-5"/>}
        >
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-neutral-800"> 
            {navigationContent}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={() => setSidebarOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-neutral-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-neutral-800">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Fechar sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                {navigationContent}
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};
