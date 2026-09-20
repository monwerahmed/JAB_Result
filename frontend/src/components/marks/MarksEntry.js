import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { classAPI, studentAPI, subjectAPI, marksAPI, classTestAPI } from '../../api';
import { getErrMsg } from '../../utils/helpers';
import toast from 'react-hot-toast';

const preventWheelChange = (event) => event.currentTarget.blur();

function SubjectMarkRow({ subject, existingMarks, classTests, onChange, onAutoSave }) {
  const finalTerm = existingMarks.find((mark) => mark.examType === 'FINAL_TERM');
  const savedClassTest = existingMarks.find((mark) => mark.examType === 'CLASS_TEST');
  const [classTestId, setClassTestId] = useState(savedClassTest?.classTestId ?? '');
  const [obtained, setObtained] = useState(savedClassTest?.obtainedMarks ?? '');
  const [finalObtained, setFinalObtained] = useState(finalTerm?.obtainedMarks ?? '');
  const [finalTotal, setFinalTotal] = useState(100);
  const selectedSavedClassTest = existingMarks.find(
    (mark) => mark.examType === 'CLASS_TEST' && mark.classTestId === classTestId
  );

  useEffect(() => {
    setObtained(selectedSavedClassTest?.obtainedMarks ?? '');
  }, [classTestId, selectedSavedClassTest?.id, selectedSavedClassTest?.obtainedMarks]);

  useEffect(() => {
    setClassTestId(savedClassTest?.classTestId ?? '');
    setFinalObtained(finalTerm?.obtainedMarks ?? '');
    setFinalTotal(100);
  }, [
    subject.id,
    savedClassTest?.classTestId,
    finalTerm?.obtainedMarks,
    finalTerm?.totalMarks,
  ]);

  useEffect(() => {
    onChange(subject.id, { classTestId, obtained, finalObtained, finalTotal });
  }, [classTestId, obtained, finalObtained, finalTotal, subject.id, onChange]);

  const selectedTest = classTests.find((test) => test.id === classTestId);
  const savedClassTests = existingMarks.filter((mark) => mark.examType === 'CLASS_TEST');
  const previewClassTests = savedClassTests
    .filter((mark) => mark.classTestId !== classTestId)
    .concat(classTestId && obtained !== '' && selectedTest
      ? [{ obtainedMarks: Number(obtained), totalMarks: selectedTest.totalMarks }]
      : []);
  const classTestObtained = previewClassTests.reduce((sum, mark) => sum + Number(mark.obtainedMarks), 0);
  const classTestTotal = previewClassTests.reduce((sum, mark) => sum + Number(mark.totalMarks), 0);
  const classTestWeighted = classTestTotal > 0
    ? Math.round((classTestObtained / classTestTotal) * 25)
    : 0;
  const hasClassTestMark = previewClassTests.length > 0;
  const finalWeighted = finalObtained !== ''
    ? Math.round(Number(finalObtained) * (hasClassTestMark ? 0.75 : 1))
    : 0;
  const saveRow = () => onAutoSave(subject.id, { classTestId, obtained, finalObtained, finalTotal });
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{subject.subjectName}</td>
      <td>
        <div className="marks-ct-entry">
          <label htmlFor={`class-test-${subject.id}`}>Test</label>
          <select className="form-control marks-test-select" value={classTestId} onChange={(event) => setClassTestId(event.target.value)}>
            <option value="">Select test</option>
            {classTests.map((test) => <option key={test.id} value={test.id}>Test {test.testNumber} ({test.totalMarks})</option>)}
          </select>
          <label htmlFor={`class-test-mark-${subject.id}`}>Obtained</label>
          <div className="marks-input-with-total">
            <input id={`class-test-mark-${subject.id}`} className="form-control" type="number" min="0" step="1" placeholder="0" value={obtained} onWheel={preventWheelChange} onChange={(event) => setObtained(event.target.value)} onBlur={saveRow} disabled={!selectedTest} />
            <span>/ {selectedTest?.totalMarks ?? 'total'}</span>
          </div>
        </div>
      </td>
      <td>
        <div className="marks-final-entry">
          <label htmlFor={`final-mark-${subject.id}`}>Obtained</label>
          <div className="marks-input-with-total">
            <input id={`final-mark-${subject.id}`} className="form-control" type="number" min="0" placeholder="0" value={finalObtained} onWheel={preventWheelChange} onChange={(event) => setFinalObtained(event.target.value)} onBlur={saveRow} />
            <span>/ 100</span>
          </div>
        </div>
      </td>
      <td className="marks-weight-cell">{classTestWeighted}<span>/25</span></td>
      <td className="marks-weight-cell">{finalWeighted}<span>/75</span></td>
    </tr>
  );
}

