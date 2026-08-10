import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ToastContainer from './components/Toast';
import MessageBoxContainer from './components/MessageBox';

const Login = lazy(() => import('./components/Login'));
const Layout = lazy(() => import('./components/Layout'));
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
const Marketplace = lazy(() => import('./components/Marketplace'));
const Settings = lazy(() => import('./components/Settings'));
const NotFound = lazy(() => import('./components/NotFound'));

function App() {
  return (
    <Router>
      <ToastContainer />
      <MessageBoxContainer />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--slate-bg)', color: 'var(--on-surface-variant)' }}>
          <div className="flex items-center gap-3 font-semibold">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            Chargement...
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          <Route path="/vehicles" element={
            <Layout>
              <Vehicles />
            </Layout>
          } />
          <Route path="/gps" element={
            <Layout>
              <GpsTracking />
            </Layout>
          } />
          <Route path="/vehicles/new" element={
            <Layout>
              <VehicleForm />
            </Layout>
          } />
          <Route path="/vehicles/edit/:id" element={
            <Layout>
              <VehicleForm />
            </Layout>
          } />
          <Route path="/clients" element={
            <Layout>
              <Clients />
            </Layout>
          } />
          <Route path="/clients/add" element={
            <Layout>
              <AddClient />
            </Layout>
          } />
          <Route path="/clients/edit/:id" element={
            <Layout>
              <EditClient />
            </Layout>
          } />
          <Route path="/contracts" element={
            <Layout>
              <Contracts />
            </Layout>
          } />
          <Route path="/reservations" element={
            <Layout>
              <Reservations />
            </Layout>
          } />
          <Route path="/contracts/edit/:id" element={
            <Layout>
              <EditContract />
            </Layout>
          } />
          <Route path="/contracts/new" element={
            <Layout>
              <ContractForm />
            </Layout>
          } />
          <Route path="/reservations/new" element={
            <Layout>
              <ReservationForm />
            </Layout>
          } />
          <Route path="/calendar" element={
            <Layout>
              <Calendar />
            </Layout>
          } />
          <Route path="/payments" element={
            <Layout>
              <Payments />
            </Layout>
          } />
          <Route path="/expenses" element={
            <Layout>
              <Expenses />
            </Layout>
          } />
          <Route path="/admin/agencies" element={
            <Layout>
              <AgencyManagement />
            </Layout>
          } />
          <Route path="/admin/users" element={
            <Layout>
              <UserManagement />
            </Layout>
          } />
          <Route path="/admin/subscriptions" element={
            <Layout>
              <Subscriptions />
            </Layout>
          } />
          <Route path="/settings" element={
            <Layout>
              <Settings />
            </Layout>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
