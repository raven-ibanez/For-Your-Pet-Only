import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, AlertTriangle, TrendingDown, Coins, Barcode, ArrowUp, ArrowDown, Calendar, Search, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { posAPI } from '../../lib/pos';
import { supabase } from '../../lib/supabase';

const InventoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStockAmount, setNewStockAmount] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newMargin, setNewMargin] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Stock Movements state
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementFilter, setMovementFilter] = useState<'all' | 'in' | 'out'>('all');
  const [movementSearchQuery, setMovementSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (activeTab === 'movements') {
      loadStockMovements();
    }
  }, [activeTab, movementFilter, startDate, endDate]);

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

  const loadStockMovements = async () => {
    try {
      setMovementsLoading(true);
      const movements = await posAPI.getStockMovements(
        startDate,
        endDate,
        movementFilter === 'all' ? 'all' : movementFilter
      );
      setStockMovements(movements);
      console.log(`📊 Loaded ${movements.length} stock movements`);
    } catch (error) {
      console.error('Error loading stock movements:', error);
    } finally {
      setMovementsLoading(false);
    }
  };

  const filteredStockMovements = stockMovements.filter(movement => {
    if (!movementSearchQuery) return true;

    const query = movementSearchQuery.toLowerCase();
    const productName = (movement.menu_items?.name || '').toLowerCase();
    const category = (movement.menu_items?.category || '').toLowerCase();
    const reference = (movement.reference_number || '').toLowerCase();
    const reason = (movement.reason || '').toLowerCase();
    const notes = (movement.notes || '').toLowerCase();

    return productName.includes(query) ||
      category.includes(query) ||
      reference.includes(query) ||
      reason.includes(query) ||
      notes.includes(query);
  });

  const handleExportMovements = () => {
    // Define CSV headers
    const headers = ['Date', 'Product', 'Category', 'Type', 'Quantity', 'Before', 'After', 'Reason', 'Reference', 'Notes', 'Staff'];

    // Convert data to CSV format
    const csvData = filteredStockMovements.map(movement => {
      const isIn = movement.movement_type === 'in' || movement.movement_type === 'adjustment';
      const type = isIn ? 'IN' : 'OUT';
      const quantity = `${isIn ? '+' : '-'}${movement.quantity}`;

      return [
        `\"${formatDate(movement.movement_date)}\"`,
        `\"${(movement.menu_items?.name || 'Unknown').replace(/\"/g, '\"\"')}\"`,
        `\"${(movement.menu_items?.category || '').replace(/\"/g, '\"\"')}\"`,
        type,
        quantity,
        movement.stock_before || 0,
        movement.stock_after || 0,
        `\"${(movement.reason || '').replace(/\"/g, '\"\"')}\"`,
        `\"${(movement.reference_number || '').replace(/\"/g, '\"\"')}\"`,
        `\"${(movement.notes || '').replace(/\"/g, '\"\"')}\"`,
        `\"${(movement.staff?.name || '').replace(/\"/g, '\"\"')}\"`
      ].join(',');
    });

    // Combine headers and data
    const csvContent = [headers.join(','), ...csvData].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `stock_movements_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFixNegativeStock = async () => {
    const negativeCount = stats.negative;
    if (negativeCount === 0) {
      alert('✅ No negative stock found!');
      return;
    }

    if (!confirm(`This will fix ${negativeCount} item(s) with negative stock by setting them to 0.\n\nContinue?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('fix_negative_stock');

      if (error) {
        console.error('❌ Fix negative stock error:', error);
        alert(`Failed to fix negative stock: ${error.message}`);
        return;
      }

      const fixedCount = data?.[0]?.fixed_count || 0;
      alert(`✅ Fixed ${fixedCount} item(s) with negative stock!\n\nAll negative stock values have been set to 0.`);

      // Reload inventory
      await loadInventory();
    } catch (error: any) {
      console.error('❌ Error fixing negative stock:', error);
      alert(`Failed to fix negative stock: ${error.message}`);
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
      if (selectedItem.isVariation) {
        const costVal = parseFloat(newCostPrice);
        const marginVal = parseFloat(newMargin);

        if (isNaN(costVal) || costVal < 0) {
          alert('Please enter a valid cost price');
          return;
        }
        if (isNaN(marginVal) || marginVal < 0) {
          alert('Please enter a valid margin');
          return;
        }

        console.log('🔄 Adjusting variation stock:', {
          item: selectedItem.menu_items?.name,
          variation: selectedItem.variationName,
          oldStock: selectedItem.current_stock,
          newStock: stockAmount,
          cost: costVal,
          margin: marginVal,
          reason: adjustReason
        });

        const { data, error } = await supabase
          .from('variations')
          .update({
            stock_on_hand: stockAmount,
            cost_price: costVal,
            margin: marginVal
          })
          .eq('id', selectedItem.variationId)
          .select()
          .single();

        if (error) {
          console.error('❌ Variation adjustment error:', error);
          alert(`Failed to adjust variation: ${error.message}`);
          return;
        }

        console.log('✅ Variation adjusted successfully:', data);
        alert(`✅ Variation Updated!\n${selectedItem.menu_items?.name} (${selectedItem.variationName})\nStock: ${stockAmount}\nCost: ₱${costVal.toFixed(2)}\nMargin: ${marginVal}%\nReason: ${adjustReason}`);
      } else {
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
      }

      setShowAdjustModal(false);
      setSelectedItem(null);
      setNewStockAmount('');
      setNewCostPrice('');
      setNewMargin('');
      setAdjustReason('');

      // Reload inventory
      await loadInventory();
    } catch (error) {
      console.error('❌ Error adjusting stock:', error);
      alert('Failed to adjust stock. Check console for details.');
    }
  };

  const handleExport = () => {
    // Define CSV headers
    const headers = ['Product Name', 'Category', 'SKU', 'Current Stock', 'Min Stock', 'Status', 'Unit Cost', 'Total Value'];

    // Convert data to CSV format
    const csvData = filteredInventory.map(item => {
      const stockValue = item.current_stock * (item.unit_cost || 0);
      const status = item.is_out_of_stock ? 'Out of Stock' : item.is_low_stock ? 'Low Stock' : 'In Stock';

      return [
        `\"${(item.menu_items?.name || 'Unknown').replace(/\"/g, '\"\"')}\"`,
        `\"${(item.menu_items?.category || '').replace(/\"/g, '\"\"')}\"`,
        `\"${item.sku || ''}\"`,
        item.current_stock,
        item.minimum_stock,
        status,
        (item.unit_cost || 0).toFixed(2),
        stockValue.toFixed(2)
      ].join(',');
    });

    // Combine headers and data
    const csvContent = [headers.join(','), ...csvData].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInventory = inventory.filter(item => {
    // Status filter
    if (filter === 'low' && (!item.is_low_stock || item.is_out_of_stock)) return false;
    if (filter === 'out' && !item.is_out_of_stock) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (item.menu_items?.name || '').toLowerCase();
      const category = (item.menu_items?.category || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();

      return name.includes(query) || category.includes(query) || sku.includes(query);
    }

    return true;
  });

  const stats = {
    total: inventory.length,
    low: inventory.filter(i => i.is_low_stock && !i.is_out_of_stock).length,
    out: inventory.filter(i => i.is_out_of_stock).length,
    negative: inventory.filter(i => (i.current_stock || 0) < 0).length,
    totalStock: inventory.reduce((sum, item) => sum + Math.max(0, item.current_stock || 0), 0),
    totalValue: inventory.reduce((sum, item) => {
      const stock = Math.max(0, item.current_stock || 0);
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
          {activeTab === 'inventory' && (
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
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'inventory'
              ? 'bg-pet-orange text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            📦 Current Inventory
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'movements'
              ? 'bg-pet-orange text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            📊 Stock Movements (In/Out)
          </button>
        </div>
      </div>

      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <>

          {/* Negative Stock Warning */}
          {stats.negative > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-red-800 font-bold mb-2">
                    ⚠️ Negative Stock Detected!
                  </h3>
                  <p className="text-red-700 text-sm mb-3">
                    {stats.negative} product{stats.negative > 1 ? 's have' : ' has'} negative stock values.
                    This usually happens when more items were sold than available.
                    Click the button below to fix by setting negative values to 0.
                  </p>
                  <button
                    onClick={handleFixNegativeStock}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    🔧 Fix Negative Stock ({stats.negative} item{stats.negative > 1 ? 's' : ''})
                  </button>
                </div>
              </div>
            </div>
          )}

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

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-pet-brown">Filter:</span>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filter === 'all'
                    ? 'bg-pet-orange text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  All Items ({inventory.length})
                </button>
                <button
                  onClick={() => setFilter('low')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filter === 'low'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Low Stock ({stats.low})
                </button>
                <button
                  onClick={() => setFilter('out')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${filter === 'out'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Out of Stock ({stats.out})
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inventory..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-transparent w-64"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
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
                      const variations = item.menu_items?.variations || [];
                      const hasVariations = variations.length > 0;
                      
                      const totalVariationStock = variations.reduce((sum: number, v: any) => sum + (v.stock_on_hand || 0), 0);
                      const totalVariationValue = variations.reduce((sum: number, v: any) => {
                        const vCost = v.cost_price || v.price || 0;
                        return sum + ((v.stock_on_hand || 0) * vCost);
                      }, 0);
                      
                      const stockValue = hasVariations ? totalVariationValue : item.current_stock * (item.unit_cost || 0);
                      
                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            className={`border-b border-pet-beige hover:bg-pet-cream ${
                              !hasVariations && item.current_stock <= 0 ? 'bg-red-50' : !hasVariations && item.is_low_stock ? 'bg-yellow-50' : ''
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                {hasVariations && (
                                  <button
                                    onClick={() => toggleExpand(item.id)}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                                    title={expandedItems[item.id] ? "Hide variations" : "Show variations"}
                                  >
                                    {expandedItems[item.id] ? (
                                      <ChevronDown className="h-4 w-4 text-pet-orange" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-pet-orange" />
                                    )}
                                  </button>
                                )}
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <p
                                      className={`font-semibold text-pet-brown ${hasVariations ? 'cursor-pointer hover:text-pet-orange-dark transition-colors' : ''}`}
                                      onClick={() => hasVariations && toggleExpand(item.id)}
                                    >
                                      {item.menu_items?.name || 'Unknown'}
                                    </p>
                                    {hasVariations && (
                                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">
                                        {variations.length}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500">{item.menu_items?.category}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-1 text-sm">
                                <Barcode className="h-3 w-3 text-pet-orange" />
                                <span className="text-gray-600">{item.sku || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              {hasVariations ? (
                                <div className="flex flex-col">
                                  <span className="text-xl font-bold text-pet-brown">{totalVariationStock}</span>
                                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded w-max mt-0.5">Via Variations</span>
                                </div>
                              ) : (
                                <span className={`text-2xl font-bold ${item.current_stock < 0
                                  ? 'text-red-800 bg-red-100 px-2 py-1 rounded'
                                  : item.is_out_of_stock
                                    ? 'text-red-600'
                                    : item.is_low_stock
                                      ? 'text-yellow-600'
                                      : 'text-pet-brown'
                                  }`}>
                                  {item.current_stock}
                                  {item.current_stock < 0 && (
                                    <span className="text-xs ml-2 text-red-700">(NEGATIVE!)</span>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="text-gray-600">{hasVariations ? '-' : item.minimum_stock}</span>
                            </td>
                            <td className="p-3">
                              {hasVariations ? (
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">
                                  MULTIPLE
                                </span>
                              ) : item.is_out_of_stock ? (
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
                              <span className="text-gray-600">{hasVariations ? '-' : `₱${(item.unit_cost || 0).toFixed(2)}`}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-green-600">₱{stockValue.toFixed(2)}</span>
                            </td>
                            <td className="p-3">
                              {!hasVariations ? (
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setNewStockAmount(item.current_stock.toString());
                                    setNewCostPrice('');
                                    setNewMargin('');
                                    setShowAdjustModal(true);
                                  }}
                                  className="text-pet-orange hover:text-pet-orange-dark"
                                >
                                  <Edit className="h-5 w-5" />
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                          {hasVariations && expandedItems[item.id] && variations.map(variation => {
                            const vCostPrice = variation.cost_price || variation.price || 0;
                            const vStockValue = (variation.stock_on_hand || 0) * vCostPrice;
                            const vIsOutOfStock = (variation.stock_on_hand || 0) <= 0;
                            const vIsLowStock = (variation.stock_on_hand || 0) <= 5;
                            return (
                              <tr
                                key={variation.id}
                                className="border-b border-pet-beige bg-orange-50/10 hover:bg-orange-50/20"
                              >
                                <td className="p-3 pl-8">
                                  <div>
                                    <p className="font-semibold text-pet-brown-dark text-sm">↳ {variation.name}</p>
                                    <p className="text-xs text-gray-400">Variation</p>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="text-gray-400 text-xs">N/A</span>
                                </td>
                                <td className="p-3">
                                  <span className={`text-xl font-bold ${variation.stock_on_hand < 0
                                    ? 'text-red-800 bg-red-100 px-2 py-1 rounded'
                                    : vIsOutOfStock
                                      ? 'text-red-600'
                                      : vIsLowStock
                                        ? 'text-yellow-600'
                                        : 'text-pet-brown'
                                    }`}>
                                    {variation.stock_on_hand || 0}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="text-gray-400 text-xs">-</span>
                                </td>
                                <td className="p-3">
                                  {vIsOutOfStock ? (
                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                                      OUT OF STOCK
                                    </span>
                                  ) : vIsLowStock ? (
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
                                  <div className="text-sm">
                                    <span className="text-gray-600 block">Cost: ₱{vCostPrice.toFixed(2)}</span>
                                    <span className="text-xs text-gray-400 block">Margin: {variation.margin || 0}%</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="font-bold text-green-600">₱{vStockValue.toFixed(2)}</span>
                                </td>
                                <td className="p-3">
                                  <button
                                    onClick={() => {
                                      setSelectedItem({
                                        ...item,
                                        isVariation: true,
                                        variationId: variation.id,
                                        variationName: variation.name,
                                        current_stock: variation.stock_on_hand || 0,
                                        cost_price: vCostPrice,
                                        margin: variation.margin || 0
                                      });
                                      setNewStockAmount((variation.stock_on_hand || 0).toString());
                                      setNewCostPrice(vCostPrice.toString());
                                      setNewMargin((variation.margin || 0).toString());
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
                        </React.Fragment>
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

                  {selectedItem.isVariation && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-pet-brown mb-2">Cost Price (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newCostPrice}
                          onChange={(e) => setNewCostPrice(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                          placeholder="Cost price"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-pet-brown mb-2">Margin (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={newMargin}
                          onChange={(e) => setNewMargin(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                          placeholder="Margin percentage"
                          min="0"
                        />
                      </div>
                    </>
                  )}

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
                      disabled={!newStockAmount || !adjustReason || (selectedItem.isVariation && (!newCostPrice || !newMargin))}
                      className="flex-1 bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-3 rounded-lg font-bold hover:from-pet-orange-dark hover:to-pet-orange transition-all disabled:opacity-50"
                    >
                      Update Stock
                    </button>
                    <button
                      onClick={() => {
                        setShowAdjustModal(false);
                        setSelectedItem(null);
                        setNewStockAmount('');
                        setNewCostPrice('');
                        setNewMargin('');
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
        </>
      )}

      {/* Stock Movements Tab Content */}
      {activeTab === 'movements' && (
        <>
          {/* Date Range and Filters */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-pet-orange" />
                  <span className="text-sm font-semibold text-pet-brown">Date Range:</span>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-pet-brown">From:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="px-3 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-pet-brown">To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 border-l-0 md:border-l-2 md:pl-4 border-pet-beige">
                <span className="text-sm font-semibold text-pet-brown">Filter:</span>
                <button
                  onClick={() => setMovementFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${movementFilter === 'all'
                    ? 'bg-pet-orange text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setMovementFilter('in')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${movementFilter === 'in'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <ArrowUp className="h-4 w-4 inline mr-1" />
                  In
                </button>
                <button
                  onClick={() => setMovementFilter('out')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${movementFilter === 'out'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <ArrowDown className="h-4 w-4 inline mr-1" />
                  Out
                </button>
              </div>

              <div className="flex items-center space-x-3 border-l-0 md:border-l-2 md:pl-4 border-pet-beige">
                <div className="relative">
                  <input
                    type="text"
                    value={movementSearchQuery}
                    onChange={(e) => setMovementSearchQuery(e.target.value)}
                    placeholder="Search movements..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-transparent w-48"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <button
                  onClick={handleExportMovements}
                  className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stock Movements Table */}
          <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 overflow-x-auto">
            {movementsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pet-orange mx-auto mb-2"></div>
                <p>Loading stock movements...</p>
              </div>
            ) : filteredStockMovements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>No stock movements found for the selected period</p>
              </div>
            ) : (
              <div className="-mx-4 lg:mx-0">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b-2 border-pet-orange">
                      <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Date</th>
                      <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Product</th>
                      <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Type</th>
                      <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Quantity</th>
                      <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Before</th>
                      <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">After</th>
                      <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Reason</th>
                      <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockMovements.map((movement: any) => {
                      const isIn = movement.movement_type === 'in' || movement.movement_type === 'adjustment';
                      const isOut = movement.movement_type === 'out' || movement.movement_type === 'wastage';

                      return (
                        <tr
                          key={movement.id}
                          className={`border-b border-pet-beige hover:bg-pet-cream ${isIn ? 'bg-green-50' : isOut ? 'bg-red-50' : ''
                            }`}
                        >
                          <td className="p-3">
                            <span className="text-sm text-gray-600">
                              {formatDate(movement.movement_date)}
                            </span>
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-semibold text-pet-brown">{movement.menu_items?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{movement.menu_items?.category}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${isIn
                              ? 'bg-green-100 text-green-700'
                              : isOut
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                              }`}>
                              {isIn ? (
                                <><ArrowUp className="h-3 w-3 inline mr-1" />IN</>
                              ) : isOut ? (
                                <><ArrowDown className="h-3 w-3 inline mr-1" />OUT</>
                              ) : (
                                movement.movement_type?.toUpperCase()
                              )}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-lg font-bold ${isIn ? 'text-green-600' : isOut ? 'text-red-600' : 'text-gray-600'
                              }`}>
                              {isOut ? '-' : '+'}{movement.quantity}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600">{movement.stock_before || 'N/A'}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm font-semibold text-pet-brown">{movement.stock_after || 'N/A'}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600">{movement.reason || 'N/A'}</span>
                            {movement.notes && (
                              <p className="text-xs text-gray-500 mt-1">{movement.notes}</p>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              <p className="text-gray-600">{movement.reference_number}</p>
                              {movement.orders?.order_number && (
                                <p className="text-xs text-blue-600">Order: {movement.orders.order_number}</p>
                              )}
                              {movement.staff?.name && (
                                <p className="text-xs text-gray-500">By: {movement.staff.name}</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {stockMovements.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <ArrowUp className="h-6 w-6 text-green-600" />
                  <span className="text-xs bg-green-100 px-2 py-1 rounded">Total In</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stockMovements
                    .filter((m: any) => m.movement_type === 'in' || m.movement_type === 'adjustment')
                    .reduce((sum: number, m: any) => sum + (m.quantity || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Items received</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <ArrowDown className="h-6 w-6 text-red-600" />
                  <span className="text-xs bg-red-100 px-2 py-1 rounded">Total Out</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {stockMovements
                    .filter((m: any) => m.movement_type === 'out' || m.movement_type === 'wastage')
                    .reduce((sum: number, m: any) => sum + (m.quantity || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Items sold/wasted</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <Package className="h-6 w-6 text-pet-orange" />
                  <span className="text-xs bg-pet-cream px-2 py-1 rounded">Total Movements</span>
                </div>
                <p className="text-2xl font-bold text-pet-brown">
                  {stockMovements.length}
                </p>
                <p className="text-sm text-gray-600">Records found</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InventoryManagement;

