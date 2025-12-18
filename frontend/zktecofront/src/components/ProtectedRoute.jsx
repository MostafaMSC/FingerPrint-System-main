import React from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../utils/api';

const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(null);

    React.useEffect(() => {
        const checkAuth = async () => {
            const auth = await apiService.isAuthenticated();
            setIsAuthenticated(auth);
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return <div>Loading...</div>; // Or a proper spinner
    }

    if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to /login');
        return <Navigate to="/login" replace />;
    }

    console.log('User authenticated, rendering dashboard');
    return children;
};

export default ProtectedRoute;
