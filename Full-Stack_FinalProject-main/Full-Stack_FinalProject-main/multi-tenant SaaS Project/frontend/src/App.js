import React, { useState, useEffect, createContext, useContext } from 'react';
import { AlertCircle, Building2, Palette, Settings, Users, BarChart3, Shield, LogOut } from 'lucide-react';

// Theme Context
const ThemeContext = createContext(null);

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Theme Provider Component
const ThemeProvider = ({ children, theme }) => {
  useEffect(() => {
    if (theme) {
      document.documentElement.style.setProperty('--primary', theme.primaryColor || '#3b82f6');
      document.documentElement.style.setProperty('--secondary', theme.secondaryColor || '#8b5cf6');
      document.documentElement.style.setProperty('--accent', theme.accentColor || '#10b981');
      document.documentElement.style.setProperty('--bg', theme.backgroundColor || '#ffffff');
      document.documentElement.style.setProperty('--text', theme.textColor || '#1f2937');
      document.documentElement.style.setProperty('--font', theme.fontFamily || 'Inter, system-ui, sans-serif');
    }
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

// Mock API Service
const api = {
  baseURL: '/api',
  
  async fetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(tenantId && { 'X-Tenant-ID': tenantId }),
      'X-Correlation-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  // Auth endpoints
  async login(tenantId, email, password) {
    // Mock implementation
    return {
      token: `mock-token-${tenantId}`,
      user: { id: '1', email, name: email.split('@')[0], tenantId, role: 'admin' },
      theme: this.getMockTheme(tenantId)
    };
  },

  // Tenant endpoints
  async getTenantConfig() {
    const tenantId = localStorage.getItem('tenantId');
    return this.getMockTheme(tenantId);
  },

  async updateTenantConfig(config) {
    return { success: true, config };
  },

  // Resources endpoints
  async getResources(page = 1, limit = 10) {
    const tenantId = localStorage.getItem('tenantId');
    return {
      data: Array.from({ length: limit }, (_, i) => ({
        id: `${tenantId}-res-${(page - 1) * limit + i + 1}`,
        name: `Resource ${(page - 1) * limit + i + 1}`,
        type: ['Document', 'Image', 'Video'][Math.floor(Math.random() * 3)],
        createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        tenantId
      })),
      pagination: { page, limit, total: 100, pages: 10 }
    };
  },

  // Mock themes
  getMockTheme(tenantId) {
    const themes = {
      acme: {
        name: 'ACME Corporation',
        logo: '🏢',
        primaryColor: '#dc2626',
        secondaryColor: '#991b1b',
        accentColor: '#fbbf24',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: 'system-ui, sans-serif'
      },
      techstart: {
        name: 'TechStart Inc',
        logo: '🚀',
        primaryColor: '#3b82f6',
        secondaryColor: '#1d4ed8',
        accentColor: '#10b981',
        backgroundColor: '#f9fafb',
        textColor: '#111827',
        fontFamily: 'Inter, sans-serif'
      },
      default: {
        name: 'Default Tenant',
        logo: '🏛️',
        primaryColor: '#6366f1',
        secondaryColor: '#4f46e5',
        accentColor: '#8b5cf6',
        backgroundColor: '#ffffff',
        textColor: '#374151',
        fontFamily: 'system-ui, sans-serif'
      }
    };
    return themes[tenantId] || themes.default;
  }
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedTheme = localStorage.getItem('theme');
    
    if (token && savedUser && savedTheme) {
      setUser(JSON.parse(savedUser));
      setTheme(JSON.parse(savedTheme));
    }
    setLoading(false);
  }, []);

  const login = async (tenantId, email, password) => {
    try {
      const response = await api.login(tenantId, email, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('tenantId', tenantId);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('theme', JSON.stringify(response.theme));
      setUser(response.user);
      setTheme(response.theme);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('user');
    localStorage.removeItem('theme');
    setUser(null);
    setTheme(null);
  };

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', JSON.stringify(newTheme));
  };

  return (
    <AuthContext.Provider value={{ user, theme, loading, login, logout, updateTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const LoginPage = () => {
  const { login } = useAuth();
  const [tenantId, setTenantId] = useState('acme');
  const [email, setEmail] = useState('admin@acme.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(tenantId, email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Multi-Tenant SaaS</h1>
          <p className="text-gray-600 mt-2">Secure, isolated tenant access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant ID
            </label>
            <select
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setEmail(e.target.value === 'acme' ? 'admin@acme.com' : 'admin@techstart.com');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="acme">acme (ACME Corp)</option>
              <option value="techstart">techstart (TechStart Inc)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Demo credentials pre-filled. Each tenant has isolated data and custom branding.
          </p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Header
const DashboardHeader = () => {
  const { user, theme, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{theme?.logo}</span>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
              {theme?.name}
            </h1>
            <p className="text-sm text-gray-600">Tenant: {user?.tenantId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

// Navigation
const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'resources', label: 'Resources', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-6">
      <div className="flex gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Dashboard Tab
const DashboardTab = () => {
  const { user, theme } = useAuth();
  
  const stats = [
    { label: 'Total Users', value: '1,234', change: '+12%', icon: Users },
    { label: 'Active Sessions', value: '89', change: '+5%', icon: Shield },
    { label: 'Resources', value: '456', change: '+23%', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
        <p className="text-gray-600">
          You're viewing data for <strong>{theme?.name}</strong> (ID: {user?.tenantId})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Icon className="w-8 h-8" style={{ color: 'var(--primary)' }} />
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Data Isolation Active</h3>
            <p className="text-sm text-blue-800">
              All data queries are automatically filtered by your tenant ID ({user?.tenantId}).
              You can only see and modify resources belonging to your organization.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Correlation ID: {Date.now()}-{Math.random().toString(36).substr(2, 9)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Resources Tab
const ResourcesTab = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadResources();
  }, [page]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await api.getResources(page, 10);
      setResources(data.data);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resources</h2>
          <p className="text-gray-600">Tenant-isolated resource list</p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-white font-medium"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          Add Resource
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading resources...</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resources.map(resource => (
                  <tr key={resource.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{resource.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{resource.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(resource.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {resource.tenantId}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of 10</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === 10}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Settings Tab
const SettingsTab = () => {
  const { theme, updateTheme } = useAuth();
  const [config, setConfig] = useState(theme || {});
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await api.updateTenantConfig(config);
      updateTheme(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tenant Settings</h2>
        <p className="text-gray-600">Customize your organization's branding and theme</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organization Name
          </label>
          <input
            type="text"
            value={config.name || ''}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo Emoji
          </label>
          <input
            type="text"
            value={config.logo || ''}
            onChange={(e) => setConfig({ ...config, logo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <input
              type="color"
              value={config.primaryColor || '#3b82f6'}
              onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
              className="w-full h-10 rounded-md cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <input
              type="color"
              value={config.secondaryColor || '#8b5cf6'}
              onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
              className="w-full h-10 rounded-md cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <input
              type="color"
              value={config.accentColor || '#10b981'}
              onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
              className="w-full h-10 rounded-md cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <input
              type="color"
              value={config.textColor || '#1f2937'}
              onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
              className="w-full h-10 rounded-md cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Save Changes
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">✓ Changes saved!</span>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Palette className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Runtime Theming</h3>
            <p className="text-sm text-yellow-800">
              Theme changes apply immediately using CSS variables. No redeployment required.
              All users of your tenant will see the updated branding on their next page load.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'resources' && <ResourcesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

// Main App
const App = () => {
  const { user, theme, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <ThemeProvider theme={theme}>
      <Dashboard />
    </ThemeProvider>
  );
};

// Root Component
const Root = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default Root;