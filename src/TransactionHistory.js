import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function TransactionHistory({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTx() {
      setLoading(true);
      const q = query(
        collection(db, 'swaptransactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      const txs = [];
      snap.forEach(doc => {
        txs.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(txs);
      setLoading(false);
    }
    fetchTx();
  }, [userId]);

  if (loading) return <div style={{ textAlign: 'center', marginTop: 32 }}>Loading...</div>;
  if (!transactions.length) return <div style={{ textAlign: 'center', marginTop: 32, color: '#888' }}>No transactions yet.</div>;

  return (
    <div style={{
      maxWidth: 900,
      margin: '32px auto',
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 6px 24px 0 rgba(25, 118, 210, 0.08)',
      padding: '32px 0 24px 0',
      border: '1px solid #e3f2fd',
      overflow: 'hidden',
    }}>
      <h2 style={{
        textAlign: 'center',
        color: '#1976d2',
        marginBottom: 24,
        fontWeight: 900,
        fontSize: 32,
        letterSpacing: 1,
        textShadow: '0 2px 8px #1976d211'
      }}>Transaction History</h2>
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '0 8px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: '#f4f7f6', borderBottom: '2px solid #e3f2fd' }}>
              <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 700, color: '#1976d2', fontSize: 18, letterSpacing: 0.5 }}>Type</th>
              <th style={{ textAlign: 'right', padding: '12px 18px', fontWeight: 700, color: '#1976d2', fontSize: 18, letterSpacing: 0.5 }}>Amount (KES)</th>
              <th style={{ textAlign: 'right', padding: '12px 18px', fontWeight: 700, color: '#1976d2', fontSize: 18, letterSpacing: 0.5 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #f0f0f0', background: tx.type === 'topup' ? '#f9fff9' : '#fff9f9' }}>
                <td style={{ padding: '12px 18px', color: tx.type === 'topup' ? '#2e7d32' : '#d32f2f', fontWeight: 700, fontSize: 17 }}>
                  {tx.type === 'topup' ? 'Top-up' : 'Swap'}
                </td>
                <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 900, fontSize: 20, color: tx.type === 'topup' ? '#2e7d32' : '#d32f2f', letterSpacing: 1 }}>
                  {tx.type === 'topup' ? '+' : '-'}{Math.abs(Number(tx.amount)).toFixed(2)}
                </td>
                <td style={{ padding: '12px 18px', textAlign: 'right', color: '#888', fontSize: 15, fontWeight: 500 }}>
                  {tx.timestamp && tx.timestamp.toDate ? tx.timestamp.toDate().toLocaleString() : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}