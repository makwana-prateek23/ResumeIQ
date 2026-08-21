import { useContext } from 'react';
import { AuthContext } from '../context/auth-context.js';
export default function useAuth() { return useContext(AuthContext); }
