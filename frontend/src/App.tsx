import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import { useAuth } from './contexts/AuthContext';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvitePage from './pages/InvitePage';
import CreateGroupPage from './pages/groups/CreateGroupPage';
import GroupDetailPage from './pages/groups/GroupDetailPage';
import GroupsListPage from './pages/groups/GroupsListPage';
import GroupInvite from './pages/GroupInvite';
import PatientProfilePage from './pages/groups/PatientProfilePage';
import AddMedicationPage from './pages/medications/AddMedicationPage';
import MedicationsSchedulePage from './pages/medications/MedicationsSchedulePage';
import MedicationChecklistPage from './pages/checklist/MedicationChecklistPage';

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        <p style={{
          fontSize: '15px', color: 'var(--color-text-hint)',
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/group-invite" element={<InvitePage />} />
        <Route path="/group-invite/:groupId" element={<GroupInvite />} />
        <Route
          path="/login"
          element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/signup"
          element={session ? <Navigate to="/dashboard" replace /> : <SignupPage />}
        />
        <Route
          path="/"
          element={session ? <DashboardLayout /> : <Navigate to="/signup" replace />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="groups/create" element={<CreateGroupPage />} />
          <Route path="groups/list" element={<GroupsListPage />} />
          <Route path="groups/:groupId" element={<GroupDetailPage />} />
          <Route path="groups/:groupId/medications" element={<MedicationsSchedulePage />} />
          <Route path="groups/:groupId/profile" element={<PatientProfilePage />} />
          <Route path="groups/:groupId/medications/add" element={<AddMedicationPage />} />
          <Route path="checklist/:checklistId" element={<MedicationChecklistPage />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={session ? '/dashboard' : '/signup'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;