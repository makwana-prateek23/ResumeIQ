import { Route, Routes } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}

export default AppRoutes;
