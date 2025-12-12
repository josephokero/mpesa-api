



import React, { useEffect, useState, useMemo } from 'react';
import TransactionMenuList from './TransactionMenuList';
import { db } from './firebase';
import { collection, onSnapshot, orderBy, query, getDocs, doc, updateDoc, where, addDoc, deleteDoc } from 'firebase/firestore';
import { FaHome, FaUsers, FaBicycle, FaExchangeAlt, FaCheckCircle, FaSignOutAlt, FaLifeRing } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import './AdminDashboard.theme.css';

function AssignBikeRow({ user, assigning, onAssign, rowIdx }) {
  const [input, setInput] = React.useState('');
  return (
    <tr style={{ background: rowIdx % 2 === 0 ? '#bbdefb' : '#e3f2fd', borderBottom: '1px solid #90caf9' }}>
      <td style={{ padding: 12 }}>{user.fullName || '-'}</td>
      <td style={{ padding: 12 }}>{user.phone || '-'}</td>
      <td style={{ padding: 12 }}>{user.bikeId || '-'}</td>
      <td style={{ padding: 12 }}>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (input.trim()) onAssign(user.id, input.trim());
          }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            type="text"
            placeholder="Enter bike number plate"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={assigning}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #90caf9', fontSize: 16, minWidth: 120, background: '#fff' }}
          />
          <button
            type="submit"
            disabled={assigning || !input.trim()}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >Assign</button>
        </form>
      </td>
      <td style={{ padding: 12 }}>
        {assigning ? <span style={{ color: '#1976d2', fontWeight: 700 }}><FaCheckCircle style={{ marginRight: 6 }} />Assigning...</span> : <span style={{ color: '#888' }}>-</span>}
      </td>
    </tr>
  );
}


