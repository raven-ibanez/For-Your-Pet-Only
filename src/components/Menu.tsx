import React from 'react';
import { Search, X } from 'lucide-react';
import { MenuItem, CartItem } from '../types';
import { useCategories } from '../hooks/useCategories';
import MenuItemCard from './MenuItemCard';

// Preload images for better performance
const preloadImages = (items: MenuItem[]) => {
  items.forEach(item => {
    if (item.image) {
      const img = new Image();
      img.src = item.image;
    }
  });
};

interface MenuProps {
  menuItems: MenuItem[];
  addToCart: (item: MenuItem, quantity?: number, variation?: any, addOns?: any[]) => void;
  cartItems: CartItem[];
  updateQuantity: (id: string, quantity: number) => void;
}

const Menu: React.FC<MenuProps> = ({ menuItems, addToCart, cartItems, updateQuantity }) => {
  const { categories } = useCategories();
  const [activeCategory, setActiveCategory] = React.useState('hot-coffee');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState<string>('all');

  // Preload images when menu items change
  React.useEffect(() => {
    if (menuItems.length > 0) {
      // Preload images for visible category first
      const visibleItems = menuItems.filter(item => item.category === activeCategory);
      preloadImages(visibleItems);
      
      // Then preload other images after a short delay
      setTimeout(() => {
        const otherItems = menuItems.filter(item => item.category !== activeCategory);
        preloadImages(otherItems);
      }, 1000);
    }
  }, [menuItems, activeCategory]);

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(categoryId);
    if (element) {
      const headerHeight = 64; // Header height
      const mobileNavHeight = 60; // Mobile nav height
      const offset = headerHeight + mobileNavHeight + 20; // Extra padding
      const elementPosition = element.offsetTop - offset;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  React.useEffect(() => {
    if (categories.length > 0) {
      // Set default to dim-sum if it exists, otherwise first category
      const defaultCategory = categories.find(cat => cat.id === 'dim-sum') || categories[0];
      if (!categories.find(cat => cat.id === activeCategory)) {
        setActiveCategory(defaultCategory.id);
      }
    }
  }, [categories, activeCategory]);

  React.useEffect(() => {
    const handleScroll = () => {
      const sections = categories.map(cat => document.getElementById(cat.id)).filter(Boolean);
      const scrollPosition = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveCategory(categories[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Filter menu items based on search and category
  const getFilteredItems = () => {
    let filtered = menuItems;

    // Filter by category
    if (selectedCategoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategoryFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const category = categories.find(cat => cat.id === item.category);
        const categoryName = category?.name.toLowerCase() || '';
        
        return (
          item.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          categoryName.includes(searchLower)
        );
      });
    }

    return filtered;
  };

  const filteredItems = getFilteredItems();
  const hasSearchResults = searchTerm.length > 0;

  return (
    <>
      {/* Search Bar - Sticky outside main container */}
      <div className="sticky top-[176px] md:top-[176px] z-30 bg-white/95 backdrop-blur-md border-b-2 border-pet-orange shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-display font-bold text-pet-orange-dark mb-4">Our Products 🐾</h2>
        <p className="text-pet-gray-dark text-lg max-w-2xl mx-auto mb-6">
          Browse our carefully curated selection of premium pet supplies, toys, treats, and essentials 
          to keep your furbabies happy and healthy!
        </p>

        {/* Category Filter */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 ${
                selectedCategoryFilter === 'all'
                  ? 'bg-pet-orange text-white border-pet-orange shadow-lg'
                  : 'bg-white text-pet-brown border-pet-orange hover:bg-pet-beige'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryFilter(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 flex items-center space-x-2 ${
                  selectedCategoryFilter === category.id
                    ? 'bg-pet-orange text-white border-pet-orange shadow-lg'
                    : 'bg-white text-pet-brown border-pet-orange hover:bg-pet-beige'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Results Count */}
        {hasSearchResults && (
          <div className="text-sm text-pet-gray-medium mb-4">
            Found {filteredItems.length} product{filteredItems.length !== 1 ? 's' : ''} matching "{searchTerm}"
          </div>
        )}
      </div>

      {/* Display Results */}
      {hasSearchResults ? (
        // Search Results View
        filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const cartItem = cartItems.find(cartItem => cartItem.id === item.id);
              return (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAddToCart={addToCart}
                  quantity={cartItem?.quantity || 0}
                  onUpdateQuantity={updateQuantity}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">No products found</p>
            <p className="text-gray-400 text-sm mb-4">Try a different search term or category</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategoryFilter('all');
              }}
              className="text-pet-orange hover:text-pet-orange-dark font-semibold"
            >
              Clear search
            </button>
          </div>
        )
      ) : (
        // Category View (Original Layout)
        categories.map((category) => {
          const categoryItems = menuItems.filter(item => item.category === category.id);
          
          if (categoryItems.length === 0) return null;
          
          return (
            <section key={category.id} id={category.id} className="mb-16">
              <div className="flex items-center mb-8 pb-4 border-b-2 border-pet-orange">
                <span className="text-4xl mr-3">{category.icon}</span>
                <h3 className="text-3xl font-display font-bold text-pet-orange-dark">{category.name}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryItems.map((item) => {
                  const cartItem = cartItems.find(cartItem => cartItem.id === item.id);
                  return (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAddToCart={addToCart}
                      quantity={cartItem?.quantity || 0}
                      onUpdateQuantity={updateQuantity}
                    />
                  );
                })}
              </div>
            </section>
          );
        })
      )}
      </main>
    </>
  );
};

export default Menu;