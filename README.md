# Jamia Ahmadiyya Bangladesh Result System

A full-stack student result management system for classes, normalized subjects, students, class tests, semester marks, annual results, compensation cases, and printable reports.

## Features

- JWT-protected administrator portal
- PostgreSQL database with Prisma ORM
- Globally unique subjects with many-to-many class assignments
- Soft-deactivated students with preserved academic history
- Shared class-test definitions per class, subject, and semester
- Student-specific class-test and Final Term marks
- Semester-wise and overall annual reports
- Class-wide ranked reports with highest-student summaries
- Printable A4 reports with institution branding and signature support
- Responsive light UI with persistent Jamia Ahmadiyya Bangladesh branding

## Technology

| Area | Technology |
|---|---|
| Frontend | React 18, React Router, Axios, React Hot Toast |
| Backend | Node.js, Express, Zod, JWT |
| Database | PostgreSQL |
| ORM | Prisma |
| Styling | CSS |

## Project Structure

```text
JAB_Result/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── central-middleware/
│       ├── modules/
│       │   ├── auth/
│       │   ├── class/
│       │   ├── classTest/
│       │   ├── marks/
│       │   ├── student/
│       │   └── subject/
│       └── utils/
├── frontend/
│   ├── public/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       └── utils/
└── README.md
```

## Requirements

- Node.js 18 or newer
- PostgreSQL 14 or newer recommended
- npm

## Installation

### Install dependencies

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

### Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
```

Example `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/result_management_db"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
```

Create the database if it does not exist:

```sql
CREATE DATABASE result_management_db;
```

### Apply migrations and generate Prisma Client

Run Prisma commands from `backend`:

```powershell
cd backend
npx prisma generate
npx prisma migrate dev
```

### Seed development data

```powershell
cd backend
npm run db:seed
```

The seed creates seven configured classes, unique subjects, class-subject memberships, and a test student:

```text
Name: Test Student
Roll number: TEST-001
Class: Khamesa
```

The test student includes class-test and Final Term marks for every Khamesa subject in both semesters. The seed is idempotent.

## Running the Application

Start the backend:

```powershell
cd backend
npm run dev
```

Start the frontend in another terminal:

```powershell
cd frontend
npm start
```

Open:

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:5000/api/health`

Create a production frontend build:

```powershell
cd frontend
npm run build
```

## Database Design

The subject model is normalized:

- `Subject` stores each subject name once.
- `ClassSubject` connects subjects to any number of classes.
- `Student` belongs to one class and has an `active` flag.
- `ClassTest` belongs to a class-subject assignment and semester.
- `MarkRecord` stores a student's class-test or Final Term result.

Deactivating a student sets `active` to `false`. The student and all marks remain available for historical reporting.

## Marks Workflow

1. Select a class and semester.
2. Create a class test once for a subject.
3. Select a student.
4. Select the class test and enter the obtained marks.
5. Enter Final Term obtained marks. Final Term total marks are fixed at `100`.
6. Save or update the result.

Class-test scores are stored as rounded whole numbers. Class-test percentages are rounded before averaging. Semester scores, final results, report percentages, and totals are displayed as whole numbers.

## Result Rules

### Semester scoring

```text
Semester score = (average class-test percentage × 25%)
                 + (Final Term percentage × 75%)
```

If no class tests exist, the class-test contribution is zero.

### Semester pass marks

| Subject type | Semester pass mark |
|---|---:|
| Quran | 70 |
| General Knowledge | 20 |
| Other subjects | 60 |

### Annual result

Quran:

- Combined total below `120`: Fail
- Combined total at least `120` with either semester below `70`: Pass with compensation and re-examination required
- Both semesters at least `70`: Pass

Other subjects:

- Combined total below `100`: Fail
- Combined total at least `100` with either semester below `60`: Pass with compensation and re-examination required
- Both semesters at least `60`: Pass

