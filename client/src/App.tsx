import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateCapsule from './pages/CreateCapsule';
import CapsuleDetails from './pages/CapsuleDetails';

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-white/30">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Dashboard /> : <Home />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
          <Route path="/capsules/new" element={isAuthenticated ? <CreateCapsule /> : <Navigate to="/login" />} />
          <Route path="/capsules/:id" element={isAuthenticated ? <CapsuleDetails /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
          CapsuleX
        </h1>
        <p className="text-lg md:text-xl text-neutral-400 font-light">
          Memories are meant to be unlocked, not endlessly scrolled.
        </p>
        <Link to="/login" className="inline-block mt-8 px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-colors">
          Unlock the Future
        </Link>
      </div>
    </div>
  );
}

export default App;
