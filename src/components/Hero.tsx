import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-pet-cream via-white to-pet-beige py-20 px-4 overflow-hidden">
      {/* Decorative paw prints in background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 text-pet-orange text-6xl">🐾</div>
        <div className="absolute top-32 right-20 text-pet-orange text-5xl">🐾</div>
        <div className="absolute bottom-20 left-32 text-pet-orange text-7xl">🐾</div>
        <div className="absolute bottom-32 right-10 text-pet-orange text-5xl">🐾</div>
      </div>
      
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-pet-orange-dark mb-3">
            For Your Pets Only
          </h1>
          <p className="text-2xl md:text-3xl font-display text-pet-orange italic">
            Furbaby Essentials
          </p>
        </div>
        
        <p className="text-xl md:text-2xl text-pet-gray-dark mb-8 max-w-2xl mx-auto animate-slide-up font-medium">
          Everything your furry friends need to live their best lives! 🐶🐱
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-scale-in">
          <a 
            href="#products"
            className="bg-pet-orange text-white px-10 py-4 rounded-full hover:bg-pet-orange-dark transition-all duration-300 transform hover:scale-105 font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            🛍️ Shop Now
          </a>
          <a 
            href="#featured"
            className="bg-white text-pet-orange border-2 border-pet-orange px-10 py-4 rounded-full hover:bg-pet-cream transition-all duration-300 transform hover:scale-105 font-semibold text-lg"
          >
            ⭐ Featured Products
          </a>
        </div>
        
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🐕</div>
            <p className="font-semibold text-pet-brown">Dog Supplies</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🐈</div>
            <p className="font-semibold text-pet-brown">Cat Supplies</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🍖</div>
            <p className="font-semibold text-pet-brown">Premium Food</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🧸</div>
            <p className="font-semibold text-pet-brown">Toys & Treats</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;