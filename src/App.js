import React, { useEffect, useState } from 'react';
import './App.css';
import AuthForm from './AuthForm';
import DownloadInfo from './DownloadInfo';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { FaBiking } from 'react-icons/fa';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

function App() {
  const [user] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  const smoothNavigate = (path) => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate(path);
      setIsNavigating(false);
    }, 500); // Duration should match the fade-out animation
  };

  useEffect(() => {
    if (user) {
      setLoadingRole(true);
      const fetchRole = async () => {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setRole(userSnap.data().role || 'rider');
          } else {
            setRole('rider');
          }
        } catch {
          setRole('rider');
        }
        setLoadingRole(false);
      };
      fetchRole();
    } else {
      setRole(null);
    }
  }, [user]);

  const mainContentClass = isNavigating ? 'fade-out' : '';

  if (!user) {
    return (
      <div className={mainContentClass}>
        <Routes>
          <Route path="/download-info" element={<DownloadInfo />} />
          <Route path="*" element={
            <>
              <div style={{
                position: 'fixed',
                top: 32,
                left: 32,
                zIndex: 2000,
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 16,
                boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                padding: '18px 32px 18px 24px',
                display: 'flex',
                alignItems: 'center',
                minWidth: 270,
                maxWidth: 400,
                fontFamily: 'Montserrat, Arial, sans-serif',
                animation: 'fadeSlideIn 1.2s cubic-bezier(.4,0,.2,1)',
              }}>
                <FaBiking style={{ fontSize: 28, color: '#1976d2', marginRight: 10, filter: 'drop-shadow(0 2px 8px #1976d233)' }} />
                <span style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#222',
                  letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                  fontFamily: 'Montserrat, Arial, sans-serif',
                  animation: 'typewriter 3s steps(30, end) 1',
                  overflow: 'hidden',
                  borderRight: '2px solid #222',
                  paddingRight: 6,
                }}>
                  Swap your bike with SUREBODA
                </span>
                <style>{`
                  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=swap');
                  @keyframes typewriter {
                    from { width: 0; }
                    to { width: 100%; }
                  }
                  @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-32px) scale(0.98); }
                    to { opacity: 1; transform: none; }
                  }
                `}</style>
              </div>
              <div style={{ marginTop: 120 }} />
              <AuthForm onAuth={() => {}} onNavigate={smoothNavigate} />
              <footer style={{
                position: 'fixed',
                left: 0,
                bottom: 0,
                width: '100%',
                background: '#fff',
                color: '#bdbdbd',
                fontSize: 14,
                letterSpacing: 0.5,
                textAlign: 'center',
                borderTop: '1px solid #e0e0e0',
                padding: '10px 0',
                zIndex: 1000
              }}>
                © {new Date().getFullYear()} SureBoda. All rights reserved.
              </footer>
            </>
          } />
        </Routes>
      </div>
    );
  }

  if (loadingRole) {
    return <div style={{ textAlign: 'center', marginTop: 100, fontSize: 22, color: '#1976d2' }}>Loading...</div>;
  }

  return (
    <div className="App" style={{ minHeight: '100vh', position: 'relative', paddingBottom: 56 }}>
      <header className="App-header">
        {role === 'admin' ? <AdminDashboard /> : <Dashboard user={user} />}
      </header>
      <footer style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: '100%',
        background: '#fff',
        color: '#bdbdbd',
        fontSize: 14,
        letterSpacing: 0.5,
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        padding: '10px 0',
        zIndex: 1000
      }}>
        © {new Date().getFullYear()} SureBoda. All rights reserved.
      </footer>
    </div>
  );
}

export default App;