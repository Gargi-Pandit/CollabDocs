# Google Docs Clone

A fullstack collaborative document editing application inspired by Google Docs. Built with React (frontend) and Node.js/Express (backend), featuring real-time editing, authentication, and commenting.

## Project Structure

```
root/
├── backend/        # Node.js/Express backend (API, WebSocket, DB models)
├── frontend/       # React frontend (UI, client logic)
├── README.md       # Project documentation
```

## Features
- User authentication (register/login)
- Create, edit, and share documents
- Real-time collaborative editing
- Commenting system
- Document sharing with permissions

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm (v8+ recommended)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd <project-root>
```

### 2. Install dependencies
#### Backend
```bash
cd backend
npm install
```
#### Frontend
```bash
cd ../frontend
npm install
```

### 3. Start the development servers
#### Backend
```bash
cd backend
npm start
```
#### Frontend
```bash
cd ../frontend
npm start
```

- The frontend will run on [http://localhost:3000](http://localhost:3000)
- The backend will run on [http://localhost:5000](http://localhost:5000)

## Folder Structure

- **backend/**
  - `controllers/` – API route handlers
  - `models/` – Mongoose models (User, Document, Comment)
  - `routes/` – Express route definitions
  - `middleware/` – Auth and other middleware
  - `sockets/` – WebSocket logic for real-time editing
  - `server.js` – Entry point for backend
- **frontend/**
  - `src/components/` – React UI components
  - `src/pages/` – Page-level components (routing targets)
  - `src/utils/` – Utility functions (API, auth helpers)
  - `public/` – Static assets

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request


