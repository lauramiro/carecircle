import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import { useAuth } from './contexts/AuthContext';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import InvitePage from './pages/InvitePage';
import CreateGroupPage from './pages/groups/CreateGroupPage';
import GroupDetailPage from './pages/groups/GroupDetailPage';
import GroupMembersPage from './pages/groups/GroupMembersPage';
import GroupsListPage from './pages/groups/GroupsListPage';
import GroupInvite from './pages/GroupInvite';
import PatientProfilePage from './pages/groups/PatientProfilePage';
import AddMedicationPage from './pages/medications/AddMedicationPage';
import MedicationsSchedulePage from './pages/medications/MedicationsSchedulePage';
import MedicationChecklistPage from './pages/checklist/MedicationChecklistPage';
import GroupJournalPage from './pages/groups/GroupJournalPage';
import InsightsPage from './pages/groups/InsightsPage';
import GroupShiftAssignmentsPage from './pages/groups/GroupShiftAssignmentsPage';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import AppointmentFormPage from './pages/appointments/AppointmentFormPage';
import AiQaPage from './pages/ai/AiQaPage';
import AdministrationLogPage from './pages/groups/AdministrationLogPage';
import MyShiftsPage from './pages/MyShiftsPage';
import SettingsPage from './pages/SettingsPage';
import { usePushNotifications } from './hooks/push/usePushNotifications';
import { HospitalSummaryPDF } from './components/hospital-summary/HospitalSummaryPDF';

function App() {
  const { session, loading } = useAuth();
  const isAuthenticated = !!session?.user?.email_confirmed_at;
  usePushNotifications(isAuthenticated);

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
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/signup"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/"
          element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dashboard/my-shifts" element={<MyShiftsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="groups/create" element={<CreateGroupPage />} />
          <Route path="groups/list" element={<GroupsListPage />} />
          <Route path="groups/:groupId" element={<GroupDetailPage />} />
          <Route path="groups/:groupId/members" element={<GroupMembersPage />} />
          <Route path="groups/:groupId/medications" element={<MedicationsSchedulePage />} />
          <Route path="groups/:groupId/journal" element={<GroupJournalPage />} />
          <Route path="groups/:groupId/insights" element={<InsightsPage />} />
          <Route path="groups/:groupId/shifts" element={<GroupShiftAssignmentsPage />} />
          <Route path="groups/:groupId/profile" element={<PatientProfilePage />} />
          <Route path="groups/:groupId/medications/add" element={<AddMedicationPage />} />
          <Route path="groups/:groupId/checklist" element={<MedicationChecklistPage />} />
          <Route path="groups/:groupId/administration-log" element={<AdministrationLogPage />} />
          <Route path="groups/:groupId/appointments" element={<AppointmentsPage />} />
          <Route path="groups/:groupId/appointments/new" element={<AppointmentFormPage />} />
          <Route path="groups/:groupId/appointments/:appointmentId/edit" element={<AppointmentFormPage />} />
          <Route path="groups/:groupId/ai-assistant" element={<AiQaPage />} />
          <Route path="/groups/:groupId/hospital-summary" element={<HospitalSummaryPDF />} />

        </Route>
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;