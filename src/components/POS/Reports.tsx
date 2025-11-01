import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Coins, ShoppingCart, Users, CreditCard } from 'lucide-react';
import { posAPI } from '../../lib/pos';

const Reports: React.FC = () => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [todaySales, setTodaySales] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;

      const [sales, products, payments, staff] = await Promise.all([
        posAPI.getDailySales(),
        posAPI.getTopProducts(days),
        posAPI.getPaymentMethodBreakdown(days),
        posAPI.getStaffPerformance(days)
      ]);

      setTodaySales(sales);
      setTopProducts(products || []);
      setPaymentBreakdown(payments || []);
      setStaffPerformance(staff || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodDays = period === 'today' ? 1 : period === 'week' ? 7 : 30;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pet-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pet-orange-dark">📊 Sales Reports & Analytics</h1>
          <p className="text-pet-gray-medium mt-1">Comprehensive business insights and performance metrics</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-pet-orange" />
          <span className="text-sm font-semibold text-pet-brown">Time Period:</span>
          <button
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              period === 'today'
                ? 'bg-pet-orange text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              period === 'week'
                ? 'bg-pet-orange text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              period === 'month'
                ? 'bg-pet-orange text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-pet-orange">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl text-pet-orange font-bold">₱</div>
          </div>
          <h3 className="text-3xl font-bold text-pet-orange-dark">
            ₱{(todaySales?.total_sales || 0).toFixed(2)}
          </h3>
          <p className="text-sm text-pet-gray-medium mt-1">Total Sales</p>
          <p className="text-xs text-pet-orange mt-2">{period === 'today' ? 'Today' : `Last ${periodDays} days`}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-blue-600">
            {todaySales?.total_orders || 0}
          </h3>
          <p className="text-sm text-pet-gray-medium mt-1">Total Orders</p>
          <p className="text-xs text-blue-600 mt-2">Transactions</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-3xl font-bold text-green-600">
            ₱{(todaySales?.average_order_value || 0).toFixed(2)}
          </h3>
          <p className="text-sm text-pet-gray-medium mt-1">Avg Order Value</p>
          <p className="text-xs text-green-600 mt-2">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-3xl font-bold text-purple-600">
            {todaySales?.total_customers || 0}
          </h3>
          <p className="text-sm text-pet-gray-medium mt-1">Customers Served</p>
          <p className="text-xs text-purple-600 mt-2">Unique customers</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-pet-brown mb-4">🏆 Top Selling Products</h2>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No sales data yet</p>
            ) : (
              topProducts.slice(0, 10).map((product: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-pet-cream rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <div>
                      <p className="font-semibold text-pet-brown">{product.product_name}</p>
                      <p className="text-xs text-pet-gray-medium">
                        {product.total_quantity} sold • {product.times_ordered} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-pet-orange-dark">₱{parseFloat(product.total_revenue || 0).toFixed(2)}</p>
                    {product.profit_margin !== null && (
                      <p className="text-xs text-green-600">{parseFloat(product.profit_margin).toFixed(1)}% margin</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-pet-brown mb-4">💳 Payment Methods</h2>
          <div className="space-y-3">
            {paymentBreakdown.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No payment data yet</p>
            ) : (
              paymentBreakdown.map((payment: any, index: number) => (
                <div key={index} className="p-4 bg-pet-cream rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 text-pet-orange" />
                      <span className="font-semibold text-pet-brown capitalize">
                        {payment.payment_method}
                      </span>
                    </div>
                    <span className="font-bold text-pet-orange-dark">
                      ₱{parseFloat(payment.total_amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-pet-gray-medium">
                      {payment.transaction_count} transactions
                    </span>
                    <span className="text-pet-orange font-semibold">
                      {parseFloat(payment.percentage || 0).toFixed(1)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pet-orange h-2 rounded-full transition-all"
                      style={{ width: `${payment.percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6">
        <h2 className="text-xl font-bold text-pet-brown mb-4">👤 Staff Performance</h2>
        <div className="overflow-x-auto -mx-4 lg:mx-0 px-4 lg:px-0">
          {staffPerformance.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No staff data yet</p>
          ) : (
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-pet-orange">
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Staff Name</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Orders</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Sales</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Avg</th>
                  <th className="text-left p-2 lg:p-3 font-bold text-pet-brown text-xs lg:text-sm">Per Day</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.map((staff: any, index: number) => (
                  <tr key={index} className="border-b border-pet-beige hover:bg-pet-cream">
                    <td className="p-3">
                      <span className="font-semibold text-pet-brown">{staff.staff_name}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-blue-600">{staff.total_orders || 0}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-pet-orange-dark">
                        ₱{parseFloat(staff.total_sales || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-green-600">₱{parseFloat(staff.average_order_value || 0).toFixed(2)}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-purple-600">{parseFloat(staff.orders_per_day || 0).toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;

