# Campus Grievance Redressal System

A centralised campus complaint management system built with the MERN stack (MongoDB, Express, React, Node.js).

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### Server
```bash
cd server
cp .env.example .env        # then fill in JWT_SECRET
npm install
npm run seed                # create demo accounts
npm run dev                 # starts on http://localhost:5000
```

### Client
```bash
cd client
npm install
npm run dev                 # starts on http://localhost:5173
```

### Demo Accounts (all passwords: `Password@123`)
| Email | Role |
|---|---|
| admin@campus.edu | admin |
| officer.hostel@campus.edu | officer |
| officer.academic@campus.edu | officer |
| officer.it@campus.edu | officer |
| student1@campus.edu | student |
| student2@campus.edu | student |
| staff1@campus.edu | staff |

## Project Structure
```
/
├── client/          Vite + React 18 frontend
├── server/          Express + Mongoose backend
└── docs/            API contract, progress log, project context
```

## Documentation
- [API Contract](docs/API_CONTRACT.md)
- [Progress Log](docs/PROGRESS.md)
- [Project Context](docs/PROJECT_CONTEXT.md)