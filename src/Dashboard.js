
import React, { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, getDoc as getDocMain, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { astuteDb } from './firebase';
import { signOut } from 'firebase/auth';
import { FaMoneyBillWave, FaBatteryFull, FaUserCircle, FaBolt, FaCog, FaListAlt, FaHome, FaUserShield, FaMapMarkerAlt, FaDownload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import Settings from './Settings';
import TransactionHistory from './TransactionHistory';
import './Dashboard.css';

const Tab = ({ activeTab, setActiveTab, name, icon }) => (
  <button
    className={`tab ${activeTab === name.toLowerCase() ? 'active' : ''}`}
    onClick={() => setActiveTab(name.toLowerCase())}
  >
    {icon}
    {name}
  </button>
);

const Card = ({ title, icon, children }) => (
  <div className="card">
    <div className="card-title">
      {icon}
      <h3>{title}</h3>
    </div>
    <div className="card-content">
      {children}
    </div>
  </div>
);

export default function Dashboard({ user }) {
  const [balance, setBalance] = useState(0);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [swapRequested, setSwapRequested] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundPhone, setFundPhone] = useState('');
  const [funding, setFunding] = useState(false);
  const [message, setMessage] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapBike, setSwapBike] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fullName, setFullName] = useState('');
  const [userDetails, setUserDetails] = useState({ email: '', phone: '', location: '', idNumber: '', assignedBike: '' });
  const [showMessage, setShowMessage] = useState(false);
  // Swap stations state for user dashboard
  const [swapStations, setSwapStations] = useState([]);
  const [swapStationsSearch, setSwapStationsSearch] = useState('');
  useEffect(() => {
    if (activeTab === 'swap stations') {
      const q = query(collection(db, 'swapstations'));
      const unsub = onSnapshot(q, snap => {
        setSwapStations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [activeTab]);

  useEffect(() => {
    async function fetchUserData() {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setFullName(data.fullName || '');
        setUserDetails({
          email: data.email || user.email,
          phone: data.phone || '',
          location: data.location || '',
          idNumber: data.idNumber || '',
          bikeId: data.bikeId || ''
        });
      } else {
        await setDoc(userRef, { balance: 0 });
        setFullName('');
        setUserDetails({ email: user.email, phone: '', location: '', idNumber: '', bikeId: '' });
      }
      setLoading(false);
    }
    fetchUserData();
  }, [user.uid, user.email]);

  // Refresh account balance every 5 seconds
  useEffect(() => {
    let interval = null;
    async function fetchBalance() {
      let total = 0;
      try {
        const q = query(collection(db, 'swaptransactions'), where('userId', '==', user.uid), where('status', '==', 'completed'));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(docSnap => {
          const tx = docSnap.data();
          // Add topups, subtract swaps (amount is positive for topup, negative for swap)
          total += Number(tx.amount) || 0;
        });
      } catch (e) {
        total = 0;
      }
      setBalance(total);
    }
    fetchBalance();
    interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [user.uid]);

  async function handleAddFunds(e) {
    e.preventDefault();
    setFunding(true);
    setMessage('');
    let pollingStatus = '';
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Enter a valid amount.');
      setFunding(false);
      return;
    }
    const phoneToUse = fundPhone.trim() || userDetails.phone;
    if (!phoneToUse) {
      setMessage('Please enter a phone number.');
      setFunding(false);
      return;
    }
    try {
      // Call M-Pesa API endpoint
      const res = await fetch('https://mpesa-api-six.vercel.app/api/mpesa_stk_push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneToUse,
          amount,
          accountReference: fullName || userDetails.email,
          transactionDesc: 'Wallet Top-Up'
        })
      });
      const data = await res.json();
      if (!data.success) {
        setMessage('Payment initiation failed: ' + (data.message || 'Try again.'));
        setFunding(false);
        return;
      }
      setMessage('Payment request sent. Please complete the payment on your phone.');
      setShowMessage(true);

      // Poll for payment confirmation (10x every 3s)
      let confirmed = false;
      for (let i = 0; i < 10; i++) {
        pollingStatus = `Waiting for payment confirmation... (${i + 1}/10)`;
        setMessage(`Payment request sent. Please complete the payment on your phone.\n${pollingStatus}`);
        setShowMessage(true);
        await new Promise(r => setTimeout(r, 3000));
        // Query astuteDb.transactions for this checkoutRequestId
        const q = query(collection(astuteDb, 'transactions'), where('checkoutRequestId', '==', data.checkoutRequestId));
        const querySnapshot = await getDocs(q);
        let found = false;
        querySnapshot.forEach((docSnap) => {
          const tx = docSnap.data();
          if (tx.status === 'completed') {
            found = true;
            confirmed = true;
            // Always fetch latest balance from Firestore after payment
            (async () => {
              const userRef = doc(db, 'users', user.uid);
              const userSnap = await getDoc(userRef);
              let newBalance = balance;
              if (userSnap.exists()) {
                const data = userSnap.data();
                newBalance = data.balance || 0;
                setBalance(newBalance);
              }
              // Save transaction in Firestore
              await addDoc(collection(db, 'swaptransactions'), {
                userId: user.uid,
                type: 'topup',
                amount,
                phoneNumber: userDetails.phone,
                status: 'completed',
                mpesaReceiptNumber: tx.mpesaReceiptNumber || '',
                transactionDate: tx.transactionDate || '',
                timestamp: serverTimestamp(),
                description: 'M-Pesa Wallet Top-Up',
                checkoutRequestId: data.checkoutRequestId
              });
              setMessage('Top-up successful. Your account has been credited.');
                setShowMessage(true);
                setShowMessage(true);
              setFundAmount('');
              setFundPhone('');
              // Immediately fetch and update the latest balance
              const userRef2 = doc(db, 'users', user.uid);
              const userSnap2 = await getDoc(userRef2);
              if (userSnap2.exists()) {
                const data2 = userSnap2.data();
                setBalance(data2.balance || 0);
              }
            })();
          }
        });
        if (found) break;
      }
      if (!confirmed) {
        setMessage('Payment not confirmed after waiting. Please try again or check your M-Pesa.');
        setShowMessage(true);
      }
    } catch (err) {
      setMessage('Error: ' + (err.message || 'Could not process payment.'));
      setShowMessage(true);
    }
    setFunding(false);
  }

  async function handleRequestSwap(e) {
    e.preventDefault();
    const amount = parseFloat(swapAmount);
    if (!swapAmount || isNaN(amount) || amount <= 0) {
      setMessage('Enter a valid swap amount.');
      setShowMessage(true);
      return;
    }
    if (!swapBike.trim()) {
      setMessage('Please enter the bike number plate.');
      setShowMessage(true);
      return;
    }
    if (amount > balance) {
      setMessage('Insufficient balance for this swap request. Please add funds first.');
      setShowMessage(true);
      return;
    }
    setSwapRequested(true);
    try {
      // Deduct from balance by creating a negative transaction in swaptransactions
      await addDoc(collection(db, 'swaptransactions'), {
        userId: user.uid,
        type: 'swap',
        amount: -amount,
        status: 'completed',
        timestamp: serverTimestamp(),
        description: 'Battery Swap Deduction'
      });
      // Create swap request record
      await addDoc(collection(db, 'swaprequest'), {
        userId: user.uid,
        amount,
        bike: swapBike.trim(),
        status: 'pending',
        timestamp: serverTimestamp(),
        description: 'Battery Swap Request'
      });
      // Immediately update balance in UI
      setBalance(prev => (Number(prev) - amount));
      setMessage(`Swap request for KES ${amount.toFixed(2)} sent successfully. Your balance has been updated.`);
      setShowMessage(true);
      setSwapAmount('');
      setSwapBike('');
    } catch (err) {
      setMessage('Error processing swap request.');
      setShowMessage(true);
    }
    setSwapRequested(false);
  }


  // Auto-hide message after 5 seconds
  React.useEffect(() => {
    if (showMessage && message) {
      const timer = setTimeout(() => setShowMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showMessage, message]);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard" style={{ position: 'relative' }}>
      {/* Moving Advertisement Banner */}
      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          background: 'linear-gradient(90deg, #43ea7c 0%, #1976d2 100%)',
          borderBottom: '2px solid #1976d2',
          padding: 0,
          marginBottom: 18,
          position: 'relative',
          zIndex: 100,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={async () => {
          try {
            await signOut(auth);
          } catch (e) {}
          navigate('/download-info');
        }}
        title="Click to download the SureBoda Android App"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          animation: 'marquee 12s linear infinite',
          fontWeight: 700,
          fontSize: 'clamp(14px, 3vw, 20px)',
          color: '#fff',
          letterSpacing: 0.5,
          padding: '0 0 0 100%',
        }}>
          <FaDownload style={{ marginRight: 10, fontSize: 22, color: '#fff' }} />
          Download the SureBoda Android App for the best experience!
          <button
            style={{
              marginLeft: 24,
              padding: '7px 22px',
              background: 'linear-gradient(90deg, #1976d2 0%, #43ea7c 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 'clamp(13px, 2.5vw, 17px)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px #1976d244',
              transition: 'background 0.18s, color 0.18s',
              minWidth: 120,
              pointerEvents: 'none', // Make button not block parent click
            }}
            tabIndex={-1}
            aria-hidden="true"
          >
            Download Now
          </button>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
          @media (max-width: 600px) {
            .dashboard-advert {
              font-size: 14px !important;
            }
            .dashboard-advert-btn {
              font-size: 13px !important;
              padding: 6px 14px !important;
              min-width: 90px !important;
            }
          }
        `}</style>
      </div>
      <div className="dashboard-container">
          <header className="dashboard-header" style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <img src="/IMG_6922.JPG" alt="Sureboda Logo" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '50%', boxShadow: '0 2px 8px #1976d211', border: '2px solid #1976d2' }} />
              <button onClick={() => signOut(auth)} className="sign-out-btn" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', padding: '8px 18px', borderRadius: 8 }}>Sign Out</button>
            </div>
            <div className="card" style={{ maxWidth: 600, margin: '0 auto', marginBottom: 16, background: '#fff', borderRadius: 18, boxShadow: '0 2px 8px #1976d211', border: '1px solid #e3f2fd', padding: '24px 0' }}>
              <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 2.2rem)', textAlign: 'center', margin: 0 }}>Welcome{fullName ? `, ${fullName}` : ''}!</h1>
            </div>
          </header>

        <div className="tabs" style={{
          display: 'flex',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          gap: 8,
          padding: '0 0 8px 0',
          marginBottom: 24,
          scrollbarWidth: 'thin',
          scrollbarColor: '#1976d2 #e3f2fd',
        }}>
          <Tab activeTab={activeTab} setActiveTab={setActiveTab} name="Dashboard" icon={<FaHome />} />
          <Tab activeTab={activeTab} setActiveTab={setActiveTab} name="Transactions" icon={<FaListAlt />} />
          <Tab activeTab={activeTab} setActiveTab={setActiveTab} name="Service" icon={<FaBolt />} />
          <Tab activeTab={activeTab} setActiveTab={setActiveTab} name="Swap Stations" icon={<FaMapMarkerAlt />} />
          <Tab activeTab={activeTab} setActiveTab={setActiveTab} name="Settings" icon={<FaCog />} />
          {user && user.isAdmin && (
            <Tab activeTab={activeTab} setActiveTab={setActiveTab} name="Admin" icon={<FaUserShield />} />
          )}
        </div>

        {activeTab === 'admin' && user && user.isAdmin && (
          <AdminDashboard />
        )}

        {activeTab === 'dashboard' && (
          <div className="cards" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
            <Card title="Account Balance" icon={<FaMoneyBillWave />}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '32px 0 24px 0',
                padding: '32px 0',
                background: 'linear-gradient(135deg, #f8fafc 60%, #e3f2fd 100%)',
                borderRadius: 18,
                boxShadow: '0 6px 24px 0 rgba(25, 118, 210, 0.08)',
                border: '1px solid #e3f2fd',
                minWidth: 260
              }}>
                <span style={{
                  fontSize: 28,
                  color: '#1976d2',
                  fontWeight: 700,
                  letterSpacing: 1,
                  marginBottom: 6,
                  textShadow: '0 2px 8px #1976d211'
                }}>KES</span>
                <span style={{
                  fontSize: 60,
                  color: '#43a047',
                  fontWeight: 900,
                  marginTop: 0,
                  letterSpacing: 2,
                  textShadow: '0 4px 16px #43a04722'
                }}>{balance.toFixed(2)}</span>
                <span style={{
                  fontSize: 15,
                  color: '#888',
                  fontWeight: 400,
                  marginTop: 10,
                  letterSpacing: 0.5
                }}>Available Balance</span>
              </div>
            </Card>

            <Card title="Add Funds" icon={<FaBolt />}>
              <form onSubmit={handleAddFunds} className="form-group">
                <input
                  type="number"
                  placeholder="Amount to add"
                  value={fundAmount}
                  onChange={e => setFundAmount(e.target.value)}
                  min="1"
                  step="any"
                />
                <input
                  type="tel"
                  placeholder="Phone number (e.g. 07... or 254...)"
                  value={fundPhone}
                  onChange={e => setFundPhone(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                <button type="submit" disabled={funding} className="btn">
                  {funding ? 'Processing...' : 'Add Funds'}
                </button>
              </form>
            </Card>

            <Card title="Request Battery Swap" icon={<FaBatteryFull />}>
              <div style={{
                background: '#fffbe6',
                color: '#8a6d1b',
                border: '1px solid #ffe58f',
                borderRadius: 8,
                padding: '12px 18px',
                marginBottom: 16,
                fontSize: 15,
                fontWeight: 500,
                textAlign: 'center'
              }}>
                Before requesting a swap, please ask the agent at the swap station (Spiro) for the exact battery swap amount and enter that amount below.<br />
                <span style={{ color: '#1976d2', display: 'block', marginTop: 10 }}>
                  For support after payment or any swap question, call <b>0701956808</b>.
                </span>
              </div>
              <form onSubmit={handleRequestSwap} className="form-group">
                <input
                  type="number"
                  placeholder="Swap amount"
                  value={swapAmount}
                  onChange={e => setSwapAmount(e.target.value)}
                  min="1"
                  step="any"
                  disabled={swapRequested}
                  style={{ color: '#111', marginBottom: 10 }}
                />
                <input
                  type="text"
                  placeholder="Bike number plate"
                  value={swapBike}
                  onChange={e => setSwapBike(e.target.value)}
                  disabled={swapRequested}
                  style={{ marginBottom: 10 }}
                />
                <button type="submit" disabled={swapRequested || !swapAmount} className="btn">
                  {swapRequested ? 'Swap Requested' : 'Request Swap'}
                </button>
              </form>
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <TransactionHistory userId={user.uid} />
        )}

        {activeTab === 'service' && (
          <div style={{
            maxWidth: 700,
            margin: '40px auto',
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 6px 24px 0 rgba(25, 118, 210, 0.08)',
            padding: '40px 32px',
            border: '1px solid #e3f2fd',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#1976d2', fontWeight: 900, fontSize: 32, marginBottom: 18 }}>Bike Service Location</h2>
            <p style={{ fontSize: 18, color: '#333', marginBottom: 16 }}>
              For bike servicing, please visit the official Spiro Service Station:
            </p>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#388e3c', marginBottom: 10 }}>
              Spiro Service Center, <br />
              Katko Complex Grade A Warehousing, <br />
              along old Mombasa Road
            </div>
            <div style={{ margin: '24px 0', display: 'flex', justifyContent: 'center' }}>
              <a
                href="https://maps.app.goo.gl/p1xP9utdM8FjoXYx8"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', width: '100%', maxWidth: 600, borderRadius: 16, boxShadow: '0 4px 24px 0 rgba(25, 118, 210, 0.10)', overflow: 'hidden', transition: 'box-shadow 0.2s', border: '2px solid #e3f2fd' }}
                title="View Katko Complex on Google Maps"
              >
                <iframe
                  title="Service Station Map"
                  src="https://www.google.com/maps?q=Katko+Complex+Grade+A+Warehousing,+Nairobi,+Kenya&output=embed"
                  width="100%"
                  height="340"
                  style={{ border: 0, display: 'block', pointerEvents: 'none' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </a>
            </div>
            <div>
              <a href="https://maps.app.goo.gl/p1xP9utdM8FjoXYx8" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontWeight: 600, fontSize: 18, textDecoration: 'underline', letterSpacing: 0.2 }}>
                Open in Google Maps
              </a>
            </div>
            <p style={{ color: '#888', fontSize: 15, marginTop: 18 }}>
              Ask any SureBoda agent for directions or call customer support for assistance.
            </p>
          </div>
        )}

        {activeTab === 'swap stations' && (
          <div style={{
            maxWidth: 700,
            margin: '40px auto',
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 6px 24px 0 rgba(25, 118, 210, 0.08)',
            padding: '40px 32px',
            border: '1px solid #e3f2fd',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#1976d2', fontWeight: 900, fontSize: 32, marginBottom: 18 }}>Spiro Swap Stations</h2>
            <input
              type="text"
              placeholder="Search by location..."
              value={swapStationsSearch}
              onChange={e => setSwapStationsSearch(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #1976d2', fontSize: 16, marginBottom: 18, maxWidth: 400 }}
            />
            <div id="spiro-swap-stations-list" style={{ marginTop: 24 }}>
              {swapStations.length === 0 && (
                <div style={{ color: '#888', fontSize: 18, margin: '32px 0' }}>No swap stations available.</div>
              )}
              {swapStations
                .filter(s => !swapStationsSearch || (s.title && s.title.toLowerCase().includes(swapStationsSearch.toLowerCase())))
                .map((s, i) => (
                  <div key={s.id} style={{
                    background: '#f5fafd',
                    borderRadius: 12,
                    padding: '18px 20px',
                    marginBottom: 18,
                    boxShadow: '0 2px 8px #1976d210',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <FaMapMarkerAlt style={{ color: '#1976d2', fontSize: 28, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: '#1976d2' }}>{s.title}</div>
                      <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ color: '#388e3c', fontSize: 16, textDecoration: 'underline' }}>
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <Settings userDetails={userDetails} fullName={fullName} />
        )}

        {/* Removed duplicate message rendering. Only card message is shown. */}
              {showMessage && message && (
                <div style={{
                  background: '#fff',
                  color: '#2e7d32', // professional green
                  fontSize: 15,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px #0001',
                  padding: '16px 24px',
                  margin: '24px auto 0',
                  maxWidth: 480,
                  textAlign: 'center',
                  fontWeight: 500,
                  letterSpacing: 0.2,
                  border: '1px solid #e0e0e0',
                  transition: 'opacity 0.3s',
                  zIndex: 10
                }}>
                  {message.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                </div>
              )}
      </div>
    </div>
  );
}
