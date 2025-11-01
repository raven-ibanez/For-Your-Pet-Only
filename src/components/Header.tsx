import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

interface HeaderProps {
  cartItemsCount: number;
  onCartClick: () => void;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartItemsCount, onCartClick, onMenuClick }) => {
  const { siteSettings, loading } = useSiteSettings();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-4 border-pet-orange shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <button 
            onClick={onMenuClick}
            className="flex items-center space-x-3 text-pet-brown hover:text-pet-orange-dark transition-colors duration-200 group"
          >
            {loading ? (
              <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse" />
            ) : (
              <img 
                src={siteSettings?.site_logo || "/logo.jpg"} 
                alt={siteSettings?.site_name || "For Your Pets Only"}
                className="w-14 h-14 rounded-full object-cover ring-4 ring-pet-orange group-hover:ring-pet-orange-dark transition-all duration-200"
                onError={(e) => {
                  e.currentTarget.src = "/logo.jpg";
                }}
              />
            )}
            <div className="flex flex-col items-start">
              <h1 className="text-xl md:text-2xl font-display font-bold text-pet-orange-dark">
                {loading ? (
                  <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
                ) : (
                  "For Your Pets Only"
                )}
              </h1>
              <p className="text-xs md:text-sm font-sans italic text-pet-orange -mt-1">
                Furbaby Essentials 🐾
              </p>
            </div>
          </button>

          <div className="flex items-center space-x-2">
            <button 
              onClick={onCartClick}
              className="relative p-3 text-pet-orange hover:text-white hover:bg-pet-orange rounded-full transition-all duration-200 border-2 border-pet-orange"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pet-orange-dark text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-bounce-gentle shadow-lg">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;