General Knowledge is evaluated separately and excluded from the standard grand-total subject count. A qualifying GK result can contribute the configured GK bonus.

## Reports

The Reports page supports:

- Individual semester-wise reports
- Individual overall annual reports
- Overall class reports for all active students
- Semester class reports
- Student ranking and highest-student summary
- Subject-wise marks and result status
- Browser print and Save as PDF

Reports use an A4 print layout, institution branding, Arabic heading, watermark controls, and an editable signature name.

## API Reference

All routes except public authentication routes require a JWT bearer token.

### Authentication

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register an administrator |
| POST | `/api/auth/login` | Login and receive a JWT |
| GET | `/api/auth/me` | Get the current administrator |

### Students

| Method | Route | Description |
|---|---|---|
| GET | `/api/students` | List active students; supports `classId`, `search`, `page`, `limit`, and `includeInactive` |
| POST | `/api/students` | Create a student |
| GET | `/api/students/:id` | Get a student |
| PUT | `/api/students/:id` | Update a student |
| DELETE | `/api/students/:id` | Soft-deactivate a student |
| PATCH | `/api/students/:id/restore` | Restore a deactivated student |

### Classes and subjects

| Method | Route | Description |
|---|---|---|
| GET | `/api/classes` | List classes and counts |
| GET | `/api/classes/:id` | Get a class with students and subjects |
| GET | `/api/subjects/class/:classId` | Get subjects assigned to a class |

### Class tests

| Method | Route | Description |
|---|---|---|
| GET | `/api/class-tests?classId=:id&semester=1` | List shared class tests |
| POST | `/api/class-tests` | Create a class-test definition |
| PUT | `/api/class-tests/:id` | Update a class-test definition |
| DELETE | `/api/class-tests/:id` | Delete a class-test definition |

Class-test creation payload:

```json
{
  "classSubjectId": "uuid",
  "semester": 1,
  "testNumber": 1,
  "totalMarks": 20
}
```

### Marks and reports

| Method | Route | Description |
|---|---|---|
| POST | `/api/marks` | Create or update class-test and Final Term marks |
| GET | `/api/marks/student/:studentId?semester=1` | Get a student's marks |
| PUT | `/api/marks/:id` | Update one mark record |
| DELETE | `/api/marks/:id` | Delete one mark record |
| GET | `/api/marks/report/student/:studentId?mode=overall` | Generate an annual student report |
| GET | `/api/marks/report/student/:studentId?mode=semester&semester=1` | Generate a semester student report |
| GET | `/api/marks/report/class/:classId` | Generate an overall class report |
| GET | `/api/marks/report/class/:classId?semester=1` | Generate a semester class report |

## Troubleshooting

### Prisma resolves the wrong version

Run Prisma from `backend`, not `frontend` or the workspace root:

```powershell
cd backend
npx prisma migrate dev
```

### Windows `EBUSY` or `EPERM` file-lock errors

Stop running project Node processes, then retry. Development servers and Prisma Client generation can lock files on Windows.

### Database connection errors

Check that:

- PostgreSQL is running on port `5432`.
- The database exists.
- `DATABASE_URL` credentials are correct.
- `backend/.env` is present.

### Frontend build errors caused by a locked source file

Stop the running React development server before running a production build:

```powershell
cd frontend
npm run build
```

## Development Scripts

### Backend

| Command | Purpose |
|---|---|
| `npm run dev` | Start backend with Nodemon |
| `npm start` | Start backend normally |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:seed` | Seed development data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset migrations and reseed the database |

### Frontend

| Command | Purpose |
|---|---|
| `npm start` | Start the React development server |
| `npm run build` | Create a production build |

## Security Notes

- Do not commit `backend/.env`.
- Use a long random `JWT_SECRET` outside local development.
- Use a least-privileged PostgreSQL user in production.
- Run the backend behind HTTPS in production.
- Review dependency audit warnings before deployment.
