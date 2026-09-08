import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { classAPI, studentAPI, marksAPI } from '../../api';
import { getErrMsg, statusBadgeClass, statusLabel, fmt2, scoreBarColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ── Score Bar ──────────────────────────────────────────────────────────────
function ScoreBar({ score, max = 100 }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="score-bar-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
        <span>{fmt2(score)}%</span><span>{fmt2(pct)}%</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: scoreBarColor(score) }} />
      </div>
    </div>
  );
}

// ── Subject Card ───────────────────────────────────────────────────────────
function SubjectCard({ report }) {
  const [open, setOpen] = useState(false);
  const { subject, semester1, semester2, finalResult } = report;

  return (
    <div className="report-subject">
      <div className="report-subject-header" onClick={() => setOpen((o) => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>{subject.name}</span>
          {subject.isQuran && <span className="chip chip-quran">Quran</span>}
          {subject.isGeneralKnowledge && <span className="chip chip-gk">GK</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={statusBadgeClass(finalResult.status)}>{statusLabel(finalResult.status)}</span>
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="report-subject-body">
          {/* Final result detail */}
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span>Sem 1: <strong>{fmt2(finalResult.sem1Score)}%</strong></span>
              <span>Sem 2: <strong>{fmt2(finalResult.sem2Score)}%</strong></span>
              <span>Total: <strong>{fmt2(finalResult.totalScore)}/200</strong></span>
              {finalResult.reason && <span style={{ color: 'var(--text-muted)' }}>— {finalResult.reason}</span>}
            </div>
          </div>
          <div className="semester-grid">
            {[{ label: 'Semester 1', data: semester1 }, { label: 'Semester 2', data: semester2 }].map(({ label, data }) => (
              <div key={label} className="sem-block">
                <h5>{label}</h5>
                <ScoreBar score={data.semesterScore} />
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div>Class Tests: {data.hasClassTests ? `${data.classTestCount} test(s), avg ${fmt2(data.classTestAvgPct)}%` : 'None (0% weight)'}</div>
                  <div>Final Term: {data.finalTerm ? `${data.finalTerm.obtainedMarks}/${data.finalTerm.totalMarks} (${fmt2(data.finalTerm.percentage)}%)` : '—'}</div>
                  <div style={{ marginTop: 6, color: data.passed ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {data.passed ? '✓ Passed' : '✗ Failed'} (min {data.passMark}%)
                  </div>
                </div>
                {data.classTests.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Class Tests:</div>
                    {data.classTests.map((ct, i) => (
                      <span key={ct.id} style={{ fontSize: 11, marginRight: 8, color: 'var(--text-muted)' }}>
                        CT{i + 1}: {ct.obtainedMarks}/{ct.totalMarks}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Report View ────────────────────────────────────────────────────
function StudentReport({ studentId, onBack }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marksAPI.studentReport(studentId)
      .then((r) => setReport(r.data.data))
      .catch((err) => toast.error(getErrMsg(err)))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="loading-wrap"><span className="spinner" /> Generating report…</div>;
  if (!report) return null;

  const { student, subjectReports, summary } = report;

  const overallColor = summary.overallStatus === 'PASS' ? 'var(--success)'
    : summary.overallStatus === 'FAIL' ? 'var(--danger)'
    : 'var(--compensation)';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>
          Result Report — {student.name}
        </h3>
      </div>

      {/* Summary */}
      <div className="summary-box" style={{ marginBottom: 20 }}>
        <div className="summary-item">
          <div className="label">Roll No</div>
          <div className="value" style={{ fontSize: 16 }}>{student.rollNumber}</div>
          <div className="sub">{student.class}</div>
        </div>
        <div className="summary-item">
          <div className="label">Grand Total</div>
          <div className="value">{fmt2(summary.grandTotal)}</div>
          <div className="sub">out of {summary.maxPossible} pts</div>
        </div>
        <div className="summary-item">
          <div className="label">Overall %</div>
          <div className="value">{summary.overallPercentage}%</div>
          <div className="sub">{summary.passedSubjects}/{summary.totalSubjectsEvaluated} subjects passed</div>
        </div>
        {summary.gkBonus > 0 && (
          <div className="summary-item">
            <div className="label">GK Bonus</div>
            <div className="value" style={{ color: 'var(--success)' }}>+{summary.gkBonus}</div>
            <div className="sub">GK score &gt; 60%</div>
          </div>
        )}
        <div className="summary-item">
          <div className="label">Result</div>
          <div className="value" style={{ fontSize: 16, color: overallColor }}>
            {statusLabel(summary.overallStatus)}
          </div>
          <div className="sub">{summary.failedSubjects} subject(s) failed</div>
        </div>
      </div>

      {/* Subject breakdown */}
      {subjectReports.map((r) => (
        <SubjectCard key={r.subject.id} report={r} />
      ))}
    </div>
  );
}

// ── Main Reports Page ──────────────────────────────────────────────────────
export default function Reports() {
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(searchParams.get('classId') || '');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [viewingStudentId, setViewingStudentId] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => { classAPI.getAll().then((r) => setClasses(r.data.data)); }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    setLoadingStudents(true);
    studentAPI.getAll({ classId: selectedClass, limit: 200 })
      .then((r) => setStudents(r.data.data.students))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass]);

  if (viewingStudentId) {
    return (
      <div>
        <div className="page-header"><div><h2>Reports</h2></div></div>
        <div className="page-body">
          <StudentReport studentId={viewingStudentId} onBack={() => setViewingStudentId(null)} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Result Reports</h2>
          <p>View calculated pass/fail/compensation results per student.</p>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Select Class</label>
              <select className="form-control" value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedStudent(''); }}>
                <option value="">Choose a class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Select Student</label>
              <select className="form-control" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} disabled={!selectedClass}>
                <option value="">Choose a student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              disabled={!selectedStudent}
              onClick={() => setViewingStudentId(selectedStudent)}
            >
              Generate Report
            </button>
          </div>
        </div>

        {selectedClass && !loadingStudents && students.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>
                Students in {classes.find((c) => c.id === selectedClass)?.className}
              </h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Roll No</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td><span className="badge badge-neutral">{s.rollNumber}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewingStudentId(s.id)}>
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!selectedClass && (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <p>Select a class to view student reports.</p>
          </div>
        )}
      </div>
    </div>
  );
}
