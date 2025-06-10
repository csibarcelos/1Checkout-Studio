
import React from 'react';
import { NavItemConfig } from './types'; // Adjusted path
import {
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  TableCellsIcon, 
  BanknotesIcon,
  ChartPieIcon as HeroIconsChartPieIcon,
  CurrencyDollarIcon as HeroIconsCurrencyDollarIcon,
  UserGroupIcon as HeroIconsUserGroupIcon,
  DocumentDuplicateIcon as HeroIconsDocumentDuplicateIcon,
  TrashIcon as HeroIconsTrashIcon,
  PlusIcon as HeroIconsPlusIcon,
  CheckCircleIcon as HeroIconsCheckCircleIcon,
  XMarkIcon as HeroIconsXMarkIcon,
  KeyIcon as HeroIconsKeyIcon,
  InformationCircleIcon as HeroIconsInformationCircleIcon, 
  PencilIcon as HeroIconsPencilIcon, 
  TagIcon as HeroIconsTagIcon,       
  Bars3Icon 
} from '@heroicons/react/24/outline'; 

export const ChartPieIcon = HeroIconsChartPieIcon;
export const CurrencyDollarIcon = HeroIconsCurrencyDollarIcon;
export const UserGroupIcon = HeroIconsUserGroupIcon;
export const DocumentDuplicateIcon = HeroIconsDocumentDuplicateIcon;
export const TrashIcon = HeroIconsTrashIcon;
export const PlusIcon = HeroIconsPlusIcon;
export const CheckCircleIcon = HeroIconsCheckCircleIcon;
export const XMarkIcon = HeroIconsXMarkIcon;
export const KeyIcon = HeroIconsKeyIcon;
export const InformationCircleIcon = HeroIconsInformationCircleIcon;
export const PencilIcon = HeroIconsPencilIcon; 
export const TagIcon = HeroIconsTagIcon;       
export const Bars3IconHero = Bars3Icon;


export const HomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0l8.954 8.955M11.25 12.75V21m0-8.25H2.25m9 0h9M3.75 21h16.5M12 3.75l-9 9h18l-9-9z" />
    </svg>
  );
};

export const PresentationChartLineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v16.5h16.5M3.75 19.5L7.5 15.75l3 3L15 12l5.25 5.25" />
    </svg>
  );
};


export const CubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
};

export const ShoppingCartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
};

export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
};

export const ArchiveBoxXMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6m-6 4.5h6M6.75 21H2.25a.75.75 0 01-.75-.75V4.5c0-.414.336-.75.75-.75h19.5c.414 0 .75.336.75.75v15.75a.75.75 0 01-.75-.75H17.25m-3.75-12l-3 3m0 0l-3-3m3 3v9.75M16.5 6.75l3 3m0 0l3-3m-3 3V3" />
    </svg>
  );
};

export const CreditCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 15h16.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

export const LinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
};

export const CogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5M12 4.5v.01M12 8.25v.01M12 12v.01M12 15.75v.01M12 19.5v.01M6.375 6.375L6.375 6.375m11.25 11.25l.001.001M4.5 12H3m1.5 0a7.5 7.5 0 1115 0m-15 0H3m1.5 0a7.5 7.5 0 1115 0M3 12h1.5M21 12h-1.5m-15 0H3m1.5 0H21" />
    </svg>
  );
};

export const LogoutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
};


export const BoldIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5c1.036 0 1.875.84 1.875 1.875v1.5c0 1.035-.84 1.875-1.875 1.875h-7.5c-1.036 0-1.875-.84-1.875-1.875v-1.5C6.375 7.59 7.214 6.75 8.25 6.75zm0 6h7.5c1.036 0 1.875.84 1.875 1.875v1.5c0 1.035-.84 1.875-1.875 1.875h-7.5c-1.036 0-1.875-.84-1.875-1.875v-1.5c0-1.035.84-1.875 1.875-1.875z" transform="matrix(0.8 0 0 1 1.5 0.75)"/>
    </svg>
  );
};

