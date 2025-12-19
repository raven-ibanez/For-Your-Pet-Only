import React, { useState } from 'react';
import { Save, Upload, X, AlertTriangle } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useImageUpload } from '../hooks/useImageUpload';
import { posAPI } from '../lib/pos';

const SiteSettingsManager: React.FC = () => {
  const { siteSettings, loading, updateSiteSettings } = useSiteSettings();
  const { uploadImage, uploading } = useImageUpload();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    site_name: '',
    site_description: '',
    currency: '',
    currency_code: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    orders: false,
    cashLedger: false,
    creditLedger: false,
    paymentLedger: false,
    customerList: false,
    expenses: false
  });

  React.useEffect(() => {
    if (siteSettings) {
      setFormData({
        site_name: siteSettings.site_name,
        site_description: siteSettings.site_description,
        currency: siteSettings.currency,
        currency_code: siteSettings.currency_code
      });
      setLogoPreview(siteSettings.site_logo);
    }
  }, [siteSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      let logoUrl = logoPreview;

      // Upload new logo if selected
      if (logoFile) {
        const uploadedUrl = await uploadImage(logoFile);
        logoUrl = uploadedUrl;
      }

      // Update all settings
      await updateSiteSettings({
        site_name: formData.site_name,
        site_description: formData.site_description,
        currency: formData.currency,
        currency_code: formData.currency_code,
        site_logo: logoUrl
      });

      setIsEditing(false);
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving site settings:', error);
    }
  };

  const handleCancel = () => {
    if (siteSettings) {
      setFormData({
        site_name: siteSettings.site_name,
        site_description: siteSettings.site_description,
        currency: siteSettings.currency,
        currency_code: siteSettings.currency_code
      });
      setLogoPreview(siteSettings.site_logo);
    }
    setIsEditing(false);
    setLogoFile(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }




  const handleOpenResetModal = () => {
    setShowResetModal(true);
  };

  const handleResetOptionChange = (key: keyof typeof resetOptions) => {
    setResetOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const executeReset = async () => {
    // Basic validation
    if (!Object.values(resetOptions).some(v => v)) {
      alert('Please select at least one item to reset.');
      return;
    }

    if (!confirm('FINAL WARNING: The selected data will be permanently erased. Are you sure?')) {
      return;
    }

    try {
      setIsResetting(true);

      const tasks = [];

      // 1. Orders
      if (resetOptions.orders) {
        tasks.push(posAPI.resetOrders());
      }

      // 2. Ledgers (Payments)
      if (resetOptions.paymentLedger) {
        // If "Payment Ledger" is checked, it covers everything, so just reset all payments
        tasks.push(posAPI.resetPayments());
      } else {
        // Granular payment resets
        if (resetOptions.cashLedger) {
          tasks.push(posAPI.resetPaymentsByMethod('cash'));
        }
        if (resetOptions.creditLedger) {
          tasks.push(posAPI.resetPaymentsByMethod('credit'));
        }
      }

      // 3. Customers
      if (resetOptions.customerList) {
        tasks.push(posAPI.resetCustomers());
      }

      // 4. Expenses (Placeholder)
      if (resetOptions.expenses) {
        tasks.push(posAPI.resetExpenses());
      }

      await Promise.all(tasks);

      alert('✅ Selected data has been successfully reset.');
      setShowResetModal(false);
      // Reset options
      setResetOptions({
        orders: false,
        cashLedger: false,
        creditLedger: false,
        paymentLedger: false,
        customerList: false,
        expenses: false
      });
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Failed to reset selected data. Check console for details.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-noto font-semibold text-black">Site Settings</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Edit Settings</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                disabled={uploading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{uploading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Site Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Logo
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Site Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-2xl text-gray-400">☕</div>
                )}
              </div>
              {isEditing && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center space-x-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload Logo</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="site_name"
                value={formData.site_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter site name"
              />
            ) : (
              <p className="text-lg font-medium text-black">{siteSettings?.site_name}</p>
            )}
          </div>

          {/* Site Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Description
            </label>
            {isEditing ? (
              <textarea
                name="site_description"
                value={formData.site_description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter site description"
              />
            ) : (
              <p className="text-gray-600">{siteSettings?.site_description}</p>
            )}
          </div>

          {/* Currency Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency Symbol
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., ₱, $, €"
                />
              ) : (
                <p className="text-lg font-medium text-black">{siteSettings?.currency}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency Code
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="currency_code"
                  value={formData.currency_code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., PHP, USD, EUR"
                />
              ) : (
                <p className="text-lg font-medium text-black">{siteSettings?.currency_code}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-bold text-red-600">Danger Zone</h2>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <h3 className="font-bold text-red-800 mb-2">Reset Order History</h3>
          <p className="text-sm text-red-700 mb-4">
            This action will permanently delete all orders, payments, and order-related stock movements.
            This is intended for clearing test data before deployment.
            <strong>This action cannot be undone.</strong>
          </p>
          <button
            onClick={handleOpenResetModal}
            disabled={isResetting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isResetting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Reset All History</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reset Modal Overlay */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-white p-6 pb-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-red-500">Reset Warning</h3>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-gray-600 text-sm">
                Warning! This will erase the selected data permanently. Make sure you have an internet connection to continue.
              </p>
            </div>

            {/* Options */}
            <div className="px-6 py-2 space-y-3">
              {[
                { key: 'orders', label: 'Orders' },
                { key: 'cashLedger', label: 'Cash Ledger' },
                { key: 'creditLedger', label: 'Credit Ledger' },
                { key: 'paymentLedger', label: 'Payment Ledger' },
                { key: 'customerList', label: 'Customer List' },
                { key: 'expenses', label: 'Expenses' },
              ].map((option) => (
                <div key={option.key} className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">{option.label}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-green-500 font-semibold text-sm">Safe</span>
                    <input
                      type="checkbox"
                      checked={(resetOptions as any)[option.key]}
                      onChange={() => handleResetOptionChange(option.key as keyof typeof resetOptions)}
                      className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-purple-500 text-purple-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 flex items-center justify-between space-x-4">
              <button
                onClick={() => setShowResetModal(false)}
                className="text-gray-600 font-semibold hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={executeReset}
                className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-lg font-bold flex items-center space-x-2 shadow-lg transition-transform transform active:scale-95"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>RESETTING...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-white" />
                    <span>Hard Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteSettingsManager;
