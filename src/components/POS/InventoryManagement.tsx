import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, AlertTriangle, TrendingDown, Coins, Barcode } from 'lucide-react';
import { posAPI } from '../../lib/pos';
import { supabase } from '../../lib/supabase';

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStockAmount, setNewStockAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await posAPI.getInventory();
      setInventory(data);
      console.log(`📦 Loaded ${data.length} inventory records`);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncInventory = async () => {
    if (!confirm('This will:\n1. Create inventory for missing products\n2. Fix unit costs (₱0.00 → actual price)\n\nContinue?')) {
      return;
    }

    try {
      setSyncing(true);
      console.log('🔄 Starting full inventory sync...');
      
      // Step 1: Sync missing products
      const syncResult = await posAPI.syncInventory();
      console.log(`Step 1: Created ${syncResult.created} new records`);
      
      // Step 2: Fix unit costs
      const costResult = await posAPI.updateUnitCosts();
      console.log(`Step 2: Updated ${costResult.updated} unit costs`);
      
      const totalChanges = syncResult.created + costResult.updated;
      
      if (totalChanges > 0) {
        alert(`✅ Success!\n\n` +
          `• Created ${syncResult.created} new inventory records\n` +
          `• Fixed ${costResult.updated} unit costs\n\n` +
          `All products now properly tracked with correct prices!`);
      } else {
        alert('✅ All products are already synced with correct prices!');
      }
      
      // Reload inventory
      await loadInventory();
    } catch (error: any) {
      console.error('❌ Sync failed:', error);
      alert(`Failed to sync inventory: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || !newStockAmount || !adjustReason) {
      alert('Please fill in all fields');
      return;
    }

    const stockAmount = parseInt(newStockAmount);
    if (isNaN(stockAmount) || stockAmount < 0) {
      alert('Please enter a valid stock amount');
      return;
    }

    try {
      console.log('🔄 Adjusting stock:', {
        item: selectedItem.menu_items?.name,
        oldStock: selectedItem.current_stock,
        newStock: stockAmount,
        reason: adjustReason
      });

      // Direct database update
      const { data, error } = await supabase
        .from('inventory')
        .update({
          current_stock: stockAmount,
          is_low_stock: stockAmount <= selectedItem.minimum_stock,
          is_out_of_stock: stockAmount <= 0,
          last_stock_update: new Date().toISOString()
        })
        .eq('menu_item_id', selectedItem.menu_item_id)
        .select()
        .single();

      if (error) {
        console.error('❌ Stock adjustment error:', error);
        alert(`Failed to adjust stock: ${error.message}`);
        return;
      }

      console.log('✅ Stock adjusted successfully:', data);
      alert(`✅ Stock Updated!\n${selectedItem.menu_items?.name}\nOld Stock: ${selectedItem.current_stock}\nNew Stock: ${stockAmount}\nReason: ${adjustReason}`);
      
      setShowAdjustModal(false);
      setSelectedItem(null);
      setNewStockAmount('');
      setAdjustReason('');
      
      // Reload inventory
      await loadInventory();
    } catch (error) {
      console.error('❌ Error adjusting stock:', error);
      alert('Failed to adjust stock. Check console for details.');
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (filter === 'low') return item.is_low_stock && !item.is_out_of_stock;
    if (filter === 'out') return item.is_out_of_stock;
    return true;
  });

  const stats = {
    total: inventory.length,
    low: inventory.filter(i => i.is_low_stock && !i.is_out_of_stock).length,
    out: inventory.filter(i => i.is_out_of_stock).length,
    totalStock: inventory.reduce((sum, item) => sum + (item.current_stock || 0), 0),
    totalValue: inventory.reduce((sum, item) => {
      const stock = item.current_stock || 0;
      const cost = item.unit_cost || item.average_cost || item.menu_items?.base_price || 0;
      return sum + (stock * cost);
    }, 0),
    brokenCosts: inventory.filter(i => !i.unit_cost || i.unit_cost === 0).length
  };

  console.log('📊 Inventory Stats:', stats);
  
  if (stats.brokenCosts > 0) {
    console.warn(`⚠️ ${stats.brokenCosts} items have ₱0.00 unit cost - click "Sync & Fix All" to fix!`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pet-orange-dark">📦 Inventory Management</h1>
          <p className="text-pet-gray-medium mt-1">Track and manage product stock levels</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncInventory}
            disabled={syncing}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2 shadow-lg"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <Package className="h-5 w-5" />
                <span>🔄 Sync & Fix All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unit Cost Warning */}
      {stats.brokenCosts > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-800 font-bold mb-2">
                ⚠️ Unit Cost Issue Detected
              </h3>
              <p className="text-yellow-700 text-sm mb-3">
                {stats.brokenCosts} product{stats.brokenCosts > 1 ? 's have' : ' has'} unit cost set to ₱0.00.
                This affects inventory value calculations.
              </p>
              <button
                onClick={handleSyncInventory}
                disabled={syncing}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                Fix Now (Click "Sync & Fix All" above)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Package className="h-8 w-8 text-pet-orange" />
            <span className="text-xs bg-pet-cream px-2 py-1 rounded">Total</span>
          </div>
          <p className="text-3xl font-bold text-pet-brown">{stats.total}</p>
          <p className="text-sm text-pet-gray-medium">Items Tracked</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="h-8 w-8 text-yellow-600" />
            <span className="text-xs bg-yellow-100 px-2 py-1 rounded">Alert</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{stats.low}</p>
          <p className="text-sm text-pet-gray-medium">Low Stock</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <span className="text-xs bg-red-100 px-2 py-1 rounded">Critical</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.out}</p>
          <p className="text-sm text-pet-gray-medium">Out of Stock</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl">₱</div>
            <span className="text-xs bg-green-100 px-2 py-1 rounded">Value</span>
          </div>
          <p className="text-2xl font-bold text-green-600">₱{stats.totalValue.toFixed(2)}</p>
          <p className="text-sm text-pet-gray-medium">Inventory Value</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-pet-brown">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-pet-orange text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items ({inventory.length})
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'low'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Low Stock ({stats.low})
          </button>
          <button
            onClick={() => setFilter('out')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'out'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Out of Stock ({stats.out})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 overflow-x-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pet-orange mx-auto mb-2"></div>
            <p>Loading inventory...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>No items found</p>
          </div>
        ) : (
          <div className="-mx-4 lg:mx-0">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b-2 border-pet-orange">
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Product</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">SKU</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Stock</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Min</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Status</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Cost</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Value</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Edit</th>
                </tr>
                </thead>
              <tbody>
              {filteredInventory.map(item => {
                const stockValue = item.current_stock * (item.unit_cost || 0);
                return (
                  <tr 
                    key={item.id} 
                    className={`border-b border-pet-beige hover:bg-pet-cream ${
                      item.is_out_of_stock ? 'bg-red-50' : item.is_low_stock ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div>
                        <p className="font-semibold text-pet-brown">{item.menu_items?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{item.menu_items?.category}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1 text-sm">
                        <Barcode className="h-3 w-3 text-pet-orange" />
                        <span className="text-gray-600">{item.sku || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-2xl font-bold ${
                        item.is_out_of_stock ? 'text-red-600' : 
                        item.is_low_stock ? 'text-yellow-600' : 
                        'text-pet-brown'
                      }`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-600">{item.minimum_stock}</span>
                    </td>
                    <td className="p-3">
                      {item.is_out_of_stock ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                          OUT OF STOCK
                        </span>
                      ) : item.is_low_stock ? (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                          IN STOCK
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-gray-600">₱{(item.unit_cost || 0).toFixed(2)}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-green-600">₱{stockValue.toFixed(2)}</span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setNewStockAmount(item.current_stock.toString());
                          setShowAdjustModal(true);
                        }}
                        className="text-pet-orange hover:text-pet-orange-dark"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="bg-pet-orange text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">Adjust Stock</h2>
              <p className="text-sm mt-1">{selectedItem.menu_items?.name}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-pet-brown mb-2">
                  Current Stock: <span className="text-pet-orange-dark">{selectedItem.current_stock}</span>
                </label>
                <input
                  type="number"
                  value={newStockAmount}
                  onChange={(e) => setNewStockAmount(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-2xl font-bold text-center"
                  placeholder="New stock amount"
                  min="0"
                />
                <div className="mt-2 text-sm text-pet-gray-medium">
                  Difference: {newStockAmount ? (parseInt(newStockAmount) - selectedItem.current_stock) : 0} units
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-pet-brown mb-2">Reason for Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                >
                  <option value="">Select reason...</option>
                  <option value="Physical count">📦 Physical Count</option>
                  <option value="Received shipment">🚚 Received Shipment</option>
                  <option value="Damaged items">⚠️ Damaged Items</option>
                  <option value="Expired items">📅 Expired Items</option>
                  <option value="Correction">✏️ Correction</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <button
                  onClick={handleAdjustStock}
                  disabled={!newStockAmount || !adjustReason}
                  className="flex-1 bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-3 rounded-lg font-bold hover:from-pet-orange-dark hover:to-pet-orange transition-all disabled:opacity-50"
                >
                  Update Stock
                </button>
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setSelectedItem(null);
                    setNewStockAmount('');
                    setAdjustReason('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;

