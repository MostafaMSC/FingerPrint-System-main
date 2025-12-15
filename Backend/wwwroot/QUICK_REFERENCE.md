# Quick Reference Guide

## 🎯 Common Tasks

### Adding a New Filter
**File**: `js/filters.js`

```javascript
export function applyFilters() {
    const dateFilter = document.getElementById('filterDate').value;
    const userFilter = document.getElementById('filterUser').value;
    // Add your new filter here:
    const newFilter = document.getElementById('newFilterId').value;

    const filtered = allLogs.filter(log => {
        const matchesDate = !dateFilter || log.timestamp.startsWith(dateFilter);
        const matchesUser = !userFilter || log.userId === userFilter;
        // Add your new filter logic:
        const matchesNew = !newFilter || log.someField === newFilter;
        
        return matchesDate && matchesUser && matchesNew;
    });

    displayLogs(filtered);
}
```

### Adding a New API Endpoint
**File**: `js/api.js`

```javascript
export async function fetchNewData() {
    const response = await fetch(`${API_BASE}/new-endpoint`);
    return await response.json();
}
```

### Adding a New Statistic
**File**: `js/stats.js`

```javascript
export function updateStats(logs, users) {
    // Existing stats...
    
    // Add new stat calculation:
    const newStat = logs.filter(log => /* your condition */).length;
    
    // Update DOM:
    document.getElementById('newStatId').textContent = newStat;
}
```

### Adding a New Tab
1. **Add HTML** in `index.html`:
```html
<button class="tab" onclick="switchTab('newtab')">
    🆕 New Tab
</button>

<div id="newtabTab" class="card hidden">
    <!-- Your content -->
</div>
```

2. **Update** `js/tabs.js`:
```javascript
export function switchTab(tab) {
    // Hide all tabs
    document.getElementById('logsTab').classList.add('hidden');
    document.getElementById('usersTab').classList.add('hidden');
    document.getElementById('newtabTab').classList.add('hidden');
    
    // Show selected tab
    if (tab === 'newtab') {
        document.getElementById('newtabTab').classList.remove('hidden');
        // Load data if needed
    }
}
```

## 📂 Module Responsibilities

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `api.js` | Backend communication | `fetchLogs()`, `fetchUsers()`, `connectDevice()` |
| `filters.js` | Filter logic | `applyFilters()`, `setLogsData()` |
| `logs.js` | Logs display | `loadLogs()`, `displayLogs()`, `exportCSV()` |
| `users.js` | Users display | `loadUsers()`, `displayUsers()` |
| `stats.js` | Statistics | `updateStats()` |
| `device.js` | Device connection | `connectDevice()` |
| `tabs.js` | Tab switching | `switchTab()` |
| `utils.js` | Utilities | `showError()`, `showLoading()` |
| `main.js` | Entry point | Exposes functions globally |

## 🔍 Debugging Tips

### Check Console Errors
Modern browsers show which module has the error:
```
Error in filters.js:62
```
Instead of:
```
Error in index.html:502
```

### Use Browser DevTools
1. Open DevTools (F12)
2. Go to Sources tab
3. Find `js/` folder
4. Set breakpoints in specific modules

### Common Issues

#### Module not loading
**Error**: `Failed to load module`
**Solution**: Check file path in import statement

#### Function not defined
**Error**: `connectDevice is not defined`
**Solution**: Check if function is exposed in `main.js`

#### Filter not working
**Check**: `filters.js` line 60-68
**Common issue**: Wrong comparison operator

## 🎨 Styling Guide

All styles are in `styles.css`. Common classes:

```css
.btn              /* Base button */
.btn-primary      /* Primary action button */
.btn-success      /* Success/positive button */
.card             /* Container card */
.card-header      /* Card header section */
.stat-card        /* Statistics card */
.loading          /* Loading state */
.error            /* Error message */
.hidden           /* Hide element */
```

## 📊 Data Flow

### Loading Logs
```
User → loadLogs() → fetchLogs() → API
                 ↓
            parseLogsData()
                 ↓
            setLogsData()
                 ↓
         updateUserFilter()
                 ↓
            updateStats()
                 ↓
            displayLogs()
```

### Filtering
```
User changes filter → applyFilters()
                           ↓
                    Filter allLogs array
                           ↓
                    displayLogs(filtered)
```

### Exporting
```
User clicks export → exportCSV()
                          ↓
                   Get filtered logs
                          ↓
                   Generate CSV
                          ↓
                   Download file
```

## 🧪 Testing Checklist

- [ ] Load logs successfully
- [ ] Filter by date works
- [ ] Filter by user works
- [ ] Combined filters work
- [ ] Export CSV works
- [ ] Switch tabs works
- [ ] Connect device works
- [ ] Statistics update correctly
- [ ] Error messages display
- [ ] Loading states show

## 🚀 Performance Tips

1. **Minimize API calls**: Cache data in modules
2. **Use event delegation**: Instead of multiple onclick handlers
3. **Lazy load tabs**: Only load data when tab is opened
4. **Debounce filters**: Wait for user to stop typing

## 📝 Code Style

### Naming Conventions
- **Functions**: camelCase (`loadLogs`, `applyFilters`)
- **Variables**: camelCase (`allLogs`, `userFilter`)
- **Constants**: UPPER_CASE (`API_BASE`)
- **Files**: lowercase (`filters.js`, `logs.js`)

### Comments
```javascript
/**
 * Function description
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return description
 */
export function myFunction(paramName) {
    // Implementation
}
```

## 🔧 Maintenance

### Regular Tasks
1. Check for unused functions
2. Update documentation
3. Review error handling
4. Test on different browsers
5. Optimize performance

### When Adding Features
1. Choose the right module
2. Keep functions small (<30 lines)
3. Add JSDoc comments
4. Update this guide if needed
5. Test thoroughly

## 📞 Need Help?

1. Check `ARCHITECTURE.md` for technical details
2. Check `COMPARISON.md` for before/after examples
3. Check `README.md` for overview
4. Check inline comments in code
