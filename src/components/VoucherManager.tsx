import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Tag, Percent, Truck, HelpCircle } from 'lucide-react';
import { useVouchers, Voucher } from '../hooks/useVouchers';

interface VoucherManagerProps {
  onBack: () => void;
}

const VoucherManager: React.FC<VoucherManagerProps> = ({ onBack }) => {
  const { vouchers, loading, addVoucher, updateVoucher, deleteVoucher } = useVouchers();
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [type, setType] = useState<'free_delivery' | 'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Voucher code is required');
      return;
    }

    const numericValue = parseFloat(value);
    if (type !== 'free_delivery' && (isNaN(numericValue) || numericValue <= 0)) {
      setErrorMsg('Please enter a valid value greater than 0');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg('');
      await addVoucher(code, type, numericValue || 0);
      setCode('');
      setType('percentage');
      setValue('');
      setIsAdding(false);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('unique') || err.code === '23505') {
        setErrorMsg('Voucher code already exists. Please use a unique code.');
      } else {
        setErrorMsg('Failed to create voucher. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      await updateVoucher(voucher.id, { active: !voucher.active });
    } catch (err) {
      alert('Failed to update voucher status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;
    try {
      await deleteVoucher(id);
    } catch (err) {
      alert('Failed to delete voucher');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Dashboard</span>
              </button>
              <h1 className="text-2xl font-playfair font-semibold text-black">Voucher Settings</h1>
            </div>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Create Voucher</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Create Form Card */}
        {isAdding && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">Create New Voucher</h2>
            <form onSubmit={handleCreate} className="space-y-6">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Code *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase font-semibold text-gray-950"
                  placeholder="e.g., FURBABY10, FREESHIP"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Codes will automatically be capitalized</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voucher Type *</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setType(newType);
                      if (newType === 'free_delivery') {
                        setValue('');
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-950 bg-white"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Amount (₱)</option>
                    <option value="free_delivery">Free Delivery</option>
                  </select>
                </div>

                {type !== 'free_delivery' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {type === 'percentage' ? 'Percentage Discount (%) *' : 'Discount Amount (₱) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={type === 'percentage' ? '100' : undefined}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-950"
                      placeholder={type === 'percentage' ? 'e.g., 10' : 'e.g., 30'}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setErrorMsg('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Voucher List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading vouchers...</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🎫</div>
              <h3 className="text-lg font-medium text-gray-950 mb-1">No vouchers created yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">Create customizable codes to offer discounts or free shipping options to your customers.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
              >
                Create First Voucher
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Voucher Code</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Discount Value</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-bold bg-green-50 text-green-800 border border-green-200 font-mono">
                          <Tag className="h-3.5 w-3.5 mr-1.5" />
                          {voucher.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {voucher.type === 'percentage' && (
                          <span className="flex items-center">
                            <Percent className="h-4 w-4 mr-1.5 text-blue-500" /> Percentage Off
                          </span>
                        )}
                        {voucher.type === 'fixed' && (
                          <span className="flex items-center">
                            <span className="mr-1.5 text-orange-500 font-bold">₱</span> Fixed Price Off
                          </span>
                        )}
                        {voucher.type === 'free_delivery' && (
                          <span className="flex items-center">
                            <RouteIconWrapper /> Free Shipping
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {voucher.type === 'percentage' && `${voucher.value}%`}
                        {voucher.type === 'fixed' && `₱${voucher.value.toFixed(2)}`}
                        {voucher.type === 'free_delivery' && 'FREE'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(voucher)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            voucher.active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } transition-colors`}
                        >
                          {voucher.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(voucher.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
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

// Simple helper component to avoid React router issues or missing packages
const RouteIconWrapper = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mr-1.5 text-purple-500"
  >
    <circle cx="5" cy="18" r="3" />
    <circle cx="19" cy="6" r="3" />
    <path d="M9 18h2a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h2" />
  </svg>
);

export default VoucherManager;
