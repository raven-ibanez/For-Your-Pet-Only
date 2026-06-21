import React, { useState } from 'react';
import { Calendar, Search, AlertTriangle, CheckCircle, Clock, AlertCircle, Filter, Package } from 'lucide-react';
import { useMenu } from '../../hooks/useMenu';

const ExpirationTracker: React.FC = () => {
  const { menuItems, loading } = useMenu();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'near-expiry' | 'expired' | 'safe'>('all');

  // Filter items that have expiry dates
  const itemsWithExpiry = menuItems.filter(item => !!item.expiryDate);

  // Helper to compute remaining days and expiry details
  const getExpiryDetails = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiryDateStr);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Thresholds:
    // Expired: diffDays < 0
    // Near Expiry: diffDays >= 0 && diffDays <= 90 (approx 3 months)
    // Safe: diffDays > 90
    if (diffDays < 0) {
      return {
        status: 'expired' as const,
        days: Math.abs(diffDays),
        label: 'Expired',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        textClass: 'text-red-600',
        bgClass: 'bg-red-50 border-l-4 border-red-500'
      };
    } else if (diffDays <= 90) {
      return {
        status: 'near-expiry' as const,
        days: diffDays,
        label: `${diffDays} day${diffDays !== 1 ? 's' : ''} left`,
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        textClass: 'text-orange-600 font-semibold',
        bgClass: 'bg-orange-50 border-l-4 border-orange-500'
      };
    } else {
      return {
        status: 'safe' as const,
        days: diffDays,
        label: `${Math.round(diffDays / 30)} months left`,
        badgeClass: 'bg-green-100 text-green-800 border-green-200',
        textClass: 'text-green-600',
        bgClass: 'bg-green-50 border-l-4 border-green-500'
      };
    }
  };

  // Process items with computed expiration details
  const processedItems = itemsWithExpiry.map(item => {
    const details = getExpiryDetails(item.expiryDate!);
    return {
      ...item,
      expiryDetails: details
    };
  });

  // Filter based on selected filter and search term
  const filteredItems = processedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (filterType === 'expired') return item.expiryDetails.status === 'expired';
    if (filterType === 'near-expiry') return item.expiryDetails.status === 'near-expiry';
    if (filterType === 'safe') return item.expiryDetails.status === 'safe';
    
    return true;
  });

  // Pinned items (expired or expiring within 3 months)
  const pinnedItems = processedItems.filter(
    item => item.expiryDetails.status === 'expired' || item.expiryDetails.status === 'near-expiry'
  ).sort((a, b) => a.expiryDetails.days - b.expiryDetails.days);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pet-orange mx-auto mb-4"></div>
          <p className="text-pet-gray-medium">Loading expiration tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-pet-orange-dark flex items-center">
              <Calendar className="h-6 w-6 mr-2" />
              Expiration Tracker
            </h1>
            <p className="text-pet-gray-medium mt-1">
              Monitor product expiration dates and track near-expiry items
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-pet-gray-medium">Total Tracked Items</div>
            <div className="text-2xl font-bold text-pet-brown">
              {itemsWithExpiry.length}
            </div>
            <div className="text-xs text-red-500 font-semibold mt-1">
              {pinnedItems.length} require attention
            </div>
          </div>
        </div>

        {/* Search and Quick Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full pl-10 pr-4 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange appearance-none bg-white"
            >
              <option value="all">All Items</option>
              <option value="near-expiry">Near Expiry (&le; 3 Months)</option>
              <option value="expired">Expired</option>
              <option value="safe">Safe (&gt; 3 Months)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pinned / Critical Attention Section */}
      {pinnedItems.length > 0 && filterType === 'all' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-bold text-red-800">Critical Attention Needed (Expired or Near Expiration)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedItems.map(item => (
              <div 
                key={item.id} 
                className="bg-white rounded-lg p-4 shadow border border-red-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-pet-brown text-sm line-clamp-1">{item.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${item.expiryDetails.badgeClass}`}>
                      {item.expiryDetails.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">SKU: {item.sku || 'N/A'}</div>
                  <div className="flex items-center justify-between text-xs mt-2 bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Stock Status:</span>
                    <span className={`font-semibold ${item.currentStock && item.currentStock > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {item.currentStock !== undefined ? `${item.currentStock} in stock` : 'Not tracked'}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-semibold text-red-700 mt-3 pt-2 border-t border-gray-100">
                  Expiry: {new Date(item.expiryDate!).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table/List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg font-semibold mb-2">
              No products found matching filters
            </p>
            <p className="text-sm text-gray-400">
              Try modifying your filters or check menu management to ensure products have expiration dates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-pet-cream">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Product Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">SKU</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Stock Level</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Expiration Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-pet-brown">Remaining Time</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-pet-brown">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-pet-cream/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-pet-brown">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.category}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.sku || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.currentStock !== undefined ? (
                        <span className={`inline-flex items-center font-semibold ${item.currentStock <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                          <Package className="h-4 w-4 mr-1 opacity-70" />
                          {item.currentStock} units
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Not tracked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {new Date(item.expiryDate!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={item.expiryDetails.textClass}>
                        {item.expiryDetails.status === 'expired' 
                          ? `${item.expiryDetails.days} days ago` 
                          : item.expiryDetails.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${item.expiryDetails.badgeClass}`}>
                        {item.expiryDetails.status === 'expired' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {item.expiryDetails.status === 'near-expiry' && <Clock className="h-3 w-3 mr-1" />}
                        {item.expiryDetails.status === 'safe' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {item.expiryDetails.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpirationTracker;
