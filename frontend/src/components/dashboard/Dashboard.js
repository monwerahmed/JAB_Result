import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classAPI, studentAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([classAPI.getAll(), studentAPI.getAll({ limit: 1 })])
      .then(([clsRes, stuRes]) => {
        setClasses(clsRes.data.data);
        setStudentCount(stuRes.data.data.pagination.total);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalSubjects = classes.reduce((s, c) => s + (c._count?.subjects || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back, {admin?.name}. Here's your school overview.</p>
        </div>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="loading-wrap"><span className="spinner" /> Loading…</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card" style={{ '--accent-color': 'var(--primary)' }}>
                <div className="stat-label">Total Students</div>
                <div className="stat-value">{studentCount}</div>
                <div className="stat-sub">across all classes</div>
              </div>
              <div className="stat-card" style={{ '--accent-color': 'var(--success)' }}>
                <div className="stat-label">Classes</div>
                <div className="stat-value">{classes.length}</div>
                <div className="stat-sub">Class 1 — 7</div>
              </div>
              <div className="stat-card" style={{ '--accent-color': 'var(--warning)' }}>
                <div className="stat-label">Total Subjects</div>
                <div className="stat-value">{totalSubjects}</div>
                <div className="stat-sub">across all classes</div>
              </div>
              <div className="stat-card" style={{ '--accent-color': 'var(--compensation)' }}>
                <div className="stat-label">Semesters</div>
                <div className="stat-value">2</div>
                <div className="stat-sub">per academic year</div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>Classes Overview</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Students</th>
                      <th>Subjects</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => (
                      <tr key={cls.id}>
                        <td style={{ fontWeight: 600 }}>{cls.className}</td>
                        <td>{cls._count?.students ?? 0}</td>
                        <td>{cls._count?.subjects ?? 0}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/students?classId=${cls.id}`)}>
                              View Students
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
