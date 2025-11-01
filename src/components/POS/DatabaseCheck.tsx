import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DatabaseStatus {
  tables: { [key: string]: boolean };
  functions: { [key: string]: boolean };
  hasStaff: boolean;
  hasInventory: boolean;
  errors: string[];
}

const DatabaseCheck: React.FC = () => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    setChecking(true);
    const newStatus: DatabaseStatus = {
      tables: {},
      functions: {},
      hasStaff: false,
      hasInventory: false,
      errors: []
    };

    try {
      // Check critical tables
      const tablesToCheck = ['customers', 'staff', 'orders', 'order_items', 'payments', 'inventory'];
      
      for (const table of tablesToCheck) {
        try {
          const { error } = await supabase.from(table).select('id').limit(1);
          newStatus.tables[table] = !error;
          if (error) newStatus.errors.push(`Table '${table}' not found`);
        } catch {
          newStatus.tables[table] = false;
          newStatus.errors.push(`Table '${table}' error`);
        }
      }

      // Check if staff exists
      try {
        const { data, error } = await supabase.from('staff').select('id').limit(1);
        newStatus.hasStaff = !error && data && data.length > 0;
      } catch {
        newStatus.hasStaff = false;
      }

      // Check if inventory exists
      try {
        const { data, error } = await supabase.from('inventory').select('id').limit(1);
        newStatus.hasInventory = !error && data && data.length > 0;
      } catch {
        newStatus.hasInventory = false;
      }

    } catch (error) {
      newStatus.errors.push('Failed to connect to database');
    }

    setStatus(newStatus);
    setChecking(false);
  };

  if (checking) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
        <div className="flex items-center">
          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin mr-3" />
          <p className="text-blue-800 font-semibold">Checking database status...</p>
        </div>
      </div>
    );
  }

  const allTablesOk = status && Object.values(status.tables).every(v => v);
  const hasData = status && status.hasStaff && status.hasInventory;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      {allTablesOk && hasData ? (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="text-green-800 font-bold text-lg">✅ Database Ready!</p>
              <p className="text-green-700 text-sm mt-1">All systems operational. You can use all POS features.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start">
            <XCircle className="h-6 w-6 text-red-600 mr-3 mt-1" />
            <div className="flex-1">
              <p className="text-red-800 font-bold text-lg">⚠️ Database Setup Required</p>
              <p className="text-red-700 text-sm mt-1">
                The POS database is not fully configured. Please complete the setup below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Status */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-bold text-pet-brown mb-4">Database Status Details</h3>
        
        {/* Tables */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-pet-gray-medium mb-2">Tables:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {status && Object.entries(status.tables).map(([table, exists]) => (
              <div key={table} className="flex items-center space-x-2">
                {exists ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm ${exists ? 'text-green-700' : 'text-red-700'}`}>
                  {table}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Check */}
        <div>
          <p className="text-sm font-semibold text-pet-gray-medium mb-2">Data:</p>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {status?.hasStaff ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${status?.hasStaff ? 'text-green-700' : 'text-red-700'}`}>
                Staff records {status?.hasStaff ? 'exist' : 'missing'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {status?.hasInventory ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${status?.hasInventory ? 'text-green-700' : 'text-red-700'}`}>
                Inventory records {status?.hasInventory ? 'exist' : 'missing'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      {!allTablesOk && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-800 font-bold mb-2">Setup Required</h3>
              <p className="text-yellow-700 text-sm mb-4">
                Run these SQL files in your Supabase SQL Editor:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
                <li>
                  <code className="bg-yellow-100 px-2 py-1 rounded">
                    supabase/migrations/20250102000000_create_pos_system.sql
                  </code>
                </li>
                <li>
                  <code className="bg-yellow-100 px-2 py-1 rounded">
                    supabase/migrations/20250102000001_pos_advanced_features.sql
                  </code>
                </li>
                <li>
                  Then click the refresh button to re-check
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Set Inventory Instructions */}
      {allTablesOk && !status?.hasInventory && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-blue-800 font-bold mb-2">Set Initial Inventory</h3>
              <p className="text-blue-700 text-sm mb-4">
                Run this SQL in Supabase to set starting stock:
              </p>
              <code className="block bg-blue-100 px-4 py-3 rounded text-sm font-mono text-blue-900">
                UPDATE inventory SET current_stock = 100, minimum_stock = 10 WHERE is_tracked = true;
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={checkDatabase}
          disabled={checking}
          className="px-6 py-3 bg-pet-orange text-white rounded-lg font-semibold hover:bg-pet-orange-dark transition-colors disabled:opacity-50 flex items-center space-x-2 mx-auto"
        >
          <RefreshCw className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} />
          <span>Re-check Database</span>
        </button>
      </div>
    </div>
  );
};

export default DatabaseCheck;

