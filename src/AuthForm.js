import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import styles from './AuthForm.module.css';
import { FaAndroid, FaArrowRight } from 'react-icons/fa';

export default function AuthForm({ onAuth, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email,
          phone,
          location,
          idNumber,
          fullName,
          balance: 0,
          role: 'rider'
        });
      }
      onAuth();
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Wrong credentials. Wrong password or email, please try again.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please use another unique email to create an account.');
      } else {
        setError((isLogin ? 'Login failed. ' : 'Sign up failed. ') + (err.message || 'Please try again.'));
      }
    }
    setLoading(false);
  };

  return (
    <>
      {/* Redesigned Android APK Download Card */}
      <div className={styles.apkCard} onClick={() => onNavigate('/download-info')}>
        <FaAndroid className={styles.icon} style={{ fontSize: '2.5rem', color: '#00acc1' }} />
        <div className={styles.title}>Get the SureBoda App</div>
        <p className={styles.description}>
          For the best experience, download the official Android app.
        </p>
        <span className={styles.downloadText}>
          Get the App <FaArrowRight />
        </span>
      </div>

      {/* Login/Signup Card */}
      <div className="auth-form-main-card" style={{
        maxWidth: 400,
        margin: 'auto',
        marginTop: 24,
        padding: 32,
        border: '1px solid #e0e0e0',
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeIn 1s cubic-bezier(.4,0,.2,1)'
      }}>
        <div className="auth-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
          <img className="auth-logo" src={process.env.PUBLIC_URL + '/logosureboda.jpg'} alt="SureBoda Logo" style={{ width: 80, height: 80, marginBottom: 8, filter: 'drop-shadow(0 2px 8px #1976d233)', animation: 'logoPop 0.8s' }} />
          <h2 className="auth-title" style={{ textAlign: 'center', marginBottom: 0, color: '#1976d2', letterSpacing: 1, fontWeight: 700, fontSize: 28, textShadow: '0 2px 8px #1976d211' }}>SureBoda</h2>
          <div style={{ color: '#757575', fontSize: 16, marginTop: 2, marginBottom: 8, fontWeight: 400 }}>{isLogin ? 'Login' : 'Sign Up'}</div>
        </div>
        <form onSubmit={handleSubmit} style={{ animation: 'slideUp 0.7s' }}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 16 }}
            />
          </div>
          {!isLogin && (
            <>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 16 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="ID Number"
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  required
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 16 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 16 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  required
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 16 }}
                />
              </div>
            </>
          )}
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 16 }}
            />
            <span
              onClick={() => setShowPassword(s => !s)}
              style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: '#1976d2',
                fontWeight: 500
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </span>
          </div>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              background: '#1976d2',
              color: '#fff',
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 10,
            borderRadius: 8,
            background: '#f5f5f5',
            color: '#1976d2',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'}
          onMouseOut={e => e.currentTarget.style.background = '#f5f5f5'}
        >
          {isLogin ? 'Create an account' : 'Already have an account? Login'}
        </button>
        {error && <div style={{ color: 'red', marginTop: 16, textAlign: 'center', animation: 'fadeIn 0.5s' }}>{error}</div>}
        <style>{`
          @media (max-width: 500px) {
            .auth-header .auth-logo {
              width: 44px !important;
              height: 44px !important;
            }
            .auth-header .auth-title {
              font-size: 17px !important;
            }
            .auth-form-main-card {
              margin-bottom: 60px !important;
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: none; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(32px); }
            to { opacity: 1; transform: none; }
          }
          @keyframes logoPop {
            0% { transform: scale(0.7); opacity: 0; }
            70% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </>
  );
}