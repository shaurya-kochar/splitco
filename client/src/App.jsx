import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Verify from './pages/Verify';
import Home from './pages/Home';
import CreateGroup from './pages/CreateGroup';
import NewSplit from './pages/NewSplit';
import GroupDetail from './pages/GroupDetail';
import GroupInfo from './pages/GroupInfo';
import JoinGroup from './pages/JoinGroup';
import AddExpense from './pages/AddExpense';
import WhoPaid from './pages/WhoPaid';
import SplitExpense from './pages/SplitExpense';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/verify" 
        element={
          <PublicRoute>
            <Verify />
          </PublicRoute>
        } 
      />
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-group" 
        element={
          <ProtectedRoute>
            <CreateGroup />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/new-split" 
        element={
          <ProtectedRoute>
            <NewSplit />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/group/:groupId" 
        element={
          <ProtectedRoute>
            <GroupDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/group/:groupId/info" 
        element={
          <ProtectedRoute>
            <GroupInfo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/group/:groupId/add-expense" 
        element={
          <ProtectedRoute>
            <AddExpense />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/group/:groupId/add-expense/who-paid" 
        element={
          <ProtectedRoute>
            <WhoPaid />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/group/:groupId/add-expense/split" 
        element={
          <ProtectedRoute>
            <SplitExpense />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/join/:groupId" 
        element={<JoinGroup />} 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
