import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RequestsTrackerPage from './pages/RequestsTrackerPage';
import SubmissionPage from './pages/SubmissionPage';
import RequestDetailsPage from './pages/RequestDetailsPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import BatchShipmentPage from './pages/BatchShipmentPage';
import BatchesListPage from './pages/BatchesListPage';
import NotificationsPage from './pages/NotificationsPage';
import Layout from './components/Layout';

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />

      <Route path="/" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
      <Route path="/requests" element={<PrivateRoute><Layout><RequestsTrackerPage /></Layout></PrivateRoute>} />
      <Route path="/submit" element={<PrivateRoute><Layout><SubmissionPage /></Layout></PrivateRoute>} />
      <Route path="/edit/:id" element={<PrivateRoute><Layout><SubmissionPage /></Layout></PrivateRoute>} />
      <Route path="/details/:id" element={<PrivateRoute><Layout><RequestDetailsPage /></Layout></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><Layout><AdminPage /></Layout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>} />
      <Route path="/shipment" element={<PrivateRoute><Layout><BatchShipmentPage /></Layout></PrivateRoute>} />
      <Route path="/batches" element={<PrivateRoute><Layout><BatchesListPage /></Layout></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Layout><NotificationsPage /></Layout></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 text-slate-900">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
