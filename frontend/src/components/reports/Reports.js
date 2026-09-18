import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { classAPI, studentAPI, marksAPI } from '../../api';
import { getErrMsg, statusBadgeClass, statusLabel, fmt2, scoreBarColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import jamiaAhmadiyya from '../../jamia-ahmadiyya.jpg';
import { useAuth } from '../../context/AuthContext';

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

function ReportBrand({ children }) {
  return (
    <div className="report-brand-header" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
      <div className="report-brand"><img src={jamiaAhmadiyya} alt="Jamia Ahmadiyya Bangladesh" /></div>
      <div className="report-heading">
        <div className="report-heading-arabic" dir="rtl">بسم الله الرحمن الرحيم</div>
        {children}
      </div>
    </div>
  );
}

function PrintSignature({ adminName }) {
  return (
    <div className="print-signature">
      <div className="print-signature-line" />
      <strong>{adminName || 'Administrator'}</strong>
      <span>Jamia Ahmadiyya Bangladesh</span>
    </div>
  );
}

// ── Subject Card ───────────────────────────────────────────────────────────
function SubjectCard({ report, semesterOnly }) {
  const [open, setOpen] = useState(false);
  const { subject, semester1, semester2, finalResult } = report;
  const visibleSemester = semesterOnly === 2 ? semester2 : semester1;
  const visibleStatus = semesterOnly ? (visibleSemester.passed ? 'PASS' : 'FAIL') : finalResult.status;

  return (
    <div className="report-subject">
      <div className="report-subject-header" onClick={() => setOpen((o) => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>{subject.name}</span>
          {subject.isQuran && <span className="chip chip-quran">Quran</span>}
          {subject.isGeneralKnowledge && <span className="chip chip-gk">GK</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={statusBadgeClass(visibleStatus)}>{statusLabel(visibleStatus)}</span>
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="report-subject-body">
          {/* Result detail */}
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {semesterOnly ? (
                <span>Semester {semesterOnly}: <strong>{fmt2(visibleSemester.semesterScore)}%</strong> ({visibleSemester.finalTermObtained ?? 0}/{visibleSemester.finalTermTotal ?? 0})</span>
              ) : (
                <><span>Sem 1: <strong>{fmt2(finalResult.sem1Score)}%</strong></span><span>Sem 2: <strong>{fmt2(finalResult.sem2Score)}%</strong></span><span>Total: <strong>{fmt2(finalResult.totalScore)}/200</strong></span></>
              )}
              {finalResult.reason && <span style={{ color: 'var(--text-muted)' }}>— {finalResult.reason}</span>}
            </div>
          </div>
          <div className="semester-grid">
            {(semesterOnly ? [{ label: `Semester ${semesterOnly}`, data: visibleSemester }] : [{ label: 'Semester 1', data: semester1 }, { label: 'Semester 2', data: semester2 }]).map(({ label, data }) => (
              <div key={label} className="sem-block">
                <h5>{label}</h5>
                <ScoreBar score={data.semesterScore} />
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div>Class tests: <strong>{fmt2(data.classTestObtained)}/{fmt2(data.classTestTotal)}</strong></div>
                  <div>Final term: <strong>{data.finalTermObtained === null ? '—' : `${fmt2(data.finalTermObtained)}/${fmt2(data.finalTermTotal)}`}</strong></div>
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

function MarkSheetTable({ subjectReports, semesterOnly }) {
  const visibleSemesters = semesterOnly
    ? [{ label: `Sem ${semesterOnly}`, key: semesterOnly === 2 ? 'semester2' : 'semester1' }]
    : [{ label: 'Sem 1', key: 'semester1' }, { label: 'Sem 2', key: 'semester2' }];

  return (
    <div className="card mark-sheet" style={{ padding: 0, marginBottom: 20 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Subject Mark Sheet</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th rowSpan="2">Subject</th>
              {visibleSemesters.map(({ label }) => <th colSpan="3" key={label}>{label}</th>)}
              {!semesterOnly && <th rowSpan="2">Annual<br />Result</th>}
            </tr>
            <tr>
              {visibleSemesters.flatMap(({ label }) => [
                <th key={`${label}-ct`}>Class Test</th>,
                <th key={`${label}-final`}>Final</th>,
                <th key={`${label}-score`}>Score</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {subjectReports.map((item) => (
              <tr key={item.subject.id}>
                <td style={{ fontWeight: 500 }}>{item.subject.name}</td>
                {visibleSemesters.flatMap(({ key, label }) => {
                  const data = item[key];
                  return [
                    <td key={`${item.subject.id}-${label}-ct`}>{fmt2(data.classTestObtained)} / {fmt2(data.classTestTotal)}</td>,
                    <td key={`${item.subject.id}-${label}-final`}>{fmt2(data.finalTermObtained)} / {fmt2(data.finalTermTotal)}</td>,
                    <td key={`${item.subject.id}-${label}-score`}><strong>{fmt2(data.semesterScore)}%</strong></td>,
                  ];
                })}
                {!semesterOnly && <td><strong>{fmt2(item.finalResult.totalScore)} / 200</strong><div style={{ fontSize: 10 }}>{statusLabel(item.finalResult.status)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Student Report View ────────────────────────────────────────────────────
function StudentReport({ studentId, onBack, onUpdate, mode, semester, signatureName }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marksAPI.studentReport(studentId, { mode, semester: mode === 'semester' ? semester : undefined })
      .then((r) => setReport(r.data.data))
      .catch((err) => toast.error(getErrMsg(err)))
      .finally(() => setLoading(false));
  }, [studentId, mode, semester]);

  if (loading) return <div className="loading-wrap"><span className="spinner" /> Generating report…</div>;
  if (!report) return null;

  const { student, subjectReports, summary } = report;
  const semesterOnly = mode === 'semester' ? Number(semester) : null;
  const selectedSummary = semesterOnly === 2 ? report.semester2Summary : report.semester1Summary;

  const reportStatus = semesterOnly ? selectedSummary.status : summary.overallStatus;
  const compensationSubjects = subjectReports.filter((item) => {
    if (item.subject.isGeneralKnowledge) return false;
    if (semesterOnly) {
      const semesterData = semesterOnly === 2 ? item.semester2 : item.semester1;
      return !semesterData.passed;
    }
    return item.finalResult.status === 'PASS_WITH_COMPENSATION';
  });
  const overallColor = reportStatus === 'PASS' ? 'var(--success)'
    : reportStatus === 'FAIL' ? 'var(--danger)'
    : 'var(--compensation)';

  return (
    <div className="student-report-print">
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Result Report - {student.name}</h3>
        <button className="btn btn-ghost" onClick={() => onUpdate(student)}>Update Result</button>
        <button className="btn btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      <ReportBrand>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Jamia Ahmadiyya Bangladesh</div>
        <div style={{ fontWeight: 600 }}>{semesterOnly ? `Semester ${semesterOnly} Result` : 'Annual Result Mark Sheet'}</div>
        <div>{student.class} | {student.name} | Roll No: {student.rollNumber}</div>
      </ReportBrand>

      {/* Summary */}
      <div className="summary-box" style={{ marginBottom: 20 }}>
        <div className="summary-item">
          <div className="label">Roll No</div>
          <div className="value" style={{ fontSize: 16 }}>{student.rollNumber}</div>
          <div className="sub">{student.class}</div>
        </div>
        <div className="summary-item">
          <div className="label">{semesterOnly ? `Semester ${semesterOnly} Total` : 'Annual Total'}</div>
          <div className="value">{fmt2(semesterOnly ? selectedSummary.obtainedMarks : summary.obtainedMarks)}</div>
          <div className="sub">out of {semesterOnly ? selectedSummary.totalMarks : summary.totalMarks} pts</div>
        </div>
        <div className="summary-item">
          <div className="label">{semesterOnly ? 'Semester %' : 'Overall %'}</div>
          <div className="value">{semesterOnly ? selectedSummary.percentage : summary.overallPercentage}%</div>
          <div className="sub">{semesterOnly ? `${selectedSummary.passedSubjects}/${selectedSummary.passedSubjects + selectedSummary.failedSubjects} subjects passed` : `${summary.passedSubjects}/${summary.totalSubjectsEvaluated} subjects passed`}</div>
        </div>
        {summary.gkBonus > 0 && (
          <div className="summary-item">
            <div className="label">GK Bonus</div>
            <div className="value" style={{ color: 'var(--success)' }}>+{summary.gkBonus}</div>
            <div className="sub">GK score &gt; 60%</div>
          </div>
        )}
        {!semesterOnly && <div className="summary-item">
          <div className="label">Result</div>
          <div className="value" style={{ fontSize: 16, color: overallColor }}>
            {statusLabel(reportStatus)}
          </div>
          <div className="sub">{semesterOnly ? selectedSummary.failedSubjects : summary.failedSubjects} subject(s) failed</div>
        </div>}
      </div>

      <div className="summary-box" style={{ marginBottom: 20 }}>
        {(semesterOnly ? [selectedSummary] : [report.semester1Summary, report.semester2Summary]).map((semesterSummary) => (
          <div className="summary-item" key={semesterSummary.semester}>
            <div className="label">Semester {semesterSummary.semester}</div>
            <div className="value">{fmt2(semesterSummary.obtainedMarks)}/{fmt2(semesterSummary.totalMarks)}</div>
            <div className="sub">{semesterSummary.percentage}% calculated result</div>
          </div>
        ))}
        {!semesterOnly && <div className="summary-item"><div className="label">Annual Total</div><div className="value">{fmt2(summary.obtainedMarks)}/{fmt2(summary.totalMarks)}</div><div className="sub">Calculated overall marks</div></div>}
      </div>

      <MarkSheetTable subjectReports={subjectReports} semesterOnly={semesterOnly} />
      {compensationSubjects.length > 0 && (
        <div className="compensation-note">
          <strong>Compartment / Re-examination:</strong>{' '}
          {compensationSubjects.map((item) => item.subject.name).join(', ')}
          <span> - marks below the required pass threshold.</span>
        </div>
      )}
      <PrintSignature adminName={signatureName} />

      <div className="no-print">
        {subjectReports.map((r) => (
          <SubjectCard key={r.subject.id} report={r} semesterOnly={semesterOnly} />
        ))}
      </div>
    </div>
  );
}

// ── Main Reports Page ──────────────────────────────────────────────────────
export default function Reports() {
  const { admin } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(searchParams.get('classId') || '');
  const [selectedStudent, setSelectedStudent] = useState('');
  const requestedStudentId = searchParams.get('studentId');
  const [viewingStudentId, setViewingStudentId] = useState(requestedStudentId || null);
  const [reportMode, setReportMode] = useState('overall');
  const [semester, setSemester] = useState('1');
  const [classSummary, setClassSummary] = useState(null);
  const [classReportMode, setClassReportMode] = useState('overall');
  const [signatureName, setSignatureName] = useState(admin?.name || '');
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => { classAPI.getAll().then((r) => setClasses(r.data.data)); }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    setLoadingStudents(true);
    studentAPI.getAll({ classId: selectedClass, limit: 200 })
      .then((r) => {
        const loadedStudents = r.data.data.students;
        setStudents(loadedStudents);
        if (requestedStudentId && loadedStudents.some((student) => student.id === requestedStudentId)) {
          setSelectedStudent(requestedStudentId);
          setViewingStudentId(requestedStudentId);
        }
      })
      .finally(() => setLoadingStudents(false));
  }, [selectedClass, requestedStudentId]);

  if (viewingStudentId) {
    return (
      <div>
        <div className="page-header"><div><h2>Reports</h2></div></div>
        <div className="page-body">
          <StudentReport studentId={viewingStudentId} onBack={() => setViewingStudentId(null)} onUpdate={(student) => navigate(`/marks?classId=${student.classId}&studentId=${student.id}`)} mode={reportMode} semester={semester} signatureName={signatureName} />
        </div>
      </div>
    );
  }

  const loadClassReport = async (mode) => {
    try {
      const response = await marksAPI.classReport(selectedClass, mode === 'semester' ? { semester } : {});
      setClassReportMode(mode);
      setClassSummary(response.data.data);
    } catch (error) { toast.error(getErrMsg(error)); }
  };
  const classRankingKey = classReportMode === 'semester' ? `semester${semester}` : 'overall';

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
            <div className="form-group">
              <label className="form-label">Report Type</label>
              <select className="form-control" value={reportMode} onChange={(e) => setReportMode(e.target.value)}>
                <option value="overall">Overall Annual</option>
                <option value="semester">Semester Wise</option>
              </select>
            </div>
            {reportMode === 'semester' && <div className="form-group"><label className="form-label">Semester</label><select className="form-control" value={semester} onChange={(e) => setSemester(e.target.value)}><option value="1">Semester 1</option><option value="2">Semester 2</option></select></div>}
            <div className="form-group no-print"><label className="form-label">Signature name</label><input className="form-control" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Name for printed signature" /></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              disabled={!selectedStudent}
              onClick={() => setViewingStudentId(selectedStudent)}
            >
              Generate Report
            </button>
            <button className="btn btn-ghost" style={{ marginLeft: 8 }} disabled={!selectedClass} onClick={() => loadClassReport('overall')}>Overall Class Report</button>
            <button className="btn btn-ghost" style={{ marginLeft: 8 }} disabled={!selectedClass} onClick={() => loadClassReport('semester')}>Semester Class Report</button>
          </div>
        </div>

        {classSummary && <div className="card print-area" style={{ padding: 0, marginBottom: 20 }}>
          <div style={{ padding: '14px 20px' }}>
            <ReportBrand>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Jamia Ahmadiyya Bangladesh</div>
              <div style={{ fontWeight: 600 }}>{classSummary.class.className} - {classReportMode === 'semester' ? `Semester ${semester}` : 'Overall Result'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>All active students, ranked by {classReportMode === 'semester' ? `Semester ${semester}` : 'annual'} result</div>
            </ReportBrand>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print / PDF</button></div>
          </div>
          {classSummary.highestStudent && <div style={{ margin: '0 20px 14px', padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}><strong>Highest total:</strong> {classSummary.highestStudent.student.name} ({classSummary.highestStudent.student.rollNumber}) - <strong>{fmt2(classSummary.highestStudent.obtainedMarks)}/{fmt2(classSummary.highestStudent.totalMarks)}</strong> ({classSummary.highestStudent.percentage}%)</div>}
          <div className="table-wrap"><table><thead><tr><th>Rank</th><th>Roll No</th><th>Student</th><th>Sem 1 Obtained / Total</th><th>Sem 2 Obtained / Total</th><th>Overall Obtained / Total</th><th>Result</th><th>Subjects</th></tr></thead><tbody>{[...classSummary.summary].sort((a, b) => b[classRankingKey].obtainedMarks - a[classRankingKey].obtainedMarks).map((item, index) => <tr key={item.student.id}><td>{index + 1}</td><td>{item.student.rollNumber}</td><td style={{ fontWeight: 500 }}>{item.student.name}</td><td>{fmt2(item.semester1.obtainedMarks)} / {fmt2(item.semester1.totalMarks)}</td><td>{fmt2(item.semester2.obtainedMarks)} / {fmt2(item.semester2.totalMarks)}</td><td><strong>{fmt2(item.overall.obtainedMarks)} / {fmt2(item.overall.totalMarks)}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.overall.overallPercentage}%</div></td><td><span className={statusBadgeClass(item.overall.overallStatus)}>{statusLabel(item.overall.overallStatus)}</span></td><td><details><summary>View</summary><div style={{ minWidth: 360, marginTop: 8 }}><table><thead><tr><th>Subject</th><th>Sem 1</th><th>Sem 2</th><th>Annual</th></tr></thead><tbody>{item.subjectReports.map((subjectReport) => <tr key={subjectReport.subject.id}><td>{subjectReport.subject.name}</td><td>{fmt2(subjectReport.semester1.finalTermObtained)} / {fmt2(subjectReport.semester1.finalTermTotal)}</td><td>{fmt2(subjectReport.semester2.finalTermObtained)} / {fmt2(subjectReport.semester2.finalTermTotal)}</td><td>{fmt2(subjectReport.finalResult.totalScore)} / 200</td></tr>)}</tbody></table></div></details></td></tr>)}</tbody></table></div>
          <PrintSignature adminName={signatureName} />
        </div>}

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
