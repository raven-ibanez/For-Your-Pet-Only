import React from 'react';
import { useCategories } from '../hooks/useCategories';

interface SubNavProps {
  selectedCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const SubNav: React.FC<SubNavProps> = ({ selectedCategory, onCategoryClick }) => {
  const { categories, loading } = useCategories();

  return (
    <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-md border-b-2 border-pet-orange shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 overflow-x-auto py-4 scrollbar-hide">
          {loading ? (
            <div className="flex space-x-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <button
                onClick={() => onCategoryClick('all')}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 ${
                  selectedCategory === 'all'
                    ? 'bg-pet-orange text-white border-pet-orange shadow-lg scale-105'
                    : 'bg-white text-pet-brown border-pet-orange hover:bg-pet-beige'
                }`}
              >
                🏠 All Products
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCategoryClick(c.id)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 flex items-center space-x-1 whitespace-nowrap ${
                    selectedCategory === c.id
                      ? 'bg-pet-orange text-white border-pet-orange shadow-lg scale-105'
                      : 'bg-white text-pet-brown border-pet-orange hover:bg-pet-beige'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubNav;


