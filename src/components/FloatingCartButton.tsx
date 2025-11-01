import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface FloatingCartButtonProps {
  itemCount: number;
  onCartClick: () => void;
}

const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({ itemCount, onCartClick }) => {
  if (itemCount === 0) return null;

  return (
    <button
      onClick={onCartClick}
      className="fixed bottom-6 right-6 bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white p-4 rounded-full shadow-2xl hover:shadow-pet-orange/50 transition-all duration-200 transform hover:scale-110 z-40 md:hidden border-2 border-white"
    >
      <div className="relative">
        <ShoppingCart className="h-6 w-6" />
        <span className="absolute -top-2 -right-2 bg-white text-pet-orange-dark text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold border-2 border-pet-orange-dark animate-bounce-gentle">
          {itemCount}
        </span>
      </div>
    </button>
  );
};

export default FloatingCartButton;