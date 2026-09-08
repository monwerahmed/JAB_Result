# Result Management System (RMS)

A full-stack Result Management System built with **Node.js**, **Express.js**, **Prisma ORM**, **PostgreSQL**, **Zod**, and **React.js**.

---

## Architecture

```
result-management-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # DB schema
│   │   └── seed.js                # Seeds 7 classes + subjects
│   └── src/
│       ├── server.js
│       ├── central-middleware/
│       │   └── auth.middleware.js  # JWT protect middleware
│       ├── utils/
│       │   ├── errorHandler.js    # AppError + asyncHandler
│       │   └── prisma.js          # Prisma singleton
│       └── modules/
│           ├── auth/              # register, login, me
│           ├── student/           # CRUD
│           ├── marks/             # submit, update, delete, reports
│           ├── class/             # read-only
│           └── subject/           # read-only per class
└── frontend/
    └── src/
        ├── App.js                 # Router + auth guards
        ├── api/index.js           # Axios client + all API calls
        ├── context/AuthContext.js
        ├── utils/helpers.js
        └── components/
            ├── auth/              # Login, Register
            ├── shared/            # Sidebar
            ├── dashboard/         # Stats + class table
            ├── students/          # CRUD with modal
            ├── marks/             # Subject-level mark entry
            └── reports/           # Full result report viewer
```

---

## Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL (running locally or remote)

### 1. Clone & install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env — set your DATABASE_URL and JWT_SECRET
```

### 3. Database setup

```bash
cd backend
npx prisma migrate dev --name init   # Creates tables
npm run db:seed                       # Seeds 7 classes + subjects
```

### 4. Run

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm start
```

Open http://localhost:3000 → Register your admin account → Start managing results.

---

## Business Logic Reference

### Exam Weighting (per subject per semester)
```
Semester Score = (Avg% of Class Tests × 0.25) + (Final Term% × 0.75)
If no class tests → 25% weight = 0
```

### Passing Criteria (per semester)
| Subject Type | Minimum % to Pass |
|---|---|
| Standard | 60% |
| Quran | 70% |

### Annual Final Result (Semester 1 + 2)

**Standard Subjects:**
- Semester 2 < 50% → Automatic FAIL
- Total (S1+S2) < 100 → FAIL
- Total ≥ 120 → PASS
- Total 100–119 & Sem2 ≥ 50% → PASS WITH COMPENSATION

**Quran:**
- Total < 120 → Automatic FAIL
- Total ≥ 140 → PASS (or COMPENSATION if Sem2 < 60%)
- Total 120–139 → FAIL

**General Knowledge (GK):**
- Evaluated separately (not added to grand total)
- If GK Semester 2 score > 60% → +10 bonus marks on grand total

---

## API Endpoints

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create admin |
| POST | `/api/auth/login` | Public | Login, get JWT |
| GET | `/api/auth/me` | Protected | Current admin |

### Students
| Method | Route | Description |
|---|---|---|
| GET | `/api/students` | List (filter: classId, search, page, limit) |
| POST | `/api/students` | Create student |
| GET | `/api/students/:id` | Get one |
| PUT | `/api/students/:id` | Update |
| DELETE | `/api/students/:id` | Delete (cascades marks) |

### Marks
| Method | Route | Description |
|---|---|---|
| POST | `/api/marks` | Bulk submit `{ records: [...] }` |
| GET | `/api/marks/student/:id` | Get marks (optional `?semester=1\|2`) |
| PUT | `/api/marks/:id` | Update one record |
| DELETE | `/api/marks/:id` | Delete one record |
| GET | `/api/marks/report/student/:id` | Full calculated report |
| GET | `/api/marks/report/class/:id` | All students in class |

### Classes & Subjects
| Method | Route | Description |
|---|---|---|
| GET | `/api/classes` | All 7 classes |
| GET | `/api/classes/:id` | Class + students + subjects |
| GET | `/api/subjects/class/:classId` | Subjects for a class |

---

## Mark Submission Payload

```json
{
  "records": [
    {
      "studentId": "uuid",
      "subjectId": "uuid",
      "semester": 1,
      "examType": "CLASS_TEST",
      "obtainedMarks": 18,
      "totalMarks": 20
    },
    {
      "studentId": "uuid",
      "subjectId": "uuid",
      "semester": 1,
      "examType": "FINAL_TERM",
      "obtainedMarks": 72,
      "totalMarks": 100
    }
  ]
}
```

Multiple CLASS_TEST records per subject/semester are all kept and averaged.
Only one FINAL_TERM per subject/semester is kept (auto-upserts).

---

## Sample Report Response

```json
{
  "student": { "name": "Ahmed Ali", "rollNumber": "2024-001", "class": "Class 5" },
  "subjectReports": [
    {
      "subject": { "name": "Mathematics", "isQuran": false, "isGeneralKnowledge": false },
      "semester1": { "semesterScore": 74.25, "passed": true, "passMark": 60 },
      "semester2": { "semesterScore": 68.0, "passed": true, "passMark": 60 },
      "finalResult": { "sem1Score": 74.25, "sem2Score": 68.0, "totalScore": 142.25, "status": "PASS" }
    }
  ],
  "summary": {
    "grandTotal": 892.5,
    "gkBonus": 10,
    "overallPercentage": 74.4,
    "overallStatus": "PASS",
    "passedSubjects": 8,
    "failedSubjects": 0
  }
}
```