export default function MarksEntry() {
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classTests, setClassTests] = useState([]);
  const [existingMarks, setExistingMarks] = useState([]);
  const [selectedClass, setSelectedClass] = useState(searchParams.get('classId') || '');
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('studentId') || '');
  const [semester, setSemester] = useState('1');
  const [rowData, setRowData] = useState({});
  const [testForm, setTestForm] = useState({ subjectId: '', testNumber: '', totalMarks: '25' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { classAPI.getAll().then((response) => setClasses(response.data.data)); }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setSubjects([]); setClassTests([]); return; }
    Promise.all([
      studentAPI.getAll({ classId: selectedClass, limit: 200 }),
      subjectAPI.getByClass(selectedClass),
      classTestAPI.getAll({ classId: selectedClass, semester }),
    ]).then(([studentsResponse, subjectsResponse, testsResponse]) => {
      setStudents(studentsResponse.data.data.students);
      setSubjects(subjectsResponse.data.data);
      setClassTests(testsResponse.data.data);
      const requestedStudent = searchParams.get('studentId');
      setSelectedStudent(requestedStudent && studentsResponse.data.data.students.some((student) => student.id === requestedStudent) ? requestedStudent : '');
    }).catch((error) => toast.error(getErrMsg(error)));
  }, [selectedClass, semester, searchParams]);

  useEffect(() => {
    if (!selectedStudent) { setExistingMarks([]); return; }
    marksAPI.getByStudent(selectedStudent, { semester }).then((response) => setExistingMarks(response.data.data));
  }, [selectedStudent, semester]);

  const refreshTests = async () => {
    const response = await classTestAPI.getAll({ classId: selectedClass, semester });
    setClassTests(response.data.data);
  };

  const handleRowChange = useCallback((id, data) => {
    setRowData((previous) => ({ ...previous, [id]: data }));
  }, []);

  const createClassTest = async (event) => {
    event.preventDefault();
    const subject = subjects.find((item) => item.id === testForm.subjectId);
    if (!subject) return toast.error('Select a subject.');
    try {
      await classTestAPI.create({
        classSubjectId: subject.classSubjectId,
        semester: Number(semester),
        testNumber: Number(testForm.testNumber),
        totalMarks: Number(testForm.totalMarks),
      });
      setTestForm({ subjectId: '', testNumber: '', totalMarks: '25' });
      await refreshTests();
      toast.success('Class test created for all students in this class.');
    } catch (error) { toast.error(getErrMsg(error)); }
  };

  const deleteClassTest = async (test) => {
    if (!window.confirm(`Delete Test ${test.testNumber}? Its marks for all students will also be deleted.`)) return;
    try {
      await classTestAPI.delete(test.id);
      await refreshTests();
      if (selectedStudent) {
        const response = await marksAPI.getByStudent(selectedStudent, { semester });
        setExistingMarks(response.data.data);
      }
      toast.success('Class test deleted.');
    } catch (error) { toast.error(getErrMsg(error)); }
  };

  const saveMarks = async () => {
    if (!selectedStudent) return toast.error('Select a student first.');
    const records = [];
    for (const [subjectId, data] of Object.entries(rowData)) {
      if (data.classTestId && data.obtained !== '') {
        const test = classTests.find((item) => item.id === data.classTestId);
        if (!test) {
          toast.error('The selected class test is unavailable. Refresh the class tests and try again.');
          return;
        }
        const obtainedMarks = Math.round(Number(data.obtained));
        if (obtainedMarks > test.totalMarks) return toast.error('Obtained marks exceed class test total.');
        records.push({ studentId: selectedStudent, subjectId, classTestId: test.id, semester: Number(semester), examType: 'CLASS_TEST', obtainedMarks, totalMarks: test.totalMarks });
      }
      if (data.finalObtained !== '') {
        const obtainedMarks = Number(data.finalObtained);
        const totalMarks = 100;
        if (obtainedMarks > totalMarks) return toast.error('Obtained marks exceed final term total.');
        records.push({ studentId: selectedStudent, subjectId, semester: Number(semester), examType: 'FINAL_TERM', obtainedMarks, totalMarks });
      }
    }
    if (!records.length) return toast.error('Enter at least one mark.');
    setSaving(true);
    try {
      await marksAPI.submit(records);
      const response = await marksAPI.getByStudent(selectedStudent, { semester });
      setExistingMarks(response.data.data);
      setRowData({});
      toast.success('Marks saved.');
    } catch (error) { toast.error(getErrMsg(error)); }
    finally { setSaving(false); }
  };

  const autoSaveMarks = async (subjectId, data) => {
    if (!selectedStudent || (data.obtained === '' && data.finalObtained === '')) return;
    const records = [];
    if (data.classTestId && data.obtained !== '') {
      const test = classTests.find((item) => item.id === data.classTestId);
      if (!test) return toast.error('The selected class test is unavailable. Refresh the class tests and try again.');
      const obtainedMarks = Math.round(Number(data.obtained));
      if (obtainedMarks > test.totalMarks) return toast.error('Obtained marks exceed class test total.');
      records.push({ studentId: selectedStudent, subjectId, classTestId: test.id, semester: Number(semester), examType: 'CLASS_TEST', obtainedMarks, totalMarks: test.totalMarks });
    }
    if (data.finalObtained !== '') {
      const obtainedMarks = Number(data.finalObtained);
      if (obtainedMarks > 100) return toast.error('Obtained marks exceed final term total.');
      records.push({ studentId: selectedStudent, subjectId, semester: Number(semester), examType: 'FINAL_TERM', obtainedMarks, totalMarks: 100 });
    }
    if (!records.length) return;
    setSaving(true);
    try {
      await marksAPI.submit(records);
      const response = await marksAPI.getByStudent(selectedStudent, { semester });
      setExistingMarks(response.data.data);
      toast.success('Mark auto-saved.');
    } catch (error) { toast.error(getErrMsg(error)); }
    finally { setSaving(false); }
  };

  return (
    <div className="marks-entry">
      <div className="page-header"><div><h2>Enter Marks</h2><p>Enter the student's obtained marks. The total for a class test comes from its shared test definition.</p></div></div>
      <div className="page-body">
        <div className="card marks-control-card">
          <div className="marks-selection-grid">
            <select className="form-control" value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.className}</option>)}</select>
            <select className="form-control" value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} disabled={!selectedClass}><option value="">Select student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.rollNumber})</option>)}</select>
            <select className="form-control" value={semester} onChange={(event) => setSemester(event.target.value)}><option value="1">Semester 1</option><option value="2">Semester 2</option></select>
          </div>
        </div>
        {selectedClass && <div className="card marks-test-card">
          <div className="marks-section-heading"><strong>Class tests - Semester {semester}</strong><span>Create and delete tests from this list. Deleting a test also deletes its uploaded marks.</span></div>
          <form onSubmit={createClassTest} className="marks-test-form">
            <select aria-label="Subject for class test" className="form-control" value={testForm.subjectId} onChange={(event) => setTestForm((previous) => ({ ...previous, subjectId: event.target.value }))} required><option value="">Subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.subjectName}</option>)}</select>
            <input aria-label="Class test number" className="form-control" type="number" min="1" placeholder="Test no. e.g. 1" value={testForm.testNumber} onWheel={preventWheelChange} onChange={(event) => setTestForm((previous) => ({ ...previous, testNumber: event.target.value }))} required />
            <input aria-label="Class test total marks" className="form-control" type="number" min="1" placeholder="Total marks" value={testForm.totalMarks} onWheel={preventWheelChange} onChange={(event) => setTestForm((previous) => ({ ...previous, totalMarks: event.target.value }))} required />
            <button className="btn btn-ghost" type="submit">Add Class Test</button>
          </form>
          <div className="marks-test-list">
            <div className="marks-test-list-header"><span>Subject</span><span>Test</span><span>Total</span><span>Action</span></div>
            {classTests.length > 0 ? classTests.map((test) => <div key={test.id} className="marks-test-row">
              <span>{test.classSubject?.subject?.subjectName}</span><span>Test {test.testNumber}</span><span>{test.totalMarks} marks</span>
              <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteClassTest(test)}>Delete</button>
            </div>) : <div className="marks-test-empty">No class tests created for this semester.</div>}
          </div>
        </div>}
        {selectedClass && selectedStudent && <div className="card marks-grid-card">
          <div className="marks-grid-header"><div><h3>Marks - Semester {semester}</h3><p>Enter a mark and move to the next field. It saves automatically.</p></div><button className="btn btn-primary" onClick={saveMarks} disabled={saving}>{saving ? 'Saving...' : 'Save All Marks'}</button></div>
          <div className="table-wrap"><table className="marks-table"><thead><tr><th>Subject</th><th>Class Test</th><th>Final Term</th><th>CT<br /><span>25 marks</span></th><th>Final<br /><span>75 marks</span></th></tr></thead><tbody>{subjects.map((subject) => <SubjectMarkRow key={subject.id} subject={subject} existingMarks={existingMarks.filter((mark) => mark.subjectId === subject.id)} classTests={classTests.filter((test) => test.classSubject?.subjectId === subject.id)} onChange={handleRowChange} onAutoSave={autoSaveMarks} />)}</tbody></table></div>
        </div>}
      </div>
    </div>
  );
}
