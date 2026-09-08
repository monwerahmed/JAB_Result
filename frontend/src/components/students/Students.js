import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { studentAPI, classAPI } from '../../api';
import { getErrMsg, initials } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ── Modal ──────────────────────────────────────────────────────────────────
function StudentModal({ student, classes, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: student?.name || '',
    rollNumber: student?.rollNumber || '',
    classId: student?.classId || '',
  });
  const [loading, setLoading] = useState(false);
  const isEdit = !!student;

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await studentAPI.update(student.id, form);
        toast.success('Student updated.');
      } else {
        await studentAPI.create(form);
        toast.success('Student added.');
      }
      onSaved();
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Student' : 'Add New Student'}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="Student's full name" required />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input className="form-control" name="rollNumber" value={form.rollNumber} onChange={handleChange} placeholder="e.g. 2024-001" required />
            </div>
            <div className="form-group">
              <label className="form-label">Class</label>
              <select className="form-control" name="classId" value={form.classId} onChange={handleChange} required>
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Saving…</> : isEdit ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Students() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState(searchParams.get('classId') || '');
  const [modal, setModal] = useState(null); // null | 'add' | student object

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentAPI.getAll({ search, classId: filterClass || undefined, limit: 25 });
      setStudents(res.data.data.students);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }, [search, filterClass]);

  useEffect(() => { classAPI.getAll().then((r) => setClasses(r.data.data)); }, []);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}? All marks will be erased.`)) return;
    try {
      await studentAPI.delete(student.id);
      toast.success('Student deleted.');
      fetchStudents();
    } catch (err) {
      toast.error(getErrMsg(err));
    }
  };

  const handleSaved = () => { setModal(null); fetchStudents(); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Students</h2>
          <p>Manage enrolled students across all classes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Student</button>
      </div>
      <div className="page-body">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-input-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className="form-control search-input-wrap input"
                style={{ paddingLeft: 34, width: 220 }}
                placeholder="Search name or roll…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="form-control" style={{ width: 160 }} value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {pagination.total ?? 0} students
          </span>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            {loading ? (
              <div className="loading-wrap"><span className="spinner" /> Loading students…</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <p>No students found. Add one to get started.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll Number</th>
                    <th>Class</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="admin-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(s.name)}</div>
                          <span style={{ fontWeight: 500 }}>{s.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-neutral">{s.rollNumber}</span></td>
                      <td>{s.class?.className}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setModal(s)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <StudentModal
          student={modal === 'add' ? null : modal}
          classes={classes}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
