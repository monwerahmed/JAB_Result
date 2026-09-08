import React, { useEffect, useState, useCallback } from 'react';
import { classAPI, studentAPI, subjectAPI, marksAPI } from '../../api';
import { getErrMsg, pct } from '../../utils/helpers';
import toast from 'react-hot-toast';

// One row per subject in the marks table
function SubjectMarkRow({ subject, existingMarks, semester, onRowChange }) {
  const classTests = existingMarks.filter((m) => m.examType === 'CLASS_TEST');
  const finalTerm = existingMarks.find((m) => m.examType === 'FINAL_TERM');

  const [newCT, setNewCT] = useState({ obtainedMarks: '', totalMarks: '' });
  const [ft, setFT] = useState({
    obtainedMarks: finalTerm?.obtainedMarks ?? '',
    totalMarks: finalTerm?.totalMarks ?? '',
    id: finalTerm?.id,
  });

  useEffect(() => {
    onRowChange(subject.id, { newCT, ft });
  }, [newCT, ft]); // eslint-disable-line

  const chipLabel = subject.isQuran ? 'Quran' : subject.isGeneralKnowledge ? 'GK' : null;

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>{subject.subjectName}</span>
          {chipLabel && (
            <span className={`chip ${subject.isQuran ? 'chip-quran' : 'chip-gk'}`}>{chipLabel}</span>
          )}
        </div>
        {classTests.length > 0 && (
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            {classTests.length} class test(s) saved
            {classTests.map((ct) => (
              <span key={ct.id} style={{ marginLeft: 6 }}>
                [{ct.obtainedMarks}/{ct.totalMarks}]
              </span>
            ))}
          </div>
        )}
      </td>
      {/* New Class Test */}
      <td>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="form-control"
            style={{ width: 64, textAlign: 'center' }}
            type="number" min="0" placeholder="Got"
            value={newCT.obtainedMarks}
            onChange={(e) => setNewCT((p) => ({ ...p, obtainedMarks: e.target.value }))}
          />
          <span style={{ color: 'var(--text-dim)' }}>/</span>
          <input
            className="form-control"
            style={{ width: 64, textAlign: 'center' }}
            type="number" min="1" placeholder="Total"
            value={newCT.totalMarks}
            onChange={(e) => setNewCT((p) => ({ ...p, totalMarks: e.target.value }))}
          />
        </div>
      </td>
      {/* Final Term */}
      <td>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="form-control"
            style={{ width: 64, textAlign: 'center' }}
            type="number" min="0" placeholder="Got"
            value={ft.obtainedMarks}
            onChange={(e) => setFT((p) => ({ ...p, obtainedMarks: e.target.value }))}
          />
          <span style={{ color: 'var(--text-dim)' }}>/</span>
          <input
            className="form-control"
            style={{ width: 64, textAlign: 'center' }}
            type="number" min="1" placeholder="Total"
            value={ft.totalMarks}
            onChange={(e) => setFT((p) => ({ ...p, totalMarks: e.target.value }))}
          />
          {ft.id && <span style={{ fontSize: 10, color: 'var(--success)' }}>✓saved</span>}
        </div>
      </td>
    </tr>
  );
}

export default function MarksEntry() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [existingMarks, setExistingMarks] = useState([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [rowData, setRowData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    classAPI.getAll().then((r) => setClasses(r.data.data));
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setSelectedStudent(''); return; }
    studentAPI.getAll({ classId: selectedClass, limit: 200 }).then((r) => {
      setStudents(r.data.data.students);
      setSelectedStudent('');
    });
    setLoadingSubjects(true);
    subjectAPI.getByClass(selectedClass).then((r) => {
      setSubjects(r.data.data);
    }).finally(() => setLoadingSubjects(false));
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedStudent) { setExistingMarks([]); return; }
    marksAPI.getByStudent(selectedStudent, selectedSemester).then((r) => setExistingMarks(r.data.data));
  }, [selectedStudent, selectedSemester]);

  const handleRowChange = useCallback((subjectId, data) => {
    setRowData((prev) => ({ ...prev, [subjectId]: data }));
  }, []);

  const handleSave = async () => {
    if (!selectedStudent) return toast.error('Please select a student first.');
    const records = [];

    for (const [subjectId, data] of Object.entries(rowData)) {
      const { newCT, ft } = data;
      // Add new class test if both fields filled
      if (newCT.obtainedMarks !== '' && newCT.totalMarks !== '') {
        const ob = parseFloat(newCT.obtainedMarks);
        const tot = parseFloat(newCT.totalMarks);
        if (ob > tot) { toast.error('Obtained marks exceed total marks in a class test.'); return; }
        records.push({ studentId: selectedStudent, subjectId, semester: Number(selectedSemester), examType: 'CLASS_TEST', obtainedMarks: ob, totalMarks: tot });
      }
      // Add/update final term if both fields filled
      if (ft.obtainedMarks !== '' && ft.totalMarks !== '') {
        const ob = parseFloat(ft.obtainedMarks);
        const tot = parseFloat(ft.totalMarks);
        if (ob > tot) { toast.error('Obtained marks exceed total marks in Final Term.'); return; }
        records.push({ studentId: selectedStudent, subjectId, semester: Number(selectedSemester), examType: 'FINAL_TERM', obtainedMarks: ob, totalMarks: tot });
      }
    }

    if (records.length === 0) return toast.error('No marks to save. Fill in at least one field.');

    setSaving(true);
    try {
      await marksAPI.submit(records);
      toast.success(`${records.length} record(s) saved!`);
      // Refresh existing marks
      const res = await marksAPI.getByStudent(selectedStudent, selectedSemester);
      setExistingMarks(res.data.data);
      setRowData({});
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Enter Marks</h2>
          <p>Select a student and semester to input or update marks.</p>
        </div>
      </div>
      <div className="page-body">
        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Class</label>
              <select className="form-control" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Student</label>
              <select className="form-control" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} disabled={!selectedClass}>
                <option value="">Select student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Semester</label>
              <select className="form-control" value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
          </div>
        </div>

        {/* Marks Table */}
        {selectedClass && selectedStudent && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Mark Entry — Semester {selectedSemester}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Leave blank to skip. Final Term per subject: only 1 allowed (saves/updates).
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : '💾 Save Marks'}
              </button>
            </div>
            {loadingSubjects ? (
              <div className="loading-wrap"><span className="spinner" /> Loading subjects…</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>New Class Test (Obtained / Total)</th>
                      <th>Final Term (Obtained / Total)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((sub) => (
                      <SubjectMarkRow
                        key={sub.id}
                        subject={sub}
                        semester={Number(selectedSemester)}
                        existingMarks={existingMarks.filter((m) => m.subjectId === sub.id)}
                        onRowChange={handleRowChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!selectedClass && (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p>Select a class and student above to begin entering marks.</p>
          </div>
        )}
      </div>
    </div>
  );
}
