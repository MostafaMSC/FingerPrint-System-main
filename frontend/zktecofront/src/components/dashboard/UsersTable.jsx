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
        Id: null,
        Username: '',
        Department: '',
        Section: '',
        Role: ''
    });

    // Fetch users
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/ZKPython/get-users?deviceIp=${deviceIp}`);
                const normalizedUsers = (res.data.users || []).map(u => ({
                    Id: u.Id,
                    DeviceUserID: u.DeviceUserID || '',
                    DeviceIp: u.DeviceIp || '',
                    Username: u.Username || 'Unknown',
                    Department: u.Department || '',
                    Section: u.Section || '',
                    Role: (u.Role !== null && u.Role !== undefined) ? ROLE_MAPPING[u.Role] : '',
                }));
                setUsers(normalizedUsers);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setLoading(false);
            }
        };

        if (deviceIp) fetchUsers();
    }, [deviceIp]);

    // Filter users safely
    const filteredUsers = users.filter(user =>
        (user.Username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.Department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.Section || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.Id || '').toString().includes(searchTerm)
    ).filter(user =>
        !departmentFilter || user.Department === departmentFilter
    ).filter(user =>
        !sectionFilter || user.Section === sectionFilter
    );

    const handleExport = () => {
        exportToExcel(users, tableHeaders.users, 'قائمة_الموظفين', 'الموظفين');
    };

    const handleOpenAdd = () => {
        setModalMode('add');
        setCurrentUser({ Id: null, Username: '', Department: '', Section: '', Role: '' });
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setModalMode('edit');
        setCurrentUser({
            Id: user.Id,
            Username: user.Username,
            Department: user.Department || '',
            Section: user.Section || '',
            Role: user.Role || ''
        });
        setShowModal(true);
    };

    const ROLE_MAPPING = {
        0: 'Admin', // Normal User (or whatever role 0 signifies)
        1: 'Manager',      // Administrator
        2: 'Emplpoyee',        // Manager
        // Add other roles as needed
    };


    const handleDelete = async (userId) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        try {
            await axios.post(`/api/ZKPython/delete-user?deviceIp=${deviceIp}&userId=${userId}`);
            setUsers(users.filter(u => u.Id !== userId));
        } catch (error) {
            console.error("Failed to delete user", error);
            alert('فشل حذف المستخدم');
        }
    };

    const handleSaveUser = async () => {
        if (!currentUser.Username) return;
        try {
            if (modalMode === 'add') {
                const res = await axios.post(`/api/ZKPython/add-user`, {
                    DeviceIp: deviceIp,
                    UserName: currentUser.Username,
                    Department: currentUser.Department,
                    Section: currentUser.Section,
                    Role: currentUser.Role
                });
                if (res.data.success) {
                    const newUser = res.data.user;
                    setUsers([...users, {
                        Id: newUser.Id,
                        DeviceUserID: newUser.DeviceUserID || '',
                        DeviceIp: newUser.DeviceIp || '',
                        Username: newUser.Username || 'Unknown',
                        Department: newUser.Department || '',
                        Section: newUser.Section || '',
                        Role: newUser.Role || ''
                    }]);
                }
            } else {
                const res = await axios.post(`/api/ZKPython/edit-user?userId=${currentUser.Id}`, {
                    DeviceIp: deviceIp,
                    UserName: currentUser.Username,
                    Department: currentUser.Department,
                    Section: currentUser.Section,
                    Role: currentUser.Role
                });
                if (res.data.success) {
                    setUsers(users.map(u =>
                        u.Id === currentUser.Id
                            ? { ...u, Username: currentUser.Username, Department: currentUser.Department, Section: currentUser.Section, Role: currentUser.Role }
                            : u
                    ));
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
            const res = await axios.get(`/api/ZKPython/get-users?deviceIp=${deviceIp}`);
            const normalizedUsers = (res.data.users || []).map(u => ({
                Id: u.Id,
                DeviceUserID: u.DeviceUserID || '',
                DeviceIp: u.DeviceIp || '',
                Username: u.Username || 'Unknown',
                Department: u.Department || '',
                Section: u.Section || '',
                Role: u.Role || ''
            }));
            setUsers(normalizedUsers);
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
                        onChange={e => setDepartmentFilter(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option value=''>تصفية حسب القسم</option>
                        {[...new Set(users.map(u => u.Department).filter(d => d))].map((dept, idx) => (
                            <option key={idx} value={dept}>{dept}</option>
                        ))}
                    </select>
                    <select
                        value={sectionFilter}
                        onChange={e => setSectionFilter(e.target.value)}
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
                                <th>الدور</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, index) => (
                                <tr key={user.Id}>
                                    <td>{index + 1}</td>
                                    <td>{user.DeviceUserID}</td>
                                    <td>{user.Username}</td>
                                    <td>{user.Department || '-'}</td>
                                    <td>{user.Section || '-'}</td>
                                    <td>{user.Role || '-'}</td>
                                    <td>
                                        <button className="btn-action-edit" onClick={() => handleOpenEdit(user)} title="تعديل">
                                            ✏️ تعديل
                                        </button>
                                        <button className="btn-action-delete" onClick={() => handleDelete(user.Id)} title="حذف">
                                            🗑️ حذف
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{modalMode === 'add' ? 'إضافة موظف جديد' : 'تعديل بيانات موظف'}</h3>

                        <div>
                            <label>الاسم:</label>
                            <input
                                type="text"
                                value={currentUser.Username}
                                onChange={e => setCurrentUser({ ...currentUser, Username: e.target.value })}
                                placeholder="اسم الموظف"
                            />
                        </div>

                        <div>
                            <label>القسم:</label>
                            <input
                                type="text"
                                value={currentUser.Department}
                                onChange={e => setCurrentUser({ ...currentUser, Department: e.target.value })}
                                placeholder="القسم"
                            />
                        </div>

                        <div>
                            <label>الشعبة:</label>
                            <input
                                type="text"
                                value={currentUser.Section}
                                onChange={e => setCurrentUser({ ...currentUser, Section: e.target.value })}
                                placeholder="الشعبة"
                            />
                        </div>
                        <div>
                            <label>الدور:</label>
                            <select
                                className="device-select"
                                id="role"
                                value={currentUser.Role}
                                onChange={e => setCurrentUser({ ...currentUser, Role: e.target.value })}
                            >
                                <option value={0}>Employee</option>
                                <option value={1}>Manager</option>
                                <option value={2}>ِAdmin</option>
                            </select>
                        </div>


                        <div className="modal-actions">
                            <button className="btn" onClick={() => setShowModal(false)} style={{ backgroundColor: '#e2e8f0', color: '#64748b' }}>إلغاء</button>
                            <button className="btn btn-primary" onClick={handleSaveUser}>حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersTable;
