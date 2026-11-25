import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ToastContainer from './components/Toast';
import MessageBoxContainer from './components/MessageBox';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { hasSession } from './utils/session';

const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Vehicles = lazy(() => import('./components/Vehicles'));
const VehicleForm = lazy(() => import('./components/VehicleForm'));
const GpsTracking = lazy(() => import('./components/GpsTracking'));
const Clients = lazy(() => import('./components/Clients'));
const Contracts = lazy(() => import('./components/Contracts'));
const Reservations = lazy(() => import('./components/Reservations'));
const Calendar = lazy(() => import('./components/Calendar'));

const AddClient = lazy(() => import('./components/AddClient'));
const EditClient = lazy(() => import('./components/EditClient'));
const EditContract = lazy(() => import('./components/EditContract'));
const ContractForm = lazy(() => import('./components/ContractForm'));
const ReservationForm = lazy(() => import('./components/ReservationForm'));
const AgencyManagement = lazy(() => import('./components/AgencyManagement'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Subscriptions = lazy(() => import('./components/Subscriptions'));
const Payments = lazy(() => import('./components/Payments'));
const Expenses = lazy(() => import('./components/Expenses'));
const Invoices = lazy(() => import('./components/Invoices'));
const Reports = lazy(() => import('./components/Reports'));
const Infractions = lazy(() => import('./components/Infractions'));
const Maintenance = lazy(() => import('./components/Maintenance'));
const Marketplace = lazy(() => import('./components/Marketplace'));
const Settings = lazy(() => import('./components/Settings'));
const NotFound = lazy(() => import('./components/NotFound'));
const ClientRoute = lazy(() => import('./components/client/ClientRoute'));
const ClientHome = lazy(() => import('./components/client/ClientHome'));
const ClientContracts = lazy(() => import('./components/client/ClientContracts'));
const ClientContractDetail = lazy(() => import('./components/client/ClientContractDetail'));
const ClientReservations = lazy(() => import('./components/client/ClientReservations'));
const ClientProfile = lazy(() => import('./components/client/ClientProfile'));

function App() {
  return (
    <Router>
      <ToastContainer />
      <MessageBoxContainer />
      <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--slate-bg)', color: 'var(--on-surface-variant)' }}>
          <div className="flex items-center gap-3 font-semibold">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            Chargement...
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Navigate to={hasSession() ? '/dashboard' : '/login'} />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/espace-client" element={<ClientRoute />}>
            <Route index element={<ClientHome />} />
            <Route path="contrats" element={<ClientContracts />} />
            <Route path="contrats/:id" element={<ClientContractDetail />} />
            <Route path="reservations" element={<ClientReservations />} />
            <Route path="profil" element={<ClientProfile />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/gps" element={<GpsTracking />} />
            <Route path="/vehicles/new" element={<VehicleForm />} />
            <Route path="/vehicles/edit/:id" element={<VehicleForm />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/add" element={<AddClient />} />
            <Route path="/clients/edit/:id" element={<EditClient />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/contracts/edit/:id" element={<EditContract />} />
            <Route path="/contracts/new" element={<ContractForm />} />
            <Route path="/reservations/new" element={<ReservationForm />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/infractions" element={<Infractions />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route element={<ProtectedRoute roles={['SUPERADMIN']} />}>
            <Route path="/admin/agencies" element={<AgencyManagement />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/subscriptions" element={<Subscriptions />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
