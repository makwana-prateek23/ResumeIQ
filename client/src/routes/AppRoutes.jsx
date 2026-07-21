import { Route, Routes } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import CreateResumePage from '../pages/CreateResumePage.jsx';
import FormatResumePage from '../pages/FormatResumePage.jsx';
import HomePage from '../pages/HomePage.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/format" element={<FormatResumePage />} />
        <Route path="/create" element={<CreateResumePage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
