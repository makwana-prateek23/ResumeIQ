import AppRoutes from './routes/AppRoutes.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

function App() {
  return <ThemeProvider><AuthProvider><AppRoutes /></AuthProvider></ThemeProvider>;
}

export default App;
