import React, { createContext, useState, useContext, useEffect } from 'react';

const DeviceContext = createContext();

export const devices = [
    { name: 'Head Quarter', ip: '172.16.1.40' },
    { name: 'Dawoodi-Data Center', ip: '192.168.150.233' },
    { name: 'Customer Center', ip: '10.4.44.15' },
    { name: 'Cairo-Desaster Recovery', ip: '192.168.11.184' },
];
export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider = ({ children }) => {
    // Default to the IP that was hardcoded, or load from localStorage
    const [deviceIp, setDeviceIp] = useState(localStorage.getItem('deviceIp') || '172.16.1.40');
    const [devicePort, setDevicePort] = useState(localStorage.getItem('devicePort') || '4370');

    // Save to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('deviceIp', deviceIp);
        localStorage.setItem('devicePort', devicePort);
    }, [deviceIp, devicePort]);

    return (
        <DeviceContext.Provider value={{ deviceIp, setDeviceIp, devicePort, setDevicePort, devices }}>
            {children}
        </DeviceContext.Provider>
    );
};
