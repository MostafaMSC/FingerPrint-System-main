import React from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../utils/api';

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = apiService.isAuthenticated();
    console.log('ProtectedRoute check - isAuthenticated:', isAuthenticated);
    console.log('Stored accessToken:', localStorage.getItem('accessToken') ? 'EXISTS' : 'NOT FOUND');

    if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to /login');
        return <Navigate to="/login" replace />;
    }

    console.log('User authenticated, rendering dashboard');
    return children;
};

export default ProtectedRoute;
