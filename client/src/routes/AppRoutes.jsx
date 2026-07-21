import { Route, Routes } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import CreateResumePage from '../pages/CreateResumePage.jsx';
import FormatResumePage from '../pages/FormatResumePage.jsx';
import HomePage from '../pages/HomePage.jsx';
import LandingPage from '../pages/LandingPage.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/resume" element={<FormatResumePage />} />
        <Route path="/match" element={<HomePage />} />
        <Route path="/create" element={<CreateResumePage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
