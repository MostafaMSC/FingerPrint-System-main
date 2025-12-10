import * as XLSX from 'xlsx';

/**
 * Export data to Excel file with proper formatting
 * @param {Array} data - Array of objects to export
 * @param {Array} headers - Array of {key, title} objects mapping data keys to Arabic headers
 * @param {string} fileName - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = (data, headers, fileName, sheetName = 'Sheet1') => {
    // Prepare data with Arabic headers
    const exportData = data.map((item, index) => {
        const row = {};
        headers.forEach(header => {
            if (header.key === '#') {
                row[header.title] = index + 1;
            } else {
                row[header.title] = item[header.key] ?? '-';
            }
        });
        return row;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Calculate column widths based on content
    const columnWidths = headers.map(header => {
        const headerLength = header.title.length;
        const maxDataLength = Math.max(
            ...exportData.map(row => {
                const value = row[header.title];
                return value ? String(value).length : 0;
            })
        );
        // Add some padding and use the larger of header or data width
        return { wch: Math.max(headerLength, maxDataLength) + 4 };
    });
    worksheet['!cols'] = columnWidths;

    // Set RTL for the worksheet (for Arabic support)
    worksheet['!dir'] = 'rtl';

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const fullFileName = `${fileName}_${timestamp}.xlsx`;

    // Download the file
    XLSX.writeFile(workbook, fullFileName);
};

/**
 * Pre-defined header configurations for each table
 */
export const tableHeaders = {
    workHours: [
        { key: '#', title: '#' },
        { key: 'userID', title: 'معرف المستخدم' },
        { key: 'name', title: 'الاسم' },
        { key: 'todayHours', title: 'ساعات اليوم' },
        { key: 'weeklyHours', title: 'ساعات الأسبوع' },
        { key: 'adjustedHours', title: 'ساعات الشهر' },
        { key: 'monthlyRequired', title: 'المطلوب شهرياً' },
        { key: 'adjustedAchievement', title: 'نسبة الإنجاز %' },
        { key: 'adjustedDeduction', title: 'نسبة الخصم %' }
    ],
    logs: [
        { key: '#', title: '#' },
        { key: 'UserID', title: 'معرف المستخدم' },
        { key: 'Name', title: 'الاسم' },
        { key: 'Date', title: 'التاريخ' },
        { key: 'CheckInTime', title: 'الدخول' },
        { key: 'CheckOutTime', title: 'الخروج' }
    ],
    late: [
        { key: '#', title: '#' },
        { key: 'UserID', title: 'معرف المستخدم' },
        { key: 'Name', title: 'الاسم' },
        { key: 'Time', title: 'وقت الحضور' }
    ],
    users: [
        { key: '#', title: '#' },
        { key: 'userID', title: 'معرف المستخدم' },
        { key: 'name', title: 'الاسم' }
    ]
};
