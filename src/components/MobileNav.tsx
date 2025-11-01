import React from 'react';
import { useCategories } from '../hooks/useCategories';

interface MobileNavProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeCategory, onCategoryClick }) => {
  const { categories } = useCategories();

  return (
    <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm border-b-2 border-pet-orange md:hidden shadow-md">
      <div className="flex overflow-x-auto scrollbar-hide px-4 py-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.id)}
            className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full mr-3 transition-all duration-200 font-semibold border-2 ${
              activeCategory === category.id
                ? 'bg-pet-orange text-white border-pet-orange scale-105'
                : 'bg-pet-beige text-pet-brown border-pet-orange hover:bg-pet-cream'
            }`}
          >
            <span className="text-lg">{category.icon}</span>
            <span className="text-sm whitespace-nowrap">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;