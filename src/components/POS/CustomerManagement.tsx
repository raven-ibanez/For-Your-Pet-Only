import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, Save, User, Phone, Mail, MapPin, PawPrint } from 'lucide-react';
import { posAPI } from '../../lib/pos';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  pet_name?: string;
  pet_type?: string;
  pet_breed?: string;
  pet_age?: number;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  created_at: string;
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    pet_name: '',
    pet_type: 'dog',
    pet_breed: '',
    pet_age: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await posAPI.getAllCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      try {
        const results = await posAPI.findCustomerByPhone(searchTerm);
        setCustomers(results);
      } catch (error) {
        console.error('Error searching:', error);
      }
    } else {
      loadCustomers();
    }
  };

  const handleAddCustomer = async () => {
    if (!formData.name || !formData.phone) {
      alert('Name and phone are required');
      return;
    }

    try {
      await posAPI.createCustomer({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        pet_name: formData.pet_name || undefined,
        pet_type: formData.pet_type || undefined,
        pet_breed: formData.pet_breed || undefined,
        pet_age: formData.pet_age ? parseInt(formData.pet_age) : undefined
      });

      setShowAddModal(false);
      resetForm();
      loadCustomers();
      alert('Customer added successfully!');
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Failed to add customer');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      pet_name: '',
      pet_type: 'dog',
      pet_breed: '',
      pet_age: ''
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.pet_name && customer.pet_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pet-orange-dark">👥 Customer Management</h1>
          <p className="text-pet-gray-medium mt-1">Manage customer profiles and pet information</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white px-6 py-3 rounded-lg font-semibold hover:from-pet-orange-dark hover:to-pet-orange transition-all flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by name, phone, or pet name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!e.target.value) loadCustomers();
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-3 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {loading ? (
          <div className="text-center py-8">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-pet-orange">
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Code</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Name</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Phone</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Pet Info</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Orders</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Total Spent</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Points</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="border-b border-pet-beige hover:bg-pet-cream">
                    <td className="p-3">
                      <span className="text-xs bg-pet-orange text-white px-2 py-1 rounded">
                        {customer.customer_code}
                      </span>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-semibold text-pet-brown">{customer.name}</p>
                        {customer.email && (
                          <p className="text-xs text-gray-500">{customer.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1 text-sm">
                        <Phone className="h-3 w-3 text-pet-orange" />
                        <span>{customer.phone}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {customer.pet_name ? (
                        <div>
                          <div className="flex items-center space-x-1">
                            <PawPrint className="h-3 w-3 text-pet-orange" />
                            <span className="font-semibold text-sm">{customer.pet_name}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {customer.pet_breed && `${customer.pet_breed} - `}
                            {customer.pet_type}
                            {customer.pet_age && `, ${customer.pet_age}y`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No pet</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-pet-orange-dark">{customer.total_orders}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-green-600">₱{customer.total_spent.toFixed(2)}</span>
                    </td>
                    <td className="p-3">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                        {customer.loyalty_points} pts
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-pet-orange p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-pet-orange-dark">Add New Customer</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Customer Info */}
              <div>
                <h3 className="font-bold text-pet-brown mb-3 flex items-center">
                  <User className="h-5 w-5 mr-2 text-pet-orange" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                      placeholder="Juan Dela Cruz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-pet-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                      placeholder="09123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                      placeholder="juan@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                      placeholder="123 Main St, Manila"
                    />
                  </div>
                </div>
              </div>

              {/* Pet Info */}
              <div>
                <h3 className="font-bold text-pet-brown mb-3 flex items-center">
                  <PawPrint className="h-5 w-5 mr-2 text-pet-orange" />
                  Pet Information (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-1">Pet Name</label>
                    <input
                      type="text"
                      value={formData.pet_name}
                      onChange={(e) => setFormData({ ...formData, pet_name: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                      placeholder="Buddy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-1">Pet Type</label>
                    <select
                      value={formData.pet_type}
                      onChange={(e) => setFormData({ ...formData, pet_type: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                    >
                      <option value="dog">🐕 Dog</option>
                      <option value="cat">🐈 Cat</option>
                      <option value="bird">🐦 Bird</option>
                      <option value="fish">🐠 Fish</option>
                      <option value="rabbit">🐰 Rabbit</option>
                      <option value="hamster">🐹 Hamster</option>
                      <option value="other">🐾 Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-1">Breed</label>
                    <input
                      type="text"
                      value={formData.pet_breed}
                      onChange={(e) => setFormData({ ...formData, pet_breed: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                      placeholder="Golden Retriever"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-pet-brown mb-1">Age (years)</label>
                    <input
                      type="number"
                      value={formData.pet_age}
                      onChange={(e) => setFormData({ ...formData, pet_age: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pet-orange"
                      placeholder="3"
                      min="0"
                      max="30"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-4 pt-4">
                <button
                  onClick={handleAddCustomer}
                  className="flex-1 bg-gradient-to-r from-pet-orange to-pet-orange-dark text-white py-3 rounded-lg font-bold hover:from-pet-orange-dark hover:to-pet-orange transition-all flex items-center justify-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>Save Customer</span>
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
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

export default CustomerManagement;

