import React, { useState } from 'react';
import { Lock, LogOut } from 'lucide-react';
import QuickSale from './POS/QuickSale';

const StaffDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('beracah_staff_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Staff password - can be changed as needed
    if (password === 'Staff@2025!') {
      setIsAuthenticated(true);
      localStorage.setItem('beracah_staff_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('beracah_staff_auth');
    setPassword('');
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-pet-cream flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-pet-orange rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold text-pet-orange-dark">Staff Access</h1>
            <p className="text-pet-gray-medium mt-2">Enter password to access the POS system</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-pet-brown mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-pet-orange rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-transparent"
                placeholder="Enter staff password"
                required
              />
              {loginError && (
                <p className="text-red-500 text-sm mt-2">{loginError}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-3 rounded-lg hover:from-pet-orange-dark hover:to-pet-orange transition-colors duration-200 font-medium"
            >
              Access POS System
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main POS Dashboard - Only Quick Sale
  return (
    <div className="min-h-screen bg-pet-cream">
      <div className="bg-white shadow-sm border-b-4 border-pet-orange">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-display font-bold text-pet-orange-dark">🛒 Staff POS System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="text-pet-gray-medium hover:text-pet-orange-dark transition-colors duration-200"
              >
                View Website
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-pet-gray-medium hover:text-pet-orange-dark transition-colors duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <QuickSale />
      </div>
    </div>
  );
};

export default StaffDashboard;

