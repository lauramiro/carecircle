import { useAuth } from './contexts/AuthContext';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvitePage from './pages/InvitePage';
import GroupPage from './pages/GroupPage';

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

  const path = window.location.pathname;
  if (path === '/invite') return <InvitePage />;

  const groupMatch = path.match(/^\/group\/([^/]+)$/);
  if (groupMatch) return <GroupPage groupId={decodeURIComponent(groupMatch[1])} />;

  // If logged in, show dashboard
  if (session) return <DashboardPage />;

  // Check URL path for login vs signup
  if (path === '/login') return <LoginPage />;
  return <SignupPage />;
}

export default App;