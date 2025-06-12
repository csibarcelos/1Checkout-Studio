
import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from "react-router-dom";
import { CogIcon, LogoutIcon, Bars3IconHero } from '@/constants.tsx'; 

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const userInitial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <header className="relative bg-neutral-800 shadow-sm flex-shrink-0 border-b border-neutral-700">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Abrir sidebar</span>
              <Bars3IconHero className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="ml-auto flex items-center">
            <Menu as="div" className="ml-3 relative">
              <div>
                <Menu.Button className="max-w-xs bg-neutral-800 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 focus:ring-primary">
                  <span className="sr-only">Abrir menu do usuário</span>
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-neutral-900 font-semibold text-lg">
                    {userInitial}
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-neutral-700 ring-1 ring-neutral-600 ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-3 border-b border-neutral-600">
                    <p className="text-sm text-neutral-400">Logado como</p>
                    <p className="text-sm font-medium text-neutral-100 truncate">{user?.name || user?.email}</p>
                  </div>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/configuracoes')}
                        className={`${active ? 'bg-neutral-600' : ''} group flex w-full items-center rounded-md px-4 py-2 text-sm text-neutral-200 hover:text-neutral-100`}
                      >
                        <CogIcon className="mr-3 h-5 w-5 text-neutral-400 group-hover:text-neutral-300" aria-hidden="true" />
                        Configurações
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${active ? 'bg-neutral-600' : ''} group flex w-full items-center rounded-md px-4 py-2 text-sm text-neutral-200 hover:text-neutral-100`}
                      >
                        <LogoutIcon className="mr-3 h-5 w-5 text-neutral-400 group-hover:text-neutral-300" aria-hidden="true" />
                        Sair
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
};