function AdminDashboard() {
  // Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Assign Bike table pagination state
  const [assignPage, setAssignPage] = useState(0);
  const [assignRowsPerPage, setAssignRowsPerPage] = useState(10);


    // Notification state for unpaid swaps
    const [showNotifications, setShowNotifications] = useState(false);
    const [lastSwapCount, setLastSwapCount] = useState(0);
    const [playSound, setPlaySound] = useState(false);

    // Bell icon notification sound
    const notificationAudio = React.useRef(null);
  const [users, setUsers] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [bikes, setBikes] = useState({});
  const [assigning, setAssigning] = useState({});
  const [paying, setPaying] = useState({});
  // Pagination state for swap requests
  const [swapPage, setSwapPage] = useState(0);
  const [swapRowsPerPage, setSwapRowsPerPage] = useState(10);
  // Pagination state for users table
  const [usersPage, setUsersPage] = useState(0);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);
  // Store all swaptransactions for all users
  const [userTransactions, setUserTransactions] = useState({});
  // Mark swap as paid
  const handlePaidChange = async (swapId, checked) => {
    setPaying(prev => ({ ...prev, [swapId]: true }));
    await updateDoc(doc(db, 'swaprequest', swapId), { paid: checked });
    setPaying(prev => ({ ...prev, [swapId]: false }));
  };
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState('home');
  // Swap location form state
  const [swapTitle, setSwapTitle] = useState("");
  const [swapLink, setSwapLink] = useState("");
  const [swapSaveMsg, setSwapSaveMsg] = useState("");
  const [swapAdding, setSwapAdding] = useState(false);
  // Swap stations list state
  const [swapStations, setSwapStations] = useState([]);
  // Bulk delete state
  const [selectedSwapIds, setSelectedSwapIds] = useState([]);
  // Search and pagination state
  const [swapSearch, setSwapSearch] = useState("");
  const [swapStationsPage, setSwapStationsPage] = useState(0);
  const [swapStationsRowsPerPage, setSwapStationsRowsPerPage] = useState(10);
  useEffect(() => {
    if (menu === 'swaplocations') {
      const q = query(collection(db, 'swapstations'));
      const unsub = onSnapshot(q, snap => {
        setSwapStations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setSelectedSwapIds([]); // reset selection on reload
      });
      return () => unsub();
    }
  }, [menu]);

  useEffect(() => {
    const usersQ = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersQ, snapshot => {
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
      setLoading(false);
    });
    const swapsQ = query(collection(db, 'swaprequest'), orderBy('timestamp', 'desc'));
    const unsubscribeSwaps = onSnapshot(swapsQ, snapshot => {
      const swaps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Play sound if a new swap is requested
      if (lastSwapCount && swaps.length > lastSwapCount) {
        setPlaySound(true);
      }
      setSwapRequests(swaps);
      setLastSwapCount(swaps.length);
    });
    getDocs(collection(db, 'bikes')).then(snapshot => {
      const bikeMap = {};
      snapshot.forEach(doc => { bikeMap[doc.id] = doc.data(); });
      setBikes(bikeMap);
    });
    // Fetch all swaptransactions for all users
    (async () => {
      const txSnap = await getDocs(collection(db, 'swaptransactions'));
      const txMap = {};
      txSnap.forEach(doc => {
        const tx = doc.data();
        if (!tx.userId) return;
        if (!txMap[tx.userId]) txMap[tx.userId] = [];
        txMap[tx.userId].push(tx);
      });
      setUserTransactions(txMap);
    })();
    return () => {
      unsubscribeUsers();
      unsubscribeSwaps();
    };
  }, []);

  // Play notification sound when playSound is set (must be outside other hooks)
  useEffect(() => {
    if (playSound && notificationAudio.current) {
      notificationAudio.current.play();
      setPlaySound(false);
    }
  }, [playSound]);

  // Calculate company total balance: sum all swaptransactions.amount (status completed) for all users
  const companyBalance = useMemo(() => {
    let total = 0;
    Object.values(userTransactions).forEach(txArr => {
      txArr.forEach(tx => {
        if (tx.status === 'completed' && typeof tx.amount === 'number') {
          total += tx.amount;
        }
      });
    });
    return Math.abs(total);
  }, [userTransactions]);

  const handleAssignBike = async (userId, bikeId) => {
    setAssigning(prev => ({ ...prev, [userId]: true }));
    await updateDoc(doc(db, 'users', userId), { bikeId });
    setAssigning(prev => ({ ...prev, [userId]: false }));
  };

  // Sidebar menu
  const menuItems = [
    { key: 'home', label: 'Home', icon: <FaHome /> },
    { key: 'assign', label: 'Assign', icon: <FaBicycle /> },
    { key: 'users', label: 'Users', icon: <FaUsers /> },
    { key: 'swaps', label: 'Swap Requests', icon: <FaExchangeAlt /> },
    { key: 'swaplocations', label: 'Swap Location', icon: <FaExchangeAlt /> },
    { key: 'transactions', label: 'Transactions', icon: <FaExchangeAlt /> },
  ];

  // Unpaid swaps for notifications
  const unpaidSwaps = useMemo(() => swapRequests.filter(s => !s.paid), [swapRequests]);

  return (
    <div className="admin-dashboard-grid">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.18)',
            zIndex: 999,
            transition: 'opacity 0.2s',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Hamburger icon for small screens */}
      <button
        className="admin-hamburger"
        style={{
          display: 'none',
          position: 'absolute',
          left: 16,
          top: 24,
          zIndex: 1001,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
        }}
        onClick={() => setSidebarOpen(v => !v)}
        aria-label="Open menu"
      >
        <div style={{ width: 32, height: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 28, height: 4, background: '#1976d2', borderRadius: 2 }}></div>
          <div style={{ width: 28, height: 4, background: '#1976d2', borderRadius: 2 }}></div>
          <div style={{ width: 28, height: 4, background: '#1976d2', borderRadius: 2 }}></div>
        </div>
      </button>
      {/* Sidebar nav */}
      <nav className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}> 
              {/* Responsive styles */}
              <style>{`
                @media (max-width: 900px) {
                  .admin-dashboard-responsive {
                    flex-direction: column;
                    gap: 0 !important;
                    max-width: 100vw !important;
                    border-radius: 0 !important;
                  }
                  .admin-sidebar {
                    position: fixed !important;
                    left: 0;
                    top: 0;
                    height: 100vh !important;
                    min-height: 100vh !important;
                    z-index: 1001;
                    transform: translateX(-100%);
                    box-shadow: 0 8px 32px #1976d233;
                    border-radius: 0 18px 18px 0 !important;
                    transition: transform 0.3s;
                  }
                  .admin-sidebar.open {
                    transform: translateX(0);
                  }
                  .admin-hamburger {
                    display: block !important;
                  }
                  .admin-sidebar-overlay {
                    display: block !important;
                  }
                }
                @media (max-width: 600px) {
                  .admin-dashboard-responsive main {
                    padding: 16px 2vw !important;
                  }
                  .admin-sidebar {
                    width: 80vw !important;
                    min-width: 0 !important;
                    max-width: 90vw !important;
                  }
                }
                /* Responsive tables */
                .admin-dashboard-responsive table {
                  width: 100% !important;
                  display: block;
                  overflow-x: auto;
                  font-size: 15px;
                }
                .admin-dashboard-responsive th, .admin-dashboard-responsive td {
                  min-width: 90px;
                  padding: 8px 6px;
                }
              `}</style>
        <h2>Admin</h2>
        {menuItems.map(item => (
          <button
            key={item.key}
            className={menu === item.key ? 'active' : ''}
            onClick={() => { setMenu(item.key); setSidebarOpen(false); }}
          >
            {item.icon} {item.label}
          </button>
        ))}
        {/* Log Out and Support Request buttons in sidebar */}
        <div style={{ width: '90%', marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="admin-btn" onClick={async () => { await signOut(auth); window.location.reload(); }}>
            <FaSignOutAlt /> Log Out
          </button>
        </div>
      </nav>
      {/* Notification Bell Icon */}
      <div style={{ position: 'absolute', top: 32, right: 48, zIndex: 20 }}>
        <button
          onClick={() => setShowNotifications(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
          aria-label="Show notifications"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 8px #1976d211)' }}>
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unpaidSwaps.length > 0 && (
            <span style={{ position: 'absolute', top: 2, right: 2, background: '#d32f2f', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, boxShadow: '0 2px 8px #d32f2f33' }}>{unpaidSwaps.length}</span>
          )}
        </button>
        {showNotifications && (
          <div style={{ position: 'absolute', right: 0, top: 38, minWidth: 320, background: '#43a047', border: '1px solid #388e3c', borderRadius: 12, boxShadow: '0 8px 32px #1976d233', zIndex: 100, padding: 0 }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #388e3c', fontWeight: 800, color: '#fff', fontSize: 18, background: '#388e3c', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>Unpaid Swap Requests</div>
            {unpaidSwaps.length === 0 ? (
              <div style={{ padding: 18, color: '#e8f5e9', textAlign: 'center' }}>No unpaid swaps.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 320, overflowY: 'auto' }}>
                {unpaidSwaps.map((swap, idx) => {
                  const user = users.find(u => u.id === swap.userId) || {};
                  return (
                    <li key={swap.id} style={{ padding: '14px 18px', borderBottom: '1px solid #388e3c', background: idx % 2 === 0 ? '#66bb6a' : '#43a047', color: '#fff' }}>
                      <div style={{ fontWeight: 700 }}>{user.fullName || swap.userId}</div>
                      <div style={{ fontSize: 15 }}>{user.phone || '-'}</div>
                      <div style={{ fontSize: 15, color: '#fffde7', fontWeight: 700 }}>KES {swap.amount ? Number(swap.amount).toFixed(2) : '-'}</div>
                      <div style={{ fontSize: 13, color: '#e8f5e9' }}>{swap.timestamp && swap.timestamp.toDate ? swap.timestamp.toDate().toLocaleString() : '-'}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        {/* Notification sound */}
        <audio ref={notificationAudio} src="/happy_notification.wav" preload="auto" />
      </div>

      <main className="admin-main">
        <h1 style={{ color: '#1976d2', fontWeight: 900, fontSize: 32, marginBottom: 32, letterSpacing: 1 }}>Admin Dashboard</h1>
        {menu === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{
              background: 'linear-gradient(135deg, #e3f2fd 60%, #fff 100%)',
              borderRadius: 24,
              boxShadow: '0 8px 32px 0 rgba(25, 118, 210, 0.13)',
              border: '1px solid #e3f2fd',
              padding: '48px 64px',
              textAlign: 'center',
              maxWidth: 700,
              minWidth: 340,
              position: 'relative',
              overflow: 'hidden',
              animation: 'fadeInStats 1s cubic-bezier(.4,2,.6,1)'
            }}>
              <h2 style={{ color: '#1976d2', fontWeight: 900, fontSize: 32, marginBottom: 28, letterSpacing: 1, textShadow: '0 2px 8px #1976d211' }}>Company Stats</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 36, marginBottom: 32, width: '100%' }}>
                <div style={{ minWidth: 120, padding: 18, borderRadius: 16, background: '#fff', boxShadow: '0 2px 8px #1976d211', border: '1px solid #e3f2fd', transition: 'transform 0.3s', animation: 'popIn 0.7s cubic-bezier(.4,2,.6,1)' }}>
                  <div style={{ color: '#1976d2', fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Users</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#1565c0', letterSpacing: 1 }}>{users.length}</div>
                </div>
                <div style={{ minWidth: 120, padding: 18, borderRadius: 16, background: '#fff', boxShadow: '0 2px 8px #1976d211', border: '1px solid #e3f2fd', transition: 'transform 0.3s', animation: 'popIn 0.8s cubic-bezier(.4,2,.6,1)' }}>
                  <div style={{ color: '#1976d2', fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Bikes Assigned</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#1976d2', letterSpacing: 1 }}>{users.filter(u => u.bikeId && u.bikeId !== '-').length}</div>
                </div>
                <div style={{ minWidth: 120, padding: 18, borderRadius: 16, background: '#fff', boxShadow: '0 2px 8px #1976d211', border: '1px solid #e3f2fd', transition: 'transform 0.3s', animation: 'popIn 0.9s cubic-bezier(.4,2,.6,1)' }}>
                  <div style={{ color: '#1976d2', fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Swap Requests</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#1976d2', letterSpacing: 1 }}>{swapRequests.length}</div>
                  <div style={{ fontSize: 15, color: '#888', marginTop: 4 }}>
                    Paid: <span style={{ color: '#43a047', fontWeight: 700 }}>{swapRequests.filter(s => s.paid).length}</span> &nbsp;|
                    &nbsp;Unpaid: <span style={{ color: '#d32f2f', fontWeight: 700 }}>{swapRequests.filter(s => !s.paid).length}</span>
                  </div>
                </div>
                <div style={{ minWidth: 320, maxWidth: 380, width: '100%', padding: 32, borderRadius: 20, background: '#fff', boxShadow: '0 2px 8px #1976d211', border: '1px solid #e3f2fd', transition: 'transform 0.3s', animation: 'popIn 1s cubic-bezier(.4,2,.6,1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#1976d2', fontWeight: 800, fontSize: 28, marginBottom: 10 }}>Total Money</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#43a047', letterSpacing: 1 }}>KES {companyBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
              <div style={{ color: '#888', fontSize: 16, marginTop: 8 }}>
                (Live company stats: users, bikes, swaps, and total money)
              </div>
              <style>{`
                @keyframes fadeInStats {
                  from { opacity: 0; transform: translateY(32px) scale(0.98); }
                  to { opacity: 1; transform: none; }
                }
                @keyframes popIn {
                  from { opacity: 0; transform: scale(0.7); }
                  to { opacity: 1; transform: scale(1); }
                }
                .stats-card:hover { box-shadow: 0 8px 32px 0 #1976d233; }
              `}</style>
            </div>
          </div>
        )}
        {menu === 'swaplocations' && (
          <div className="admin-card" style={{ maxWidth: 700, margin: '0 auto' }}>
            <h2 style={{ color: 'var(--primary)', fontWeight: 900, fontSize: 28, marginBottom: 18 }}>Add Swap Station</h2>
            <form onSubmit={async e => {
              e.preventDefault();
              setSwapSaveMsg("");
              if (!swapTitle.trim() || !swapLink.trim()) {
                setSwapSaveMsg("Please enter both a title and a Google Maps link.");
                return;
              }
              setSwapAdding(true);
              try {
                await addDoc(collection(db, 'swapstations'), {
                  title: swapTitle.trim(),
                  link: swapLink.trim(),
                  created: new Date()
                });
                setSwapSaveMsg("Swap station added successfully!");
                setSwapTitle("");
                setSwapLink("");
                setTimeout(() => setSwapSaveMsg("") , 4000);
              } catch (err) {
                setSwapSaveMsg("Error saving swap station.");
              }
              setSwapAdding(false);
            }} style={{ width: '100%' }}>
              <div style={{ marginBottom: 16, width: '100%' }}>
                <label style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 16 }}>Title</label>
                <input type="text" value={swapTitle} onChange={e => setSwapTitle(e.target.value)} placeholder="e.g. Githurai 45" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #90caf9', fontSize: 16, marginTop: 6, marginBottom: 8 }} />
              </div>
              <div style={{ marginBottom: 16, width: '100%' }}>
                <label style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 16 }}>Google Maps Link</label>
                <input type="text" value={swapLink} onChange={e => setSwapLink(e.target.value)} placeholder="Paste Google Maps link here" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #90caf9', fontSize: 16, marginTop: 6, marginBottom: 8 }} />
              </div>
              <button type="submit" className="admin-btn" disabled={swapAdding} style={{ width: '100%', marginBottom: 10 }}>
                {swapAdding ? 'Adding...' : 'Save Swap Station'}
              </button>
              {swapSaveMsg && <div style={{ color: swapSaveMsg.includes('successfully') ? 'var(--accent)' : 'var(--danger)', fontWeight: 600, marginTop: 8, transition: 'opacity 0.3s' }}>{swapSaveMsg}</div>}
            </form>
            <h3 style={{ color: 'var(--warning)', fontWeight: 800, fontSize: 22, margin: '32px 0 12px' }}>All Swap Stations</h3>
            <input
              type="text"
              value={swapSearch}
              onChange={e => setSwapSearch(e.target.value)}
              placeholder="Search by location..."
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--warning)', fontSize: 16, marginBottom: 16 }}
            />
            <form onSubmit={async e => {
              e.preventDefault();
              if (selectedSwapIds.length === 0) return;
              if (!window.confirm('Delete selected swap stations?')) return;
              for (const id of selectedSwapIds) {
                await deleteDoc(doc(db, 'swapstations', id));
              }
              setSelectedSwapIds([]);
            }} style={{ width: '100%' }}>
              <div style={{ overflowX: 'auto', minWidth: 0 }}>
                <table className="admin-table" style={{ minWidth: 800, marginBottom: 16 }}>
                  <thead>
                    <tr>
                      <th><input type="checkbox" checked={swapStations.length > 0 && selectedSwapIds.length === swapStations.length} onChange={e => setSelectedSwapIds(e.target.checked ? swapStations.map(s => s.id) : [])} /></th>
                      <th>#</th>
                      <th>Title</th>
                      <th>Google Maps Link</th>
                      <th>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swapStations.filter(s => s.title && s.title.toLowerCase().includes(swapSearch.toLowerCase())).length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 18 }}>No swap stations found.</td></tr>
                    )}
                    {(() => {
                      const filtered = swapStations.filter(s => s.title && s.title.toLowerCase().includes(swapSearch.toLowerCase()));
                      const start = swapStationsPage * swapStationsRowsPerPage;
                      const end = start + swapStationsRowsPerPage;
                      return filtered.slice(start, end).map((s, i) => (
                        <tr key={s.id}>
                          <td style={{ textAlign: 'center', color: '#222' }}>
                            <input type="checkbox" checked={selectedSwapIds.includes(s.id)} onChange={e => setSelectedSwapIds(e.target.checked ? [...selectedSwapIds, s.id] : selectedSwapIds.filter(id => id !== s.id))} />
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--warning)' }}>{start + i + 1}</td>
                          <td style={{ color: '#222' }}>{s.title}</td>
                          <td>
                            <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>View</a>
                          </td>
                          <td style={{ color: '#222' }}>{s.created && s.created.toDate ? s.created.toDate().toLocaleString() : ''}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 0 16px 0', fontSize: 16, color: '#222' }}>
                <span style={{ marginRight: 16 }}>Rows per page:</span>
                <select
                  value={swapStationsRowsPerPage}
                  onChange={e => {
                    setSwapStationsRowsPerPage(Number(e.target.value));
                    setSwapStationsPage(0);
                  }}
                  style={{ fontSize: 16, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--warning)', marginRight: 16 }}
                >
                  {[10, 25, 50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span style={{ marginRight: 16 }}>
                  {swapStations.length === 0 ? '0' : `${swapStationsPage * swapStationsRowsPerPage + 1}`}
                  –
                  {Math.min((swapStationsPage + 1) * swapStationsRowsPerPage, swapStations.filter(s => s.title && s.title.toLowerCase().includes(swapSearch.toLowerCase())).length)}
                  {' '}of {swapStations.filter(s => s.title && s.title.toLowerCase().includes(swapSearch.toLowerCase())).length}
                </span>
                <button
                  onClick={() => setSwapStationsPage(p => Math.max(0, p - 1))}
                  disabled={swapStationsPage === 0}
                  style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: swapStationsPage === 0 ? 'not-allowed' : 'pointer', color: swapStationsPage === 0 ? '#bbb' : 'var(--warning)', marginRight: 8 }}
                  aria-label="Previous page"
                >
                  &#x25C0;
                </button>
                <button
                  onClick={() => setSwapStationsPage(p => ((p + 1) * swapStationsRowsPerPage < swapStations.filter(s => s.title && s.title.toLowerCase().includes(swapSearch.toLowerCase())).length ? p + 1 : p))}
                  disabled={(swapStationsPage + 1) * swapStationsRowsPerPage >= swapStations.filter(s => s.title && s.title.toLowerCase().includes(swapSearch.toLowerCase())).length}
                  style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: (swapStationsPage + 1) * swapStationsRowsPerPage >= swapStations.filter(s => s.title && s.title.toLowerCase().includes(swapSearch.toLowerCase())).length ? 'not-allowed' : 'pointer', color: (swapStationsPage + 1) * swapStationsRowsPerPage >= swapStations.filter(s => s.title && s.title.toLowerCase().includes(swapSearch.toLowerCase())).length ? '#bbb' : 'var(--warning)' }}
                  aria-label="Next page"
                >
                  &#x25B6;
                </button>
              </div>
              <button type="submit" className="admin-btn" disabled={selectedSwapIds.length === 0} style={{ background: 'var(--warning)', color: '#fff', marginBottom: 10 }}>Delete Selected</button>
            </form>
          </div>
        )}
        {menu === 'assign' && (
          <div>
            <h2 style={{ color: '#1976d2', fontWeight: 700, fontSize: 24, marginBottom: 18, letterSpacing: 0.5 }}>Assign Bikes to Users</h2>
            <div style={{ overflowX: 'auto', background: '#e3f2fd', borderRadius: 12, boxShadow: '0 2px 8px #1976d211', border: '1px solid #90caf9', padding: 0, minWidth: 0, width: '100%' }}>
              <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse', fontSize: 17, color: '#222', background: '#e3f2fd', borderRadius: 8, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#1976d2', color: '#fff' }}>
                    <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #1565c0', textAlign: 'center', minWidth: 60 }}>#</th>
                    <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #1565c0', minWidth: 180 }}>Name</th>
                    <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #1565c0', minWidth: 150 }}>Phone</th>
                    <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #1565c0', minWidth: 150 }}>Current Bike</th>
                    <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #1565c0', minWidth: 220 }}>Assign Bike</th>
                    <th style={{ padding: 12, fontWeight: 700, textAlign: 'center', minWidth: 180 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 24, background: '#e3f2fd' }}>No users found.</td></tr>
                  )}
                  {(() => {
                    const start = assignPage * assignRowsPerPage;
                    const end = start + assignRowsPerPage;
                    return users.slice(start, end).map((user, idx) => (
                      <tr key={user.id} style={{ background: (start + idx) % 2 === 0 ? '#bbdefb' : '#e3f2fd', borderBottom: '1px solid #90caf9' }}>
                        <td style={{ padding: 12, textAlign: 'center', fontWeight: 700, color: '#1976d2' }}>{start + idx + 1}</td>
                        <td style={{ padding: 12 }}>{user.fullName || '-'}</td>
                        <td style={{ padding: 12 }}>{user.phone || '-'}</td>
                        <td style={{ padding: 12 }}>{user.bikeId || '-'}</td>
                        <td style={{ padding: 12 }}>
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              const input = e.target.elements.bikeInput.value;
                              if (input.trim()) handleAssignBike(user.id, input.trim());
                            }}
                            style={{ display: 'flex', gap: 8 }}
                          >
                            <input
                              name="bikeInput"
                              type="text"
                              placeholder="Enter bike number plate"
                              defaultValue=""
                              disabled={assigning[user.id]}
                              style={{ padding: 8, borderRadius: 6, border: '1px solid #90caf9', fontSize: 16, minWidth: 120, background: '#fff' }}
                            />
                            <button
                              type="submit"
                              disabled={assigning[user.id]}
                              style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
                            >Assign</button>
                          </form>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {assigning[user.id] ? (
                            <span style={{ color: '#1976d2', fontWeight: 700 }}><FaCheckCircle style={{ marginRight: 6 }} />Assigning...</span>
                          ) : (
                            <span style={{ color: '#888' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
              {/* Pagination controls for assign bike table */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 24px', fontSize: 16, color: '#222' }}>
                <span style={{ marginRight: 16 }}>Rows per page:</span>
                <select
                  value={assignRowsPerPage}
                  onChange={e => {
                    setAssignRowsPerPage(Number(e.target.value));
                    setAssignPage(0);
                  }}
                  style={{ fontSize: 16, padding: '4px 8px', borderRadius: 6, border: '1px solid #bdbdbd', marginRight: 16 }}
                >
                  {[10, 50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span style={{ marginRight: 16 }}>
                  {users.length === 0 ? '0' : `${assignPage * assignRowsPerPage + 1}`}
                  –
                  {Math.min((assignPage + 1) * assignRowsPerPage, users.length)}
                  {' '}of {users.length}
                </span>
                <button
                  onClick={() => setAssignPage(p => Math.max(0, p - 1))}
                  disabled={assignPage === 0}
                  style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: assignPage === 0 ? 'not-allowed' : 'pointer', color: assignPage === 0 ? '#bbb' : '#1976d2', marginRight: 8 }}
                  aria-label="Previous page"
                >
                  &#x25C0;
                </button>
                <button
                  onClick={() => setAssignPage(p => ((p + 1) * assignRowsPerPage < users.length ? p + 1 : p))}
                  disabled={(assignPage + 1) * assignRowsPerPage >= users.length}
                  style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: (assignPage + 1) * assignRowsPerPage >= users.length ? 'not-allowed' : 'pointer', color: (assignPage + 1) * assignRowsPerPage >= users.length ? '#bbb' : '#1976d2' }}
                  aria-label="Next page"
                >
                  &#x25B6;
                </button>
              </div>
            </div>
          </div>
        )}


        {menu === 'users' && (
          <>
            <h2 style={{ color: '#1976d2', fontWeight: 700, fontSize: 24, marginBottom: 18, letterSpacing: 0.5 }}>All Users</h2>
            {loading ? <div style={{ color: '#333', fontSize: 18 }}>Loading users...</div> : (
              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #1976d211', border: '1px solid #e3f2fd', minWidth: 0 }}>
                <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 17, color: '#222', background: '#e8f5e9', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px #1976d211' }}>
                  <thead>
                    <tr style={{ background: '#388e3c', color: '#fff' }}>
                      <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #2e7d32' }}>#</th>
                      <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #2e7d32' }}>Name</th>
                      <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #2e7d32' }}>Phone</th>
                      <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #2e7d32' }}>ID</th>
                      <th style={{ padding: 12, fontWeight: 700, borderRight: '1px solid #2e7d32' }}>Bike</th>
                      <th style={{ padding: 12, fontWeight: 700 }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 24, background: '#e8f5e9' }}>No users found.</td></tr>
                    )}
                    {(() => {
                      const start = usersPage * usersRowsPerPage;
                      const end = start + usersRowsPerPage;
                      return users.slice(start, end).map((user, idx) => {
                        // Compute balance: sum all swaptransactions.amount for user (status completed), do not subtract swaprequests
                        let txSum = 0;
                        if (userTransactions[user.id]) {
                          userTransactions[user.id].forEach(tx => {
                            if (tx.status === 'completed' && typeof tx.amount === 'number') {
                              txSum += tx.amount;
                            }
                          });
                        }
                        const computedBalance = txSum;
                        return (
                          <tr key={user.id} style={{ background: (start + idx) % 2 === 0 ? '#c8e6c9' : '#e8f5e9', borderBottom: '1px solid #a5d6a7' }}>
                            <td style={{ padding: 12, fontWeight: 700, color: '#1976d2', textAlign: 'center' }}>{start + idx + 1}</td>
                            <td style={{ padding: 12 }}>{user.fullName || '-'}</td>
                            <td style={{ padding: 12 }}>{user.phone || '-'}</td>
                            <td style={{ padding: 12 }}>{user.idNumber || '-'}</td>
                            <td style={{ padding: 12 }}>{user.bikeId || '-'}</td>
                            <td style={{ padding: 12 }}>{Math.abs(computedBalance).toFixed(2)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                {/* Pagination controls for users table */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 24px', fontSize: 16, color: '#222' }}>
                  <span style={{ marginRight: 16 }}>Rows per page:</span>
                  <select
                    value={usersRowsPerPage}
                    onChange={e => {
                      setUsersRowsPerPage(Number(e.target.value));
                      setUsersPage(0);
                    }}
                    style={{ fontSize: 16, padding: '4px 8px', borderRadius: 6, border: '1px solid #bdbdbd', marginRight: 16 }}
                  >
                    {[5, 10, 25, 50].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span style={{ marginRight: 16 }}>
                    {users.length === 0 ? '0' : `${usersPage * usersRowsPerPage + 1}`}
                    –
                    {Math.min((usersPage + 1) * usersRowsPerPage, users.length)}
                    {' '}of {users.length}
                  </span>
                  <button
                    onClick={() => setUsersPage(p => Math.max(0, p - 1))}
                    disabled={usersPage === 0}
                    style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: usersPage === 0 ? 'not-allowed' : 'pointer', color: usersPage === 0 ? '#bbb' : '#1976d2', marginRight: 8 }}
                    aria-label="Previous page"
                  >
                    &#x25C0;
                  </button>
                  <button
                    onClick={() => setUsersPage(p => ((p + 1) * usersRowsPerPage < users.length ? p + 1 : p))}
                    disabled={(usersPage + 1) * usersRowsPerPage >= users.length}
                    style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: (usersPage + 1) * usersRowsPerPage >= users.length ? 'not-allowed' : 'pointer', color: (usersPage + 1) * usersRowsPerPage >= users.length ? '#bbb' : '#1976d2' }}
                    aria-label="Next page"
                  >
                    &#x25B6;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {menu === 'swaps' && (
          <>
            <h2 style={{ color: '#1976d2', fontWeight: 700, fontSize: 24, marginBottom: 18, letterSpacing: 0.5 }}>Swap Requests</h2>
            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #1976d211', border: '1px solid #e3f2fd' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 17, color: '#222' }}>
                <thead>
                  <tr style={{ background: '#f4f7f6' }}>
                    <th style={{ padding: 12, color: '#222', fontWeight: 700 }}>#</th>
                    <th style={{ padding: 12, color: '#222', fontWeight: 700 }}>User</th>
                    <th style={{ padding: 12, color: '#222', fontWeight: 700 }}>Amount</th>
                    <th style={{ padding: 12, color: '#222', fontWeight: 700 }}>Bike</th>
                    <th style={{ padding: 12, color: '#222', fontWeight: 700 }}>Time</th>
                    <th style={{ padding: 12, color: '#222', fontWeight: 700 }}>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {swapRequests.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 24 }}>No swap requests found.</td></tr>
                  )}
                  {(() => {
                    const sorted = [...swapRequests].sort((a, b) => {
                      const ta = a.timestamp && a.timestamp.toDate ? a.timestamp.toDate().getTime() : 0;
                      const tb = b.timestamp && b.timestamp.toDate ? b.timestamp.toDate().getTime() : 0;
                      return tb - ta;
                    });
                    const start = swapPage * swapRowsPerPage;
                    const end = start + swapRowsPerPage;
                    return sorted.slice(start, end).map((req, idx) => {
                      const user = users.find(u => u.id === req.userId) || {};
                      const paid = !!req.paid;
                      return (
                        <tr
                          key={req.id}
                          style={{
                            borderBottom: '1px solid #f0f0f0',
                            background: paid ? '#43a047' : '#fffde7',
                            transition: 'background 0.2s, box-shadow 0.2s',
                            animation: 'fadeInRow 0.5s',
                            cursor: 'pointer',
                            color: paid ? '#fff' : '#222'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = paid ? '#2e7d32' : '#ffe0b2'}
                          onMouseLeave={e => e.currentTarget.style.background = paid ? '#43a047' : '#fffde7'}
                        >
                          <td style={{ padding: 12, fontWeight: 700, color: '#1976d2' }}>{start + idx + 1}</td>
                          <td style={{ padding: 12 }}>
                            <div style={{ fontWeight: 700 }}>{user.fullName || req.userId}</div>
                            <div style={{ fontSize: 14, color: paid ? '#fff' : '#888' }}>{user.phone || '-'}</div>
                          </td>
                          <td style={{ padding: 12 }}>{typeof req.amount === 'number' ? Number(req.amount).toFixed(2) : '-'}</td>
                          <td style={{ padding: 12 }}>{req.bike || '-'}</td>
                          <td style={{ padding: 12 }}>{req.timestamp && req.timestamp.toDate ? req.timestamp.toDate().toLocaleString() : '-'}</td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={paid}
                              disabled={paying[req.id]}
                              onChange={e => handlePaidChange(req.id, e.target.checked)}
                              style={{ width: 20, height: 20 }}
                            />
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {/* Animation for table rows */}
                  <style>{`
                    @keyframes fadeInRow {
                      from { opacity: 0; transform: translateY(16px); }
                      to { opacity: 1; transform: none; }
                    }
                  `}</style>
                </tbody>
              </table>
              {/* Pagination controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 24px', fontSize: 16, color: '#222' }}>
                <span style={{ marginRight: 16 }}>Rows per page:</span>
                <select
                  value={swapRowsPerPage}
                  onChange={e => {
                    setSwapRowsPerPage(Number(e.target.value));
                    setSwapPage(0);
                  }}
                  style={{ fontSize: 16, padding: '4px 8px', borderRadius: 6, border: '1px solid #bdbdbd', marginRight: 16 }}
                >
                  {[5, 10, 25, 50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span style={{ marginRight: 16 }}>
                  {swapRequests.length === 0 ? '0' : `${swapPage * swapRowsPerPage + 1}`}
                  –
                  {Math.min((swapPage + 1) * swapRowsPerPage, swapRequests.length)}
                  {' '}of {swapRequests.length}
                </span>
                <button
                  onClick={() => setSwapPage(p => Math.max(0, p - 1))}
                  disabled={swapPage === 0}
                  style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: swapPage === 0 ? 'not-allowed' : 'pointer', color: swapPage === 0 ? '#bbb' : '#1976d2', marginRight: 8 }}
                  aria-label="Previous page"
                >
                  &#x25C0;
                </button>
                <button
                  onClick={() => setSwapPage(p => ((p + 1) * swapRowsPerPage < swapRequests.length ? p + 1 : p))}
                  disabled={(swapPage + 1) * swapRowsPerPage >= swapRequests.length}
                  style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: (swapPage + 1) * swapRowsPerPage >= swapRequests.length ? 'not-allowed' : 'pointer', color: (swapPage + 1) * swapRowsPerPage >= swapRequests.length ? '#bbb' : '#1976d2' }}
                  aria-label="Next page"
                >
                  &#x25B6;
                </button>
              </div>
            </div>
          </>
        )}
      {menu === 'transactions' && (
        <TransactionMenuList />
      )}
    </main>
    </div>
  );
}

export default AdminDashboard;
