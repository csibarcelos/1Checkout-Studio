
import React, { Fragment } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { Dialog, Transition } from '@headlessui/react';
import { NAV_ITEMS, NAV_ITEMS_SUPER_ADMIN, AppLogoIcon, LogoutIcon, XMarkIcon, AdjustmentsHorizontalIconReact, ShieldCheckIconReact, UserGroupIcon, BanknotesIconReact, TableCellsIconReact, ChartPieIcon } from '@/constants.tsx'; 
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

  const currentNavItems = isSuperAdmin ? NAV_ITEMS_SUPER_ADMIN.map(item => {
    // This mapping is technically redundant if NAV_ITEMS_SUPER_ADMIN directly uses the correct icons,
    // but kept for explicitness or if NAV_ITEMS_SUPER_ADMIN definition changes.
    // The key fix was ensuring the import brings the correct suffixed components into scope.
    if (item.name === 'Config. Plataforma') {
      return { ...item, icon: AdjustmentsHorizontalIconReact };
    }
    if (item.name === 'Dashboard Admin') {
      return { ...item, icon: ShieldCheckIconReact };
    }
     if (item.name === 'Todos Usuários') {
      return { ...item, icon: UserGroupIcon };
    }
    if (item.name === 'Todas Vendas') {
      return { ...item, icon: BanknotesIconReact };
    }
     if (item.name === 'Log de Auditoria') {
      return { ...item, icon: TableCellsIconReact };
    }
    if (item.name === 'Todos os Produtos') {
      return { ...item, icon: ChartPieIcon };
    }
    return item;
  }) : NAV_ITEMS;
  
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
                {item.soon && <span className="ml-auto text-xs bg-neutral-600 text-neutral-200 px-2 py-0.5 rounded-full">EM BREVE</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t border-neutral-700">
        <div className="flex items-center mb-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-neutral-900 font-semibold text-lg">
            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-neutral-100 truncate">{user?.name || 'Usuário'}</p>
            <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleLogout} 
          className="w-full"
          leftIcon={<LogoutIcon className="h-5 w-5"/>}
        >
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={setSidebarOpen}>
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

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-neutral-800">
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
                      className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
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
            <div className="w-14 flex-shrink-0" aria-hidden="true" /> {/* Dummy element to force sidebar to shrink to fit close icon */}
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-neutral-800 border-r border-neutral-700">
          {navigationContent}
        </div>
      </div>
    </>
  );
};
