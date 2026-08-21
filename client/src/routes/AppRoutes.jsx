import { Route, Routes } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import CreateResumePage from '../pages/CreateResumePage.jsx';
import FormatResumePage from '../pages/FormatResumePage.jsx';
import HomePage from '../pages/HomePage.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import AtsCheckerPage from '../pages/AtsCheckerPage.jsx';
import AuthPage from '../pages/AuthPage.jsx';
import AuthCallbackPage from '../pages/AuthCallbackPage.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/resume" element={<ProtectedRoute><FormatResumePage /></ProtectedRoute>} />
        <Route path="/ats" element={<AtsCheckerPage />} />
        <Route path="/match" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateResumePage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
