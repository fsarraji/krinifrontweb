import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import VehicleForm from './components/VehicleForm';
import GpsTracking from './components/GpsTracking';
import Clients from './components/Clients';
import Contracts from './components/Contracts';
import Reservations from './components/Reservations';
import Calendar from './components/Calendar';

import AddClient from './components/AddClient';
import EditClient from './components/EditClient';
import EditContract from './components/EditContract';
import ContractForm from './components/ContractForm';
import ReservationForm from './components/ReservationForm';
import AgencyManagement from './components/AgencyManagement';
import UserManagement from './components/UserManagement';
import Subscriptions from './components/Subscriptions';
import Payments from './components/Payments';
import Expenses from './components/Expenses';
import Marketplace from './components/Marketplace';
import Settings from './components/Settings';
import ToastContainer from './components/Toast';
import MessageBoxContainer from './components/MessageBox';

function App() {
  return (
    <Router>
      <ToastContainer />
      <MessageBoxContainer />
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
      </Routes>
    </Router>
  );
}

export default App;