export const ItalicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5l3 15m0 0l3-15M12 19.5h.01" />
    </svg>
  );
};

export const UnderlineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 19.5h12M9 4.5v10.5a3 3 0 003 3h0a3 3 0 003-3V4.5" />
    </svg>
  );
};

export const ListOrderedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12" />
      <text x="2.5" y="7.75" fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="bold">1.</text>
      <text x="2.5" y="13" fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="bold">2.</text>
      <text x="2.5" y="18.25" fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="bold">3.</text>
    </svg>
  );
};

export const ListUnorderedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12" />
      <circle cx="4.5" cy="6.75" r={1.125} fill="currentColor"/>
      <circle cx="4.5" cy="12" r={1.125} fill="currentColor"/>
      <circle cx="4.5" cy="17.25" r={1.125} fill="currentColor"/>
    </svg>
  );
};

/**
 * Renders the application logo.
 * Uses a predefined image source.
 * @param props Standard HTML Img attributes. className can be used to control size, defaults to 'h-10 w-auto'.
 */
export const AppLogoIcon: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  const { className: propClassName, ...restProps } = props; // Changed to propClassName to match original logic
  return (
    <img 
      src="https://i.imgur.com/kdm9n4P.png" 
      alt="1Checkout Logo"
      className={`object-contain ${propClassName || 'h-10 w-auto'}`} 
      {...restProps} 
    />
  );
};


export const WhatsAppIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.31 3.43 16.76L2 22L7.33 20.59C8.75 21.37 10.35 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 9.24 20.92 6.78 19.05 4.91C17.18 3.03 14.72 2 12.04 2M12.04 3.67C14.22 3.67 16.22 4.5 17.73 6.01C19.24 7.52 20.08 9.52 20.08 11.91C20.08 16.41 16.44 20.15 12.04 20.15C10.56 20.15 9.16 19.76 7.97 19.05L7.53 18.81L5.23 19.46L5.9 17.21L5.64 16.76C4.84 15.46 4.39 13.97 4.39 11.91C4.39 7.41 8 3.67 12.04 3.67M9.04 7.62C8.87 7.62 8.64 7.67 8.46 7.95C8.27 8.22 7.66 8.83 7.66 9.93C7.66 11.03 8.48 12.08 8.62 12.25C8.77 12.42 10.03 14.54 12.22 15.44C14.03 16.18 14.49 16.02 14.88 15.97C15.48 15.89 16.42 15.31 16.66 14.73C16.91 14.15 16.91 13.68 16.82 13.57C16.74 13.46 16.57 13.38 16.32 13.24C16.08 13.11 14.97 12.57 14.75 12.48C14.52 12.38 14.36 12.33 14.19 12.61C14.02 12.88 13.53 13.46 13.39 13.64C13.24 13.81 13.1 13.83 12.85 13.7C12.61 13.57 11.82 13.31 10.87 12.45C10.12 11.78 9.62 10.94 9.47 10.72C9.32 10.5 9.46 10.36 9.59 10.23C9.7 10.11 9.85 9.91 10 9.76C10.15 9.61 10.21 9.49 10.33 9.27C10.46 9.06 10.38 8.88 10.3 8.75C10.23 8.62 9.57 7.8 9.34 7.7C9.12 7.64 9.04 7.62 9.04 7.62Z" />
    </svg>
  );
};


export const NAV_ITEMS: NavItemConfig[] = [
  { name: 'Dashboard', href: '/dashboard', icon: PresentationChartLineIcon },
  { name: 'Produtos', href: '/produtos', icon: CubeIcon },
  { name: 'Vendas', href: '/vendas', icon: ShoppingCartIcon, soon: false },
  { name: 'Clientes', href: '/clientes', icon: UsersIcon, soon: false },
  { name: 'Carrinhos Abandonados', href: '/carrinhos-abandonados', icon: ArchiveBoxXMarkIcon, soon: false },
  { name: 'Integrações', href: '/integracoes', icon: LinkIcon, soon: false },
  { name: 'Configurações', href: '/configuracoes', icon: CogIcon, soon: false },
];

