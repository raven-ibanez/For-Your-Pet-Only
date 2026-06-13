import React, { useState } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Truck } from 'lucide-react';
import { useDeliverySettings } from '../hooks/useDeliverySettings';
import { DeliverySubdivision } from '../types';

interface DeliverySettingsManagerProps {
  onBack: () => void;
}

const DeliverySettingsManager: React.FC<DeliverySettingsManagerProps> = ({ onBack }) => {
  const {
    subdivisions,
    globalSettings,
    loading,
    addSubdivision,
    updateSubdivision,
    deleteSubdivision,
    toggleFreeDeliveryPromo
  } = useDeliverySettings();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newFee, setNewFee] = useState('');
  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [togglingPromo, setTogglingPromo] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setIsProcessing(true);
      await addSubdivision(newName.trim(), parseFloat(newFee) || 0);
      setNewName('');
      setNewFee('');
      setIsAdding(false);
    } catch {
      alert('Failed to add subdivision.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (sub: DeliverySubdivision) => {
    setEditingId(sub.id);
    setEditName(sub.name);
    setEditFee(sub.delivery_fee.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      setIsProcessing(true);
      await updateSubdivision(editingId, {
        name: editName.trim(),
        delivery_fee: parseFloat(editFee) || 0
      });
      setEditingId(null);
    } catch {
      alert('Failed to update subdivision.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      setIsProcessing(true);
      await deleteSubdivision(id);
    } catch {
      alert('Failed to delete subdivision.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (sub: DeliverySubdivision) => {
    try {
      await updateSubdivision(sub.id, { active: !sub.active });
    } catch {
      alert('Failed to toggle status.');
    }
  };

  const handleTogglePromo = async () => {
    try {
      setTogglingPromo(true);
      await toggleFreeDeliveryPromo(!globalSettings.free_delivery_promo);
    } catch {
      alert('Failed to toggle promo.');
    } finally {
      setTogglingPromo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pet-orange"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200 mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-3">
            <Truck className="h-7 w-7 text-pet-orange" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Delivery Settings</h1>
          </div>
        </div>

        {/* Free Delivery Promo Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <span>🎉</span>
                <span>Free Delivery Promo</span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                When enabled, all delivery fees become ₱0.00 for Store Delivery Rider orders.
              </p>
            </div>
            <button
              onClick={handleTogglePromo}
              disabled={togglingPromo}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                globalSettings.free_delivery_promo
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                  globalSettings.free_delivery_promo ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {globalSettings.free_delivery_promo && (
            <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-sm text-green-700 font-medium">
                ✅ Free Delivery Promo is <strong>ACTIVE</strong> — All delivery fees are ₱0.00
              </p>
            </div>
          )}
        </div>

        {/* Subdivisions List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">🏘️ Subdivisions & Delivery Fees</h3>
            <button
              onClick={() => {
                setIsAdding(true);
                setNewName('');
                setNewFee('');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-pet-orange text-white rounded-lg hover:bg-pet-orange-dark transition-colors duration-200 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Add Subdivision</span>
            </button>
          </div>

          {/* Add Form */}
          {isAdding && (
            <div className="bg-pet-beige rounded-lg p-4 mb-4 border-2 border-pet-orange">
              <h4 className="font-medium text-gray-900 mb-3">Add New Subdivision</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdivision Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange"
                    placeholder="e.g., Villa Rosa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pet-orange focus:border-pet-orange"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-3">
                <button
                  onClick={handleAdd}
                  disabled={isProcessing || !newName.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  <Save className="h-4 w-4" />
                  <span>{isProcessing ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* Subdivisions Table */}
          {subdivisions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No subdivisions added yet.</p>
              <p className="text-sm">Click "Add Subdivision" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Subdivision Name</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Delivery Fee</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subdivisions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {editingId === sub.id ? (
                        <>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-pet-orange text-sm"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editFee}
                              onChange={(e) => setEditFee(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-pet-orange text-sm text-right"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${sub.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {sub.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={isProcessing}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">{sub.name}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {globalSettings.free_delivery_promo ? (
                              <span className="text-green-600 font-semibold">
                                FREE <span className="text-gray-400 line-through text-xs ml-1">₱{sub.delivery_fee.toFixed(2)}</span>
                              </span>
                            ) : (
                              <span className="font-semibold text-gray-900">₱{sub.delivery_fee.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleActive(sub)}
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                sub.active
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {sub.active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(sub)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(sub.id, sub.name)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliverySettingsManager;
