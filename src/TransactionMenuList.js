import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import './TransactionMenuList.css';

function TransactionMenuList() {
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState({});
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const rowsOptions = [5, 10, 20, 50, 100];

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      // Fetch all transactions
      const txSnap = await getDocs(query(collection(db, 'swaptransactions'), orderBy('timestamp', 'desc')));
      const txs = [];
      txSnap.forEach(doc => {
        txs.push({ id: doc.id, ...doc.data() });
      });
      // Fetch all users
      const userSnap = await getDocs(collection(db, 'users'));
      const userMap = {};
      userSnap.forEach(doc => {
        userMap[doc.id] = doc.data();
      });
      setUsers(userMap);
      setTransactions(txs);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(0);
  };

  const handleSort = (key) => {
    setSortKey(key);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setPage(0);
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setPage(0);
  };

  const filteredTransactions = transactions.filter(
    (tx) =>
      (tx.type && tx.type.toLowerCase().includes(filter.toLowerCase())) ||
      (tx.status && tx.status.toLowerCase().includes(filter.toLowerCase())) ||
      (tx.userId && users[tx.userId] && users[tx.userId].fullName && users[tx.userId].fullName.toLowerCase().includes(filter.toLowerCase()))
  );

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortOrder === 'asc') {
      return (a[sortKey] > b[sortKey]) ? 1 : -1;
    } else {
      return (a[sortKey] < b[sortKey]) ? 1 : -1;
    }
  });

  const start = page * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedTransactions = sortedTransactions.slice(start, end);

  return (
    <div className="admin-card transaction-menu-list" style={{ maxWidth: 900, margin: '80px auto 40px auto', padding: '32px 0 24px 0', textAlign: 'center' }}>
      <h2 style={{ color: '#1976d2', fontWeight: 900, fontSize: 32, marginBottom: 24, letterSpacing: 1, textShadow: '0 2px 8px #1976d211' }}>All Transactions</h2>
      <div className="controls" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Filter by type, status, or user"
          value={filter}
          onChange={handleFilterChange}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 220 }}
        />
        <button onClick={() => handleSort('timestamp')}>Sort by Date</button>
        <button onClick={() => handleSort('amount')}>Sort by Amount</button>
        <button onClick={() => handleSort('type')}>Sort by Type</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 32px', fontSize: 16, color: '#222', gap: 16 }}>
        <span>Rows per page:</span>
        <select value={rowsPerPage} onChange={handleRowsChange} style={{ fontSize: 16, padding: '4px 8px', borderRadius: 6, border: '1px solid #1976d2' }}>
          {rowsOptions.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>
          {sortedTransactions.length === 0 ? '0' : `${start + 1}`}
          –
          {Math.min(end, sortedTransactions.length)}
          {' '}of {sortedTransactions.length}
        </span>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? '#bbb' : '#1976d2', marginRight: 8 }}
          aria-label="Previous page"
        >&#x25C0;</button>
        <button
          onClick={() => setPage(p => ((p + 1) * rowsPerPage < sortedTransactions.length ? p + 1 : p))}
          disabled={(page + 1) * rowsPerPage >= sortedTransactions.length}
          style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: (page + 1) * rowsPerPage >= sortedTransactions.length ? 'not-allowed' : 'pointer', color: (page + 1) * rowsPerPage >= sortedTransactions.length ? '#bbb' : '#1976d2' }}
          aria-label="Next page"
        >&#x25B6;</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: 32 }}>Loading...</div>
      ) : (
        <table className="admin-table" style={{ margin: '0 auto' }}>
          <thead>
            <tr style={{ background: '#f4f7f6', borderBottom: '2px solid #e3f2fd' }}>
              <th style={{ padding: '12px 18px', fontWeight: 700, color: '#1976d2', fontSize: 18 }}>User</th>
              <th style={{ padding: '12px 18px', fontWeight: 700, color: '#1976d2', fontSize: 18 }}>Type</th>
              <th style={{ padding: '12px 18px', fontWeight: 700, color: '#1976d2', fontSize: 18 }}>Amount (KES)</th>
              <th style={{ padding: '12px 18px', fontWeight: 700, color: '#1976d2', fontSize: 18 }}>Date</th>
              <th style={{ padding: '12px 18px', fontWeight: 700, color: '#1976d2', fontSize: 18 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 24 }}>No transactions found.</td></tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const user = users[tx.userId] || {};
                return (
                  <tr key={tx.id} className={tx.status ? tx.status.toLowerCase() : ''}>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#1976d2' }}>{user.fullName || tx.userId || '-'}</td>
                    <td style={{ padding: '12px 18px', color: tx.type === 'topup' ? '#2e7d32' : '#d32f2f', fontWeight: 700 }}>{tx.type === 'topup' ? 'Top-up' : (tx.type === 'swap' ? 'Swap' : tx.type || '-')}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 900, fontSize: 18, color: tx.type === 'topup' ? '#2e7d32' : '#d32f2f' }}>{tx.amount ? (tx.amount > 0 ? '+' : '-') : ''}{Math.abs(Number(tx.amount || 0)).toFixed(2)}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', color: '#888', fontSize: 15 }}>{tx.timestamp && tx.timestamp.toDate ? tx.timestamp.toDate().toLocaleString() : (tx.date || '-')}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', color: tx.status === 'completed' ? '#43a047' : (tx.status === 'pending' ? '#ffc107' : '#dc3545'), fontWeight: 700 }}>{tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TransactionMenuList;
