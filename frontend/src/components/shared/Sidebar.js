import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/helpers';

const IconDash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconStudents = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconMarks = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconReport = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Sidebar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Result Management</h1>
        <span>Admin Portal</span>
      </div>
      <nav className="sidebar-nav">
        <span className="nav-section-label">Main</span>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <IconDash /> Dashboard
        </NavLink>
        <NavLink to="/students" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <IconStudents /> Students
        </NavLink>
        <span className="nav-section-label">Academics</span>
        <NavLink to="/marks" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <IconMarks /> Enter Marks
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <IconReport /> Reports
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div className="admin-pill">
          <div className="admin-avatar">{initials(admin?.name)}</div>
          <div className="admin-info">
            <p>{admin?.name}</p>
            <span>Administrator</span>
          </div>
        </div>
        <button className="nav-link" style={{ marginTop: 8, color: 'var(--danger)' }} onClick={handleLogout}>
          <IconLogout /> Logout
        </button>
      </div>
    </aside>
  );
}
