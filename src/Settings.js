import React, { useState } from 'react';
import { auth } from './firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { FaUserCircle, FaListAlt, FaHome, FaBolt, FaCog, FaBatteryFull, FaMotorcycle } from 'react-icons/fa';

const Settings = ({ userDetails, fullName }) => {
  const [oldPw, setOldPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (!oldPw || !pw1 || !pw2) {
      setPwMsg('Please fill all fields.');
      return;
    }
    if (pw1 !== pw2) {
      setPwMsg('Passwords do not match.');
      return;
    }
    if (pw1.length < 6) {
      setPwMsg('Password must be at least 6 characters.');
      return;
    }
    setPwLoading(true);
    try {
      // Re-authenticate user with old password
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, oldPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, pw1);
      setPwMsg('Password changed successfully!');
      setOldPw('');
      setPw1('');
      setPw2('');
    } catch (err) {
      setPwMsg('Error: ' + (err.message || 'Could not change password.'));
    }
    setPwLoading(false);
  };

  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-title">
          <FaUserCircle />
          <h3>Account Details</h3>
        </div>
        <div className="card-content">
          <div className="user-details-list">
            <div className="user-detail-item">
              <FaUserCircle /> <span><strong>Name:</strong> {fullName}</span>
            </div>
            <div className="user-detail-item">
              <FaListAlt /> <span><strong>ID Number:</strong> {userDetails.idNumber}</span>
            </div>
            <div className="user-detail-item">
              <FaHome /> <span><strong>Location:</strong> {userDetails.location}</span>
            </div>
            <div className="user-detail-item">
              <FaBolt /> <span><strong>Phone:</strong> {userDetails.phone}</span>
            </div>
            <div className="user-detail-item">
              <FaCog /> <span><strong>Email:</strong> {userDetails.email}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-title">
          <FaMotorcycle />
          <h3>Assigned Bike</h3>
        </div>
        <div className="card-content">
          {userDetails.bikeId ? (
            <div className="user-detail-item">
              <FaMotorcycle /> <span style={{ fontSize: 28, color: '#ff9800', fontWeight: 900, marginLeft: 8 }}><strong>Number Plate:</strong> {userDetails.bikeId}</span>
            </div>
          ) : (
            <p>Wait for assigning</p>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-title">
          <FaCog />
          <h3>Change Password</h3>
        </div>
        <div className="card-content">
          <form onSubmit={handlePasswordChange}>
            <div className="form-group" style={{ position: 'relative' }}>
              <input
                type={showOldPw ? 'text' : 'password'}
                placeholder="Old Password"
                value={oldPw}
                onChange={e => setOldPw(e.target.value)}
              />
              <span
                onClick={() => setShowOldPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: 12, cursor: 'pointer', color: '#1976d2', fontSize: 16 }}
                title={showOldPw ? 'Hide' : 'Show'}
              >
                {showOldPw ? 'Hide' : 'Show'}
              </span>
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <input
                type={showPw1 ? 'text' : 'password'}
                placeholder="New Password"
                value={pw1}
                onChange={e => setPw1(e.target.value)}
              />
              <span
                onClick={() => setShowPw1(v => !v)}
                style={{ position: 'absolute', right: 12, top: 12, cursor: 'pointer', color: '#1976d2', fontSize: 16 }}
                title={showPw1 ? 'Hide' : 'Show'}
              >
                {showPw1 ? 'Hide' : 'Show'}
              </span>
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <input
                type={showPw2 ? 'text' : 'password'}
                placeholder="Confirm New Password"
                value={pw2}
                onChange={e => setPw2(e.target.value)}
              />
              <span
                onClick={() => setShowPw2(v => !v)}
                style={{ position: 'absolute', right: 12, top: 12, cursor: 'pointer', color: '#1976d2', fontSize: 16 }}
                title={showPw2 ? 'Hide' : 'Show'}
              >
                {showPw2 ? 'Hide' : 'Show'}
              </span>
            </div>
            <button type="submit" className="btn" disabled={pwLoading}>
              {pwLoading ? 'Changing...' : 'Change Password'}
            </button>
            {pwMsg && (
              <p className={`message ${pwMsg.includes('success') ? 'success' : 'error'}`}>
                {pwMsg}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};


export default Settings;
