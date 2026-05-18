// src/pages/AuthPage.tsx
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import AddressPicker from '../components/AddressPicker';
import axios from 'axios';

interface AuthPageProps {
  onLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      setError('Email/username and password are required');
      return;
    }

    try {
      const response = await axios.post('/api/login', {
        email: emailOrUsername,
        username: emailOrUsername,
        password
      });

      if (response.data.success) {
        console.log('Login successful:', response.data.user);
        setError('');
        onLogin(); // Trigger parent login action
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Server error during login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        <div className="mb-4">
          <label className="block mb-1 font-medium">Email or Username</label>
          <input
            type="text"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            placeholder="Enter your email or username"
          />
        </div>

        <div className="mb-4 relative">
          <label className="block mb-1 font-medium">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            placeholder="Enter your password"
          />
          <span
            className="absolute right-3 top-9 cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