export const NAV_ITEMS_SUPER_ADMIN: NavItemConfig[] = [
  { name: 'Dashboard Admin', href: '/superadmin/dashboard', icon: ShieldCheckIcon },
  { name: 'Config. Plataforma', href: '/superadmin/configuracoes-plataforma', icon: AdjustmentsHorizontalIcon },
  { name: 'Todos Usuários', href: '/superadmin/usuarios', icon: UserGroupIcon },
  { name: 'Todas Vendas', href: '/superadmin/vendas-gerais', icon: BanknotesIcon },
  { name: 'Log de Auditoria', href: '/superadmin/audit-log', icon: TableCellsIcon },
  { name: 'Todos os Produtos', href: '/superadmin/todos-produtos', icon: ChartPieIcon },
];


export const LOCALSTORAGE_KEYS = {
  USERS: 'plataformaCheckoutUsers_mock',
  PRODUCTS: 'plataformaCheckoutProducts_mock',
  SALES: 'plataformaCheckoutSales_mock',
  CUSTOMERS: 'plataformaCheckoutCustomers_mock',
  ABANDONED_CARTS: 'plataformaCheckoutAbandonedCarts_mock',
  PIX_TRANSACTIONS: 'plataformaCheckoutPixTransactions_mock',
  APP_SETTINGS: 'plataformaCheckoutAppSettings_mock',
  PLATFORM_SETTINGS: 'plataformaCheckoutPlatformSettings_mock',
  AUDIT_LOGS: 'plataformaCheckoutAuditLogs_mock',
};

export const SUPER_ADMIN_EMAIL = 'usedonjuan@gmail.com';

export const PUSHINPAY_API_BASE = 'https://api.pushinpay.com.br/api';
export const UTMIFY_API_BASE = 'https://api.utmify.com.br/api-credentials';

export const MOCK_WEBHOOK_URL = 'https://webhook.site/mock-platform-checkout'; 
export const PLATFORM_NAME = "Pushin Pay"; 
export const DEFAULT_CURRENCY = "BRL"; 

export const COLOR_PALETTE_OPTIONS = [
  { name: 'Amarelo (Padrão)', value: '#FDE047' }, 
  { name: 'Verde (Secundário)', value: '#22C55E' }, 
  { name: 'Azul Escuro', value: '#2563EB' },
  { name: 'Roxo', value: '#7C3AED' },
  { name: 'Rosa', value: '#DB2777' },
  { name: 'Vermelho', value: '#DC2626' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Verde Água', value: '#0D9488' },
  { name: 'Índigo', value: '#4F46E5' },
  { name: 'Cinza Escuro', value: '#374151' }, 
  { name: 'Preto', value: '#000000' },
  { name: 'Branco', value: '#FFFFFF' },
];

interface PhoneCountryCode {
  name: string;
  value: string;
  countryShort: string;
  emoji: string;
}

export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  { name: 'Brasil (+55)', value: '+55', countryShort: 'BR', emoji: '🇧🇷' },
  { name: 'EUA (+1)', value: '+1', countryShort: 'US', emoji: '🇺🇸' },
  { name: 'Portugal (+351)', value: '+351', countryShort: 'PT', emoji: '🇵🇹' },
  { name: 'Reino Unido (+44)', value: '+44', countryShort: 'GB', emoji: '🇬🇧' },
];

const cleanPhoneNumberForWhatsApp = (phoneNumber: string): string => {
  return phoneNumber.replace(/\D/g, '');
};

export const generateWhatsAppLink = (rawPhoneNumber: string, message: string): string => {
  const cleanedPhone = cleanPhoneNumberForWhatsApp(rawPhoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
};
