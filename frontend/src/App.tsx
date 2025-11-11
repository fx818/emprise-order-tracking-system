import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
import { ProtectedRoute } from './routes/protected';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthProvider } from './context/AuthProvider';
import { MainLayout } from './components/layout/MainLayout';
import { HelmetProvider } from 'react-helmet-async';
import './App.css';

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./features/dashboards/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const OffersPage = lazy(() => import('./features/budgetary-offers/pages/OffersPage').then(m => ({ default: m.OffersPage })));
const FDRsPage = lazy(() => import('./features/fdrs/pages/FDRsPage').then(m => ({ default: m.FDRsPage })));
const LOAsPage = lazy(() => import('./features/loas/pages/LOAsPage').then(m => ({ default: m.LOAsPage })));
const PurchaseOrdersPage = lazy(() => import('./features/purchase-orders/pages/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })));
const VendorsPage = lazy(() => import('./features/vendors/pages/VendorsPage').then(m => ({ default: m.VendorsPage })));
const ItemsPage = lazy(() => import('./features/items/pages/ItemsPage').then(m => ({ default: m.ItemsPage })));
const SitesPage = lazy(() => import('./features/sites/pages/SitesPage').then(m => ({ default: m.SitesPage })));
const CustomersPage = lazy(() => import('./features/customers/pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const TendersPage = lazy(() => import('./features/tenders/pages/TendersPage').then(m => ({ default: m.TendersPage })));

function App() {
  return (
    <HelmetProvider>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/budgetary-offers/*" element={<OffersPage />} />
                  <Route path="/fdrs/*" element={<FDRsPage />} />
                  <Route path="/loas/*" element={<LOAsPage />} />
                  <Route path="/purchase-orders/*" element={<PurchaseOrdersPage />} />
                  <Route path="/items/*" element={<ItemsPage />} />
                  <Route path="/vendors/*" element={<VendorsPage />} />
                  <Route path="/sites/*" element={<SitesPage />} />
                  <Route path="/customers/*" element={<CustomersPage />} />
                  <Route path="/tenders/*" element={<TendersPage />} />

                  {/* Redirect root to dashboard if authenticated */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  {/* Catch all route - 404 */}
                  <Route
                    path="*"
                    element={
                      <div className="flex items-center justify-center min-h-screen">
                        <div className="text-center">
                          <h1 className="text-4xl font-bold">404</h1>
                          <p className="text-gray-600">Page not found</p>
                        </div>
                      </div>
                    }
                  />
                </Route>
              </Routes>
            </Suspense>
            <Toaster />
            <Sonner />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;