import React, { useState } from 'react';
import axios from 'axios';
import './Dashboard.css';

const Reports = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        if (!startDate || !endDate) {
            alert('يجب تحديد تاريخ البدء وتاريخ الانتهاء للتصدير.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(
                `/api/ZKPython/export?start_date=${startDate}&end_date=${endDate}`,
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `zk_export_${startDate}_to_${endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed', err);
            alert('فشل تصدير البيانات. تأكد من أن السيرفر يعمل بشكل صحيح.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="table-container" style={{ padding: '2rem' }}>
            <h3 className="table-title" style={{ marginBottom: '1.5rem' }}>تصدير التقارير</h3>

            <div style={{ maxWidth: '600px', background: '#f8fafc', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                    حدد نطاق التاريخ الذي تود تصدير سجلات الحضور له كملف Excel (CSV).
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-group">
                        <label style={{ width: '100px', fontWeight: 500 }}>تاريخ البدء:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>

                    <div className="input-group">
                        <label style={{ width: '100px', fontWeight: 500 }}>تاريخ الانتهاء:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleExport}
                            disabled={loading}
                            style={{ minWidth: '150px' }}
                        >
                            {loading ? 'جاري التصدير...' : '📥 تصدير CSV'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
