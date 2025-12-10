
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { exportToExcel, tableHeaders } from '../../utils/excelExport';
import './Dashboard.css';

const UsersTable = ({ deviceIp }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [currentUser, setCurrentUser] = useState({
        userID: '',
        name: '',
        department: '',
        section: ''
    });
      
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/ZKPython/get-users?deviceIp=${deviceIp}`);
                setUsers(res.data.users || []);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [deviceIp]);

    const filteredUsers = users.filter(user =>
        user.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toString().includes(searchTerm) ||
        user.section.toString().includes(searchTerm) ||
        user.UserID.toString().includes(searchTerm)
    );

    const handleExport = () => {
        exportToExcel(users, tableHeaders.users, 'قائمة_الموظفين', 'الموظفين');
    };

    const handleOpenAdd = () => {
        setModalMode('add');
        setCurrentUser({ userID: '', name: '', department: '', section: '' });
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setModalMode('edit');
        setCurrentUser({
            userID: user.UserID,
            name: user.Name,
            department: user.Department || '',
            section: user.Section || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

        try {
            await axios.post(`/api/ZKPython/delete-user?deviceIp=${deviceIp}&userId=${userId}`);
            setUsers(users.filter(u => u.UserID !== userId));
        } catch (error) {
            console.error("Failed to delete user", error);
            alert('فشل حذف المستخدم');
        }
    };

    const handleSaveUser = async () => {
        if (!currentUser.name) return;

        try {
            if (modalMode === 'add') {
                const res = await axios.post(`/api/ZKPython/add-user`, {
                    deviceIp,
                    userName: currentUser.name,
                    department: currentUser.department,
                    section: currentUser.section
                });
                if (res.data.success) {
                    const newUser = res.data.user;
                    setUsers([...users, newUser]);
                }
            } else {
                const res = await axios.post(`/api/ZKPython/edit-user?userId=${currentUser.userID}`, {
                    deviceIp,
                    userName: currentUser.name,
                    department: currentUser.department,
                    section: currentUser.section
                });
                if (res.data.success) {
                    setUsers(users.map(u => u.UserID === currentUser.userID ? { ...u, Name: currentUser.name, Department: currentUser.department, Section: currentUser.section } : u));
                }
            }
            setShowModal(false);
        } catch (error) {
            console.error("Failed to save user", error);
            alert('فشل حفظ بيانات المستخدم');
        }
    };

    const handleSyncUsers = async () => {
        setLoading(true);
        try {
            await axios.post(`/api/ZKPython/sync-users?deviceIp=${deviceIp}`);
            // Reload users
            const res = await axios.get(`/api/ZKPython/get-users?deviceIp=${deviceIp}`);
            setUsers(res.data.users || []);
            alert('تمت المزامنة بنجاح');
        } catch (error) {
            console.error("Failed to sync users", error);
            alert('فشل المزامنة');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="table-container">
            <div className="table-header">
                <h3 className="table-title">قائمة الموظفين</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <select 
                    value={departmentFilter}
                    onChange={e=> setDepartmentFilter(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option value=''>تصفية حسب القسم</option>
                        {[...new Set(users.map(u => u.Department).filter(d => d))].map((dept, idx) => (
                            <option key={idx} value={dept}>{dept}</option>
                        ))}
                    </select>
                    <select 
                    value={sectionFilter}
                    onChange={e=> setSectionFilter(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option value=''>تصفية حسب الشعبة</option>
                        {[...new Set(users.map(u => u.Section).filter(s => s))].map((sect, idx) => (
                            <option key={idx} value={sect}>{sect}</option>
                        ))}
                    </select>
                    <input 
                    type='text' placeholder='بحث عن موظف ...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {loading ? 'جاري التحميل...' : `${users.length} موظف`}
                    </span>
                    <button className="btn-export" onClick={handleSyncUsers} disabled={loading} style={{ backgroundColor: '#f39c12' }}>
                        🔄 مزامنة من الجهاز
                    </button>
                    <button className="btn-export" onClick={handleExport} disabled={users.length === 0}>
                        📥 تصدير Excel
                    </button>
                    <button className="btn-add" onClick={handleOpenAdd}>
                        + إضافة موظف
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem' }}>
                    <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }}></div>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>معرف المستخدم</th>
                                <th>الاسم</th>
                                <th>القسم</th>
                                <th>الشعبة</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{user.UserID}</td>
                                    <td>{user.Name}</td>
                                    <td>{user.Department || '-'}</td>
                                    <td>{user.Section || '-'}</td>
                                    <td>
                                        <button onClick={() => handleOpenEdit(user)} style={{ marginRight: '5px', cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.2rem' }} title="تعديل">✏️</button>
                                        <button onClick={() => handleDelete(user.UserID)} style={{ color: 'red', cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.2rem' }} title="حذف">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '400px', maxWidth: '90%'
                    }}>
                        <h3 style={{ marginBottom: '1.5rem', color: '#0c315d' }}>{modalMode === 'add' ? 'إضافة موظف جديد' : 'تعديل بيانات موظف'}</h3>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>الاسم:</label>
                            <input
                                type="text"
                                value={currentUser.name}
                                onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>القسم:</label>
                            <input
                                type="text"
                                value={currentUser.department}
                                onChange={e => setCurrentUser({ ...currentUser, department: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>الشعبة:</label>
                            <input
                                type="text"
                                value={currentUser.section}
                                onChange={e => setCurrentUser({ ...currentUser, section: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>إلغاء</button>
                            <button onClick={handleSaveUser} style={{ padding: '0.75rem 1.5rem', background: '#00b3a8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersTable;
