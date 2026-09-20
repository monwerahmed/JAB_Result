import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { studentAPI, classAPI, promotionAPI } from '../../api';
import { getErrMsg, initials } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ── Student Modal (Add / Edit) ─────────────────────────────────────────────
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

// ── Single Student Promotion Modal ──────────────────────────────────────────
function PromoteStudentModal({ student, onClose, onPromoted }) {
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    promotionAPI.checkEligibility(student.id)
      .then((res) => setEligibility(res.data.data))
      .catch((err) => toast.error(getErrMsg(err)))
      .finally(() => setLoading(false));
  }, [student.id]);

  const handlePromote = async () => {
    setSubmitting(true);
    try {
      const res = await promotionAPI.promoteStudent({ studentId: student.id });
      toast.success(res.data.message);
      onPromoted();
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Promote Student</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <div className="loading-wrap"><span className="spinner" /> Evaluating promotion eligibility…</div>
        ) : eligibility ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius)', fontSize: 14 }}>
              <div style={{ fontWeight: 600 }}>{eligibility.student.name} ({eligibility.student.rollNumber})</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                Current Class: <strong>{eligibility.currentClass.className}</strong>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                Target Class: <strong>{eligibility.nextClass?.className || 'N/A (Highest Class)'}</strong>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                Annual Result: <span className={`badge ${eligibility.overallStatus === 'PASS' ? 'badge-success' : eligibility.overallStatus === 'PASS_WITH_COMPENSATION' ? 'badge-warning' : 'badge-danger'}`}>{eligibility.overallStatus}</span>
              </div>
            </div>

            <div className={`callout ${eligibility.isEligible ? 'callout-success' : 'callout-warning'}`} style={{ padding: 12, borderRadius: 'var(--radius)', fontSize: 13, background: eligibility.isEligible ? '#ecfdf5' : '#fffbe6', border: `1px solid ${eligibility.isEligible ? '#10b981' : '#f59e0b'}`, color: eligibility.isEligible ? '#065f46' : '#92400e' }}>
              <strong>Status: </strong>{eligibility.reason}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
              {eligibility.isEligible && (
                <button type="button" className="btn btn-primary" onClick={handlePromote} disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Promoting…</> : `Promote to ${eligibility.nextClass.className}`}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Bulk Auto-Promote Modal ──────────────────────────────────────────────────
function BulkPromoteModal({ classes, selectedClassId, onClose, onPromoted }) {
  const [targetClassId, setTargetClassId] = useState(selectedClassId || '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleAutoPromote = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await promotionAPI.autoPromoteClass({ classId: targetClassId || null });
      setResult(res.data.data);
      toast.success(res.data.message);
      onPromoted();
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎓 Auto-Promote Class Students</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Automatically evaluates all active students. Passed students (regular <strong>PASS</strong> or <strong>PASS_WITH_COMPENSATION</strong>) will be promoted to the next class in sequence:
            <br />
            <em style={{ fontWeight: 600 }}>Faslul Khas ➔ Muhamada ➔ Ula ➔ Sania ➔ Salesa ➔ Rabea ➔ Khamesa</em>
          </p>

          <div className="form-group">
            <label className="form-label">Select Class to Promote</label>
            <select className="form-control" value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
            </select>
          </div>

          {result && (
            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius)', fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>
                ✓ Execution Summary
              </div>
              <div>Evaluated: <strong>{result.totalEvaluated}</strong> student(s)</div>
              <div>Promoted: <strong>{result.promotedCount}</strong> (Regular: {result.regularPromotedCount}, Compartment: {result.compartmentPromotedCount})</div>
              <div>Skipped/Ineligible: <strong>{result.ineligibleCount}</strong></div>

              {result.promotedStudents.length > 0 && (
                <div style={{ marginTop: 10, maxHeight: 140, overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Promoted Students:</div>
                  {result.promotedStudents.map((s, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      • <strong>{s.name}</strong> ({s.rollNumber}): {s.fromClass} ➔ <strong style={{ color: 'var(--primary)' }}>{s.toClass}</strong> ({s.promotionType})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
            <button type="button" className="btn btn-primary" onClick={handleAutoPromote} disabled={submitting}>
              {submitting ? <><span className="spinner" /> Promoting…</> : 'Execute Auto-Promotion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── End-of-Year Fresh Start Modal ─────────────────────────────────────────────
function FreshStartModal({ onClose, onCompleted }) {
  const [newYear, setNewYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleFreshStart = async () => {
    if (!window.confirm('Are you sure you want to execute End-of-Year Fresh Start? This will create a new academic session, promote passed students, and refresh marks.')) return;
    setSubmitting(true);
    try {
      const res = await promotionAPI.executeFreshStart({ newAcademicYear: newYear || undefined });
      setSummary(res.data.data);
      toast.success(res.data.message);
      onCompleted();
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🚀 End-of-Year Fresh Start</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: 12, borderRadius: 'var(--radius)', color: '#166534', fontSize: 13 }}>
            <strong>Production Grade Session Transition:</strong>
            <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
              <li>Auto-promotes all eligible passed & compartment-passed students to their next class.</li>
              <li>Transitions active session to a new Academic Session (e.g. 2025-2026).</li>
              <li>Refreshes marks slate for the new academic year so teachers start fresh.</li>
              <li>Preserves all historical mark sheets for past sessions safely in archives.</li>
            </ul>
          </div>

          <div className="form-group">
            <label className="form-label">New Academic Session Name (Optional)</label>
            <input className="form-control" value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="e.g. 2025-2026 (Auto-calculated if blank)" />
          </div>

          {summary && (
            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 'var(--radius)', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>✓ Fresh Start Completed!</div>
              <div>Previous Session: <strong>{summary.previousSession}</strong></div>
              <div>Active Session: <strong style={{ color: 'var(--primary)' }}>{summary.activeSession}</strong></div>
              <div>Students Promoted: <strong>{summary.promotionSummary.promotedCount}</strong></div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
            <button type="button" className="btn btn-primary" onClick={handleFreshStart} disabled={submitting}>
              {submitting ? <><span className="spinner" /> Executing Fresh Start…</> : 'Start New Academic Year'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Students() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [currentSession, setCurrentSession] = useState('');
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState(searchParams.get('classId') || '');
  
  // Modals state
  const [modal, setModal] = useState(null); // null | 'add' | student object (edit)
  const [promoteStudentTarget, setPromoteStudentTarget] = useState(null);
  const [showBulkPromote, setShowBulkPromote] = useState(false);
  const [showFreshStart, setShowFreshStart] = useState(false);

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

  const fetchSessions = useCallback(async () => {
    try {
      const res = await promotionAPI.getSessions();
      setCurrentSession(res.data.data.current?.year || '');
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    classAPI.getAll().then((r) => setClasses(r.data.data));
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}? All marks will be erased.`)) return;
    try {
      await studentAPI.delete(student.id);
      toast.success('Student marked inactive.');
      fetchStudents();
    } catch (err) {
      toast.error(getErrMsg(err));
    }
  };

  const handleSaved = () => { setModal(null); fetchStudents(); };
  const handlePromoted = () => { setPromoteStudentTarget(null); setShowBulkPromote(false); setShowFreshStart(false); fetchStudents(); fetchSessions(); };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Students {currentSession && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--primary)', marginLeft: 8 }} className="badge badge-neutral">Session: {currentSession}</span>}</h2>
          <p>Manage enrolled students, auto-promotions, and end-of-year session transitions.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowFreshStart(true)}>🚀 End of Year Fresh Start</button>
          <button className="btn btn-ghost" onClick={() => setShowBulkPromote(true)}>🎓 Auto-Promote Class</button>
          <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Student</button>
        </div>
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
                      <td><strong style={{ color: 'var(--primary)' }}>{s.class?.className}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setPromoteStudentTarget(s)}>🎓 Promote</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setModal(s)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/reports?classId=${s.classId}&studentId=${s.id}`)}>Report</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/marks?classId=${s.classId}&studentId=${s.id}`)}>Marks</button>
                          <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => handleDelete(s)}>Deactivate</button>
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

      {promoteStudentTarget && (
        <PromoteStudentModal
          student={promoteStudentTarget}
          onClose={() => setPromoteStudentTarget(null)}
          onPromoted={handlePromoted}
        />
      )}

      {showBulkPromote && (
        <BulkPromoteModal
          classes={classes}
          selectedClassId={filterClass}
          onClose={() => setShowBulkPromote(false)}
          onPromoted={handlePromoted}
        />
      )}

      {showFreshStart && (
        <FreshStartModal
          onClose={() => setShowFreshStart(false)}
          onCompleted={handlePromoted}
        />
      )}
    </div>
  );
}
