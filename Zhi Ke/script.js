let currentDate = new Date();
let currentWeek = 10;
let firstWeekDate = new Date(2026, 0, 1);
let selectedColor = '#e3f2fd';
let previousPage = 'pageMain';
let currentCell = null;
let editingCourseId = null;
let editingCardCourseId = null;

function initFirstWeekDate() {
    const savedDate = localStorage.getItem('firstWeekDate');
    if (savedDate) {
        const date = new Date(savedDate);
        if (!isNaN(date.getTime())) {
            firstWeekDate = date;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const firstWeekDateElement = document.getElementById('firstWeekDate');
            if (firstWeekDateElement) {
                firstWeekDateElement.textContent = `${year}/${month}/${day}`;
            }
            currentWeek = getWeekNumber();
            setDateByWeek(currentWeek);
            updateDate();
            updateWeekInfo();
        }
    }
}

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const defaultClassTimes = [
    '',
    '08:20<br>09:05',
    '09:10<br>09:55',
    '10:05<br>10:50',
    '10:55<br>11:40',
    '13:40<br>14:25',
    '14:30<br>15:15',
    '15:25<br>16:10',
    '16:15<br>17:00',
    '18:30<br>19:15',
    '19:20<br>20:05',
    '20:10<br>20:55'
];

function numberToChinese(num) {
    const chineseNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
    return chineseNumbers[num] || num.toString();
}

function initTable() {
    const table = document.getElementById('scheduleTable');
    const classCount = loadClassCount(); // 获取设置的节数
    const hideWeekend = loadHideWeekend(); // 获取是否隐藏周末的设置
    
    let html = '<tr><td></td>';
    
    // 添加表头（周一到周日，或根据设置隐藏周末）
    for (let i = 1; i <= 7; i++) {
        // 如果隐藏周末且是周六 (6) 或周日 (0)，跳过
        if (hideWeekend && (i % 7 === 6 || i % 7 === 0)) {
            continue;
        }
        html += `<td id="header-day-${i}">${weekDays[i % 7]}<br>--/--</td>`;
    }
    html += '</tr>';

    for (let i = 1; i <= classCount; i++) {
        const timeDisplay = getClassTimeDisplay(i);
        html += `<tr><td class="time-label">${timeDisplay}</td>`;
        for (let j = 1; j <= 7; j++) {
            // 如果隐藏周末且是周六 (6) 或周日 (0)，跳过
            if (hideWeekend && (j % 7 === 6 || j % 7 === 0)) {
                continue;
            }
            // 计算单元格索引 - 根据是否隐藏周末使用不同的列数
            const colsPerRow = hideWeekend ? 5 : 7;
            // 计算当前星期几在显示列中的位置
            let displayColIndex = j - 1;
            if (hideWeekend && j > 5) {
                // 如果是周日 (0)，调整为 5（周五后面）
                displayColIndex = 5;
            }
            const cellIndex = (i - 1) * colsPerRow + displayColIndex;
            html += `<td class="cell-container" data-row="${i}" data-col="${j}" data-date="${getDateForWeekday(j)}"><div class="class-cell" id="cell-${i}-${j}" onclick="editCell(this, ${i}, ${j})">点击添加课程</div></td>`;
        }
        html += '</tr>';
    }

    table.innerHTML = html;
    loadCourses();
    updateHeaderDates();
}

// 根据当前周数和星期几计算具体日期
function getDateForWeekday(weekday) {
    const currentDayOfWeek = currentDate.getDay();
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const targetDate = new Date(currentDate);
    targetDate.setDate(currentDate.getDate() + diffToMonday + (weekday - 1));
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${month}/${day}`;
}

function loadCourses() {
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const hideWeekend = loadHideWeekend();
    
    // 先清空所有课程显示并重置单元格状态
    document.querySelectorAll('.cell-container').forEach(container => {
        // 重置 rowspan
        container.removeAttribute('rowspan');
        container.style.display = '';
        container.style.height = '';
        
        // 重置单元格内容
        const cell = container.querySelector('.class-cell');
        if (cell) {
            cell.textContent = '';
            cell.classList.remove('has-class');
            cell.style.backgroundColor = '#f8f9fa';
            cell.style.color = '#999';
            cell.style.height = '';
            cell.removeAttribute('data-course-id');
        }
    });
    
    // 只显示在当前周数范围内的课程
    courses.forEach(course => {
        const startWeek = parseInt(course.startWeek) || 1;
        const endWeek = parseInt(course.endWeek) || 20;
        
        // 检查当前周是否在课程周数范围内
        if (currentWeek < startWeek || currentWeek > endWeek) {
            return; // 不在周数范围内，彻底不显示
        }
        
        // 检查单双周设置
        const isOddWeek = currentWeek % 2 === 1; // 当前周是否为单周
        const isEvenWeek = currentWeek % 2 === 0; // 当前周是否为双周
        
        // 如果设置了单双周限制，检查当前周是否符合
        if (course.oddWeek || course.evenWeek) {
            // 如果只选了单周，当前是双周则彻底不显示
            if (course.oddWeek && !course.evenWeek && isEvenWeek) {
                return;
            }
            // 如果只选了双周，当前是单周则彻底不显示
            if (course.evenWeek && !course.oddWeek && isOddWeek) {
                return;
            }
        }
        
        course.weekdays.forEach(weekday => {
            const weekdayNum = parseInt(weekday);
            
            // 如果隐藏周末且是周六 (6) 或周日 (0)，跳过
            if (hideWeekend && (weekdayNum === 6 || weekdayNum === 0)) {
                return;
            }
            
            // 检查这个课程在这个周数和节次是否被排除
            const excludeKey = `${course.classTime}-${weekday}-${currentWeek}`;
            if (course.excludedWeeks && course.excludedWeeks.includes(excludeKey)) {
                return; // 跳过被排除的课程
            }
            
            // 使用 data-row 和 data-col 属性查找正确的单元格容器
            const cellContainer = document.querySelector(`.cell-container[data-row="${course.classTime}"][data-col="${weekdayNum}"]`);
            if (cellContainer) {
                // 如果这个容器已经被合并，跳过
                if (cellContainer.style.display === 'none') {
                    return;
                }
                
                // 显示课程名称和地点
            let displayText = `<div class="course-name">${course.name}</div>`;
            if (course.location) {
                displayText += `<div class="course-location">${course.location}</div>`;
            }
            if (course.teacher) {
                displayText += `<div class="course-teacher">${course.teacher}</div>`;
            }
            
            const cell = cellContainer.querySelector('.class-cell');
            cell.innerHTML = displayText;
                cell.classList.add('has-class');
                cell.style.backgroundColor = course.color;
                cell.style.color = '#1976d2';
                // 存储课程 ID，方便点击时识别
                cell.setAttribute('data-course-id', course.id);
            }
        });
    });
    
    // 合并同一列中连续相同的课程
    // 使用 setTimeout 确保 DOM 已经渲染完成
    setTimeout(() => {
        mergeAdjacentCourses();
    }, 0);
}

// 合并同一列中连续相同的课程
function mergeAdjacentCourses() {
    const hideWeekend = loadHideWeekend();
    
    // 对每一列进行处理
    for (let col = 1; col <= 7; col++) {
        // 如果隐藏周末且是周六或周日，跳过
        if (hideWeekend && (col === 6 || col === 0)) {
            continue;
        }
        
        // 获取这一列的所有单元格容器
        const classCount = loadClassCount();
        let currentRow = 1;
        
        while (currentRow <= classCount) {
            const currentContainer = document.querySelector(`.cell-container[data-row="${currentRow}"][data-col="${col}"]`);
            if (!currentContainer) {
                currentRow++;
                continue;
            }
            
            const currentCell = currentContainer.querySelector('.class-cell');
            const currentCourseId = currentCell.getAttribute('data-course-id');
            
            // 如果没有课程，跳过
            if (!currentCourseId) {
                currentRow++;
                continue;
            }
            
            // 查找连续的相同课程
            let mergeCount = 1;
            let nextRow = currentRow + 1;
            
            while (nextRow <= classCount) {
                const nextContainer = document.querySelector(`.cell-container[data-row="${nextRow}"][data-col="${col}"]`);
                if (!nextContainer) {
                    break;
                }
                
                const nextCell = nextContainer.querySelector('.class-cell');
                const nextCourseId = nextCell.getAttribute('data-course-id');
                
                // 如果是相同的课程 ID，合并
                if (nextCourseId === currentCourseId) {
                    mergeCount++;
                    nextRow++;
                } else {
                    break;
                }
            }
            
            // 如果有多于一个的课程，进行合并
            if (mergeCount > 1) {
                // 设置当前单元格的 rowspan
                currentContainer.setAttribute('rowspan', mergeCount);
                
                // 隐藏被合并的单元格
                for (let i = 1; i < mergeCount; i++) {
                    const mergeContainer = document.querySelector(`.cell-container[data-row="${currentRow + i}"][data-col="${col}"]`);
                    if (mergeContainer) {
                        mergeContainer.style.display = 'none';
                    }
                }
            }
            
            // 移动到下一个未处理的行
            currentRow += mergeCount;
        }
    }
    
    // 调整所有格子高度为一致
    adjustAllCellsHeight();
}

// 调整所有格子高度为一致（与最高的格子高度相同）
function adjustAllCellsHeight() {
    const hideWeekend = loadHideWeekend();
    const classCount = loadClassCount();
    let maxSingleCellHeight = 50;
    
    // 第一步：计算所有未合并的单个格子的最大高度
    for (let row = 1; row <= classCount; row++) {
        for (let col = 1; col <= 7; col++) {
            // 如果隐藏周末且是周六或周日，跳过
            if (hideWeekend && (col === 6 || col === 0)) {
                continue;
            }
            
            const container = document.querySelector(`.cell-container[data-row="${row}"][data-col="${col}"]`);
            if (!container || container.style.display === 'none') {
                continue;
            }
            
            // 只计算未合并的单个格子（没有 rowspan 或 rowspan=1）
            const rowspan = container.getAttribute('rowspan');
            if (!rowspan || parseInt(rowspan) === 1) {
                const cell = container.querySelector('.class-cell');
                if (cell) {
                    cell.style.height = '';
                    const cellHeight = cell.offsetHeight;
                    if (cellHeight > maxSingleCellHeight) {
                        maxSingleCellHeight = cellHeight;
                    }
                }
            }
        }
    }
    
    // 第二步：设置所有格子的高度
    // - 未合并的格子：设置为 maxSingleCellHeight
    // - 合并的格子：设置为 maxSingleCellHeight × rowspan
    for (let row = 1; row <= classCount; row++) {
        for (let col = 1; col <= 7; col++) {
            // 如果隐藏周末且是周六或周日，跳过
            if (hideWeekend && (col === 6 || col === 0)) {
                continue;
            }
            
            const container = document.querySelector(`.cell-container[data-row="${row}"][data-col="${col}"]`);
            if (!container || container.style.display === 'none') {
                continue;
            }
            
            const cell = container.querySelector('.class-cell');
            if (cell) {
                const rowspan = container.getAttribute('rowspan');
                if (rowspan && parseInt(rowspan) > 1) {
                    // 合并的格子：高度 = 单个格子最大高度 × 合并数量
                    const rowspanCount = parseInt(rowspan);
                    cell.style.height = `${maxSingleCellHeight * rowspanCount}px`;
                } else {
                    // 未合并的格子：设置为最大高度
                    cell.style.height = `${maxSingleCellHeight}px`;
                }
            }
        }
    }
}

function updateDate() {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    
    document.getElementById('mainTitle').textContent = `${year}/${month}/${day}`;
    
    const weekDay = currentDate.getDay();
    document.getElementById('subTitle').textContent = `第${currentWeek}周 ${weekDays[weekDay]}`;
    
    // 更新表头日期
    updateHeaderDates();
}

function updateHeaderDates() {
    const hideWeekend = loadHideWeekend();
    
    // 计算当前周的第一天（周一）的日期
    const currentDayOfWeek = currentDate.getDay(); // 0 是周日，1 是周一...
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek; // 计算到周一的差值
    
    for (let i = 1; i <= 7; i++) {
        // 如果隐藏周末且是周六 (6) 或周日 (0)，跳过
        if (hideWeekend && (i % 7 === 6 || i % 7 === 0)) {
            continue;
        }
        
        // 计算该星期几的日期（周一 + (i-1) 天）
        const targetDate = new Date(currentDate);
        targetDate.setDate(currentDate.getDate() + diffToMonday + (i - 1));
        
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${month}/${day}`;
        
        const headerCell = document.getElementById(`header-day-${i}`);
        if (headerCell) {
            const weekdayText = weekDays[i % 7];
            headerCell.innerHTML = `${weekdayText}<br>${dateStr}`;
        }
    }
}

function getWeekNumber() {
    const diff = currentDate - firstWeekDate;
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
    return weeks;
}

function setDateByWeek(week) {
    // 根据目标周数计算日期
    const targetDate = new Date(firstWeekDate);
    targetDate.setDate(firstWeekDate.getDate() + (week - 1) * 7);
    currentDate = targetDate;
}

function showDateModal() {
    document.getElementById('dateModal').classList.add('show');
}

function closeDateModal() {
    document.getElementById('dateModal').classList.remove('show');
}

function jumpToCurrentWeek() {
    currentWeek = getWeekNumber();
    currentDate = new Date(); // 设置为今天
    updateDate();
    updateWeekInfo();
    loadCourses();
    closeDateModal();
    showToast('已跳转到当前周');
}

function showWeekSelectModal() {
    document.getElementById('selectedWeekNum').textContent = '1';
    document.getElementById('weekWheel').classList.remove('show');
    document.getElementById('weekSelectModal').classList.add('show');
}

function showWeekSelector() {
    const weekWheel = document.getElementById('weekWheel');
    let html = '';
    
    for (let i = 0; i <= 20; i++) {
        html += `<div class="number-wheel-item" onclick="selectWeek(${i})">${i}</div>`;
    }
    
    weekWheel.innerHTML = html;
    weekWheel.classList.toggle('show');
}

function selectWeek(week) {
    document.getElementById('selectedWeekNum').textContent = week;
    document.getElementById('weekWheel').classList.remove('show');
}

function closeWeekSelectModal() {
    document.getElementById('weekSelectModal').classList.remove('show');
    document.getElementById('weekWheel').classList.remove('show');
}

function confirmWeekJump() {
    const week = parseInt(document.getElementById('selectedWeekNum').textContent);
    if (week >= 0 && week <= 20) {
        setDateByWeek(week);
        currentWeek = week;
        updateDate();
        updateWeekInfo();
        loadCourses();
        closeWeekSelectModal();
        closeDateModal();
        showToast(`已跳转到第${week}周`);
    } else {
        alert('请选择 0-20 之间的周数');
    }
}

function jumpToWeek() {
    const week = prompt('请输入周数：');
    if (week && !isNaN(week) && week > 0) {
        const weekNum = parseInt(week);
        setDateByWeek(weekNum);
        currentWeek = weekNum;
        updateDate();
        updateWeekInfo();
        loadCourses();
        showToast(`已跳转到第${week}周`);
    }
    closeDateModal();
}

function previousWeek() {
    if (currentWeek > 1) {
        currentWeek--;
        // 根据周数变化调整日期（减 7 天）
        currentDate.setDate(currentDate.getDate() - 7);
        updateDate();
        updateWeekInfo();
        loadCourses();
        showToast(`第${currentWeek}周`);
    } else {
        showToast('已经是第一周了');
    }
}

function nextWeek() {
    currentWeek++;
    // 根据周数变化调整日期（加 7 天）
    currentDate.setDate(currentDate.getDate() + 7);
    updateDate();
    updateWeekInfo();
    loadCourses();
    showToast(`第${currentWeek}周`);
}

function updateWeekInfo() {
    document.getElementById('weekInfo').textContent = `第${currentWeek}周`;
}

function showFirstWeekDateModal() {
    const savedDate = localStorage.getItem('firstWeekDate');
    let year = 2026;
    let month = 1;
    let day = 1;
    
    if (savedDate) {
        const date = new Date(savedDate);
        if (!isNaN(date.getTime())) {
            year = date.getFullYear();
            month = date.getMonth() + 1;
            day = date.getDate();
        }
    }
    
    document.getElementById('selectedYear').textContent = year;
    document.getElementById('selectedMonth').textContent = month;
    document.getElementById('selectedDay').textContent = day;
    
    document.querySelectorAll('.number-wheel').forEach(wheel => {
        wheel.classList.remove('show');
    });
    
    document.getElementById('dateSelectModal').classList.add('show');
}

function setFirstWeek() {
    showFirstWeekDateModal();
}

function showYearSelector() {
    const monthWheel = document.getElementById('monthWheel');
    const dayWheel = document.getElementById('dayWheel');
    monthWheel.classList.remove('show');
    dayWheel.classList.remove('show');
    
    const yearWheel = document.getElementById('yearWheel');
    let html = '';
    
    for (let i = 2026; i <= 3000; i++) {
        html += `<div class="number-wheel-item" onclick="selectYear(${i})">${i}</div>`;
    }
    
    yearWheel.innerHTML = html;
    yearWheel.classList.toggle('show');
}

function selectYear(year) {
    document.getElementById('selectedYear').textContent = year;
    document.getElementById('yearWheel').classList.remove('show');
    updateDayWheel();
}

function showMonthSelector() {
    const yearWheel = document.getElementById('yearWheel');
    const dayWheel = document.getElementById('dayWheel');
    yearWheel.classList.remove('show');
    dayWheel.classList.remove('show');
    
    const monthWheel = document.getElementById('monthWheel');
    let html = '';
    
    for (let i = 1; i <= 12; i++) {
        html += `<div class="number-wheel-item" onclick="selectMonth(${i})">${i}</div>`;
    }
    
    monthWheel.innerHTML = html;
    monthWheel.classList.toggle('show');
}

function selectMonth(month) {
    document.getElementById('selectedMonth').textContent = month;
    document.getElementById('monthWheel').classList.remove('show');
    updateDayWheel();
}

function updateDayWheel() {
    const year = parseInt(document.getElementById('selectedYear').textContent);
    const month = parseInt(document.getElementById('selectedMonth').textContent);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const currentDay = parseInt(document.getElementById('selectedDay').textContent);
    const newDay = Math.min(currentDay, daysInMonth);
    document.getElementById('selectedDay').textContent = newDay;
    
    const dayWheel = document.getElementById('dayWheel');
    let html = '';
    
    for (let i = 1; i <= daysInMonth; i++) {
        html += `<div class="number-wheel-item" onclick="selectDay(${i})">${i}</div>`;
    }
    
    dayWheel.innerHTML = html;
}

function showDaySelector() {
    const yearWheel = document.getElementById('yearWheel');
    const monthWheel = document.getElementById('monthWheel');
    yearWheel.classList.remove('show');
    monthWheel.classList.remove('show');
    
    const dayWheel = document.getElementById('dayWheel');
    if (!dayWheel.innerHTML) {
        updateDayWheel();
    }
    dayWheel.classList.toggle('show');
}

function selectDay(day) {
    document.getElementById('selectedDay').textContent = day;
    document.getElementById('dayWheel').classList.remove('show');
}

function closeDateSelectModal() {
    document.getElementById('dateSelectModal').classList.remove('show');
    // 隐藏所有数字轮
    document.querySelectorAll('.number-wheel').forEach(wheel => {
        wheel.classList.remove('show');
    });
}

function confirmFirstWeekDate() {
    const year = parseInt(document.getElementById('selectedYear').textContent);
    const month = parseInt(document.getElementById('selectedMonth').textContent);
    const day = parseInt(document.getElementById('selectedDay').textContent);
    
    // 验证日期
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const newDate = new Date(dateStr);
    
    if (isNaN(newDate.getTime())) {
        alert('请输入有效的日期');
        return;
    }
    
    // 保存设置
    localStorage.setItem('firstWeekDate', dateStr);
    firstWeekDate = newDate;
    setDateByWeek(currentWeek);
    updateDate();
    
    // 更新设置页面显示
    const yearStr = year.toString();
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    document.getElementById('firstWeekDate').textContent = `${yearStr}/${monthStr}/${dayStr}`;
    
    closeDateSelectModal();
    closeDateModal();
    showToast('第一周日期已更新');
}

function toggleHideWeekend() {
    const currentSetting = localStorage.getItem('hideWeekend') === 'true';
    const newSetting = !currentSetting;
    localStorage.setItem('hideWeekend', newSetting.toString());
    
    document.getElementById('hideWeekendValue').textContent = newSetting ? '开启' : '关闭';
    
    // 重新初始化表格
    initTable();
    
    showToast(`隐藏周末已${newSetting ? '开启' : '关闭'}`);
}

function loadHideWeekend() {
    const hideWeekend = localStorage.getItem('hideWeekend') !== 'false'; // 默认为 true，除非明确设置为 false
    const valueElement = document.getElementById('hideWeekendValue');
    if (valueElement) {
        valueElement.textContent = hideWeekend ? '开启' : '关闭';
    }
    return hideWeekend;
}

function showAddClassPage() {
    previousPage = 'pageMain';
    switchPage('pageAddClass');
    // 动态生成节次选项
    updateClassTimeOptions();
    // 重置返回键计数器
    if (typeof resetBackButtonCount === 'function') {
        resetBackButtonCount();
    }
}

function updateClassTimeOptions() {
    const classCount = loadClassCount();
    const container = document.getElementById('classTimeCheckboxes');
    let html = '';
    
    for (let i = 1; i <= classCount; i++) {
        const chineseNum = numberToChinese(i);
        const savedTimes = JSON.parse(localStorage.getItem('classTimes') || '{}');
        const timeKey = `class_${i}`;
        const savedTime = savedTimes[timeKey];
        
        let timeStr = '';
        if (savedTime) {
            // 保存的格式是 HH:MM-HH:MM，直接用 - 分割
            const parts = savedTime.split('-');
            if (parts.length === 2) {
                timeStr = `${parts[0]}-${parts[1]}`;
            } else {
                // 如果是旧格式（用<br>分割），处理旧格式
                const [startTime, endTime] = savedTime.split('<br>');
                timeStr = `${startTime}-${endTime}`;
            }
        } else if (i <= 11 && defaultClassTimes[i]) {
            const [startTime, endTime] = defaultClassTimes[i].split('<br>');
            timeStr = `${startTime}-${endTime}`;
        } else {
            timeStr = '';
        }
        
        const optionText = timeStr ? `第${chineseNum}节 (${timeStr})` : `第${chineseNum}节`;
        html += `
            <label class="checkbox-item">
                <input type="checkbox" name="classTime" value="${i}"> ${optionText}
            </label>
        `;
    }
    
    container.innerHTML = html;
}

function share() {
    document.getElementById('importModal').classList.add('show');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('show');
}

function showUrlInputModal() {
    closeImportModal();
    document.getElementById('jwxtUrl').value = '';
    document.getElementById('urlInputModal').classList.add('show');
}

function closeUrlInputModal() {
    document.getElementById('urlInputModal').classList.remove('show');
}

function showSettingsPage() {
    // 保存当前页面作为返回页面
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
        previousPage = currentPage.id;
    } else {
        previousPage = 'pageMain'; // 默认返回主页面
    }
    switchPage('pageSettings');
    // 重置返回键计数器
    if (typeof resetBackButtonCount === 'function') {
        resetBackButtonCount();
    }
}

function showProfilePage() {
    previousPage = 'pageMain';
    switchPage('pageProfile');
    updateNav('profile');
    updateWeekNavVisibility();
    // 重置返回键计数器
    if (typeof resetBackButtonCount === 'function') {
        resetBackButtonCount();
    }
}

function showMyCourses() {
    previousPage = 'pageProfile';
    switchPage('pageMyCourses');
    loadMyCourses();
    // 重置返回键计数器
    if (typeof resetBackButtonCount === 'function') {
        resetBackButtonCount();
    }
}

function loadMyCourses() {
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const container = document.getElementById('coursesList');
    
    if (courses.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; margin-top: 50px; font-size: 16px;">暂无课程<br>点击格子添加课程</div>';
        return;
    }
    
    // 按课程名称分组（相同名称的课程合并显示）
    const groupedCourses = {};
    courses.forEach(course => {
        if (!groupedCourses[course.name]) {
            groupedCourses[course.name] = [];
        }
        groupedCourses[course.name].push(course);
    });
    
    let html = '';
    for (const courseName in groupedCourses) {
        const courseList = groupedCourses[courseName];
        const firstCourse = courseList[0];
        
        // 收集所有星期几
        const allWeekdays = new Set();
        courseList.forEach(c => {
            c.weekdays.forEach(d => allWeekdays.add(d));
        });
        
        // 转换为数组并排序
        const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const sortedWeekdays = Array.from(allWeekdays).sort((a, b) => parseInt(a) - parseInt(b));
        const weekdayStr = sortedWeekdays.map(d => weekdayNames[parseInt(d)]).join('、');
        
        // 获取节次信息
        const classTimes = courseList.map(c => `第${numberToChinese(c.classTime)}节`).join('、');
        
        html += `
            <div class="course-card" style="background-color: ${firstCourse.color};" onclick="showEditCourseCard(${firstCourse.id})">
                <div class="course-card-header">
                    <div class="course-card-name">${courseName}</div>
                </div>
                <div class="course-card-location">${firstCourse.location || '暂无地点'}</div>
                ${firstCourse.teacher ? `<div class="course-card-teacher">👨‍🏫 ${firstCourse.teacher}</div>` : ''}
                <div class="course-card-info">
                    <div>📅 ${weekdayStr}</div>
                    <div>⏰ ${classTimes}</div>
                    <div class="course-card-weeks">📆 第${firstCourse.startWeek}-${firstCourse.endWeek}周</div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function showEditCourseCard(courseId) {
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const course = courses.find(c => c.id === courseId);
    
    if (course) {
        editingCardCourseId = courseId;
        
        // 设置表单值
        document.getElementById('editCardCourseName').value = course.name;
        document.getElementById('editCardLocation').value = course.location || '';
        document.getElementById('editCardTeacher').value = course.teacher || '';
        
        // 显示课程信息头部
        document.getElementById('displayCourseName').textContent = course.name;
        const detailText = [
            course.location || '暂无地点',
            course.teacher ? `👨‍🏫 ${course.teacher}` : ''
        ].filter(Boolean).join(' | ');
        document.getElementById('displayCourseDetail').textContent = detailText;
        
        // 显示周数信息
        const startWeek = course.startWeek || 1;
        const endWeek = course.endWeek || 20;
        document.getElementById('displayCourseWeeks').textContent = `第${startWeek}-${endWeek}周`;
        
        // 显示单双周信息
        const oddWeek = course.oddWeek || false;
        const evenWeek = course.evenWeek || false;
        let weekTypeText = '全部';
        if (oddWeek && !evenWeek) {
            weekTypeText = '单周';
        } else if (!oddWeek && evenWeek) {
            weekTypeText = '双周';
        }
        document.getElementById('displayCourseWeekType').textContent = weekTypeText;
        
        // 显示星期信息
        const allWeekdays = new Set();
        courses.filter(c => c.name === course.name).forEach(c => {
            c.weekdays.forEach(d => allWeekdays.add(d));
        });
        const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const sortedWeekdays = Array.from(allWeekdays).sort((a, b) => parseInt(a) - parseInt(b));
        const weekdayStr = sortedWeekdays.map(d => weekdayNames[parseInt(d)]).join('、');
        document.getElementById('displayCourseWeekdays').textContent = weekdayStr;
        
        // 初始化颜色选择器
        editCardSelectedColor = course.color || '#e3f2fd';
        const colorPicker = document.getElementById('editCardColorPicker');
        colorPicker.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.getAttribute('data-color') === editCardSelectedColor) {
                opt.classList.add('selected');
            }
        });
        
        // 初始化节次选择器
        const classTimeContainer = document.getElementById('editCardClassTimeCheckboxes');
        const classCount = loadClassCount();
        let html = '';
        for (let i = 1; i <= classCount; i++) {
            const chineseNum = numberToChinese(i);
            const savedTimes = JSON.parse(localStorage.getItem('classTimes') || '{}');
            const timeKey = `class_${i}`;
            const savedTime = savedTimes[timeKey];
            
            let timeStr = '';
            if (savedTime) {
                // 保存的格式是 HH:MM-HH:MM，直接用 - 分割
                const parts = savedTime.split('-');
                if (parts.length === 2) {
                    timeStr = `${parts[0]}-${parts[1]}`;
                } else {
                    // 如果是旧格式（用<br>分割），处理旧格式
                    const [startTime, endTime] = savedTime.split('<br>');
                    timeStr = `${startTime}-${endTime}`;
                }
            } else if (i <= 11 && defaultClassTimes[i]) {
                const [startTime, endTime] = defaultClassTimes[i].split('<br>');
                timeStr = `${startTime}-${endTime}`;
            } else {
                timeStr = '';
            }
            
            const optionText = timeStr ? `第${chineseNum}节 (${timeStr})` : `第${chineseNum}节`;
            // 获取该课程名称的所有节次
            const courseClassTimes = courses.filter(c => c.name === course.name).map(c => String(c.classTime));
            const isChecked = courseClassTimes.includes(String(i)) ? 'checked' : '';
            html += `
                <label class="checkbox-item">
                    <input type="checkbox" name="editCardClassTime" value="${i}" ${isChecked}> ${optionText}
                </label>
            `;
        }
        classTimeContainer.innerHTML = html;
        
        document.getElementById('editCourseCardModal').classList.add('show');
    }
}

function closeEditCourseCardModal() {
    document.getElementById('editCourseCardModal').classList.remove('show');
    editingCardCourseId = null;
}

function saveCourseCardEdit() {
    const courseName = document.getElementById('editCardCourseName').value;
    const location = document.getElementById('editCardLocation').value;
    const teacher = document.getElementById('editCardTeacher').value;
    const classTimes = Array.from(document.querySelectorAll('input[name="editCardClassTime"]:checked')).map(cb => cb.value);
    
    if (!courseName) {
        alert('请输入课程名称');
        return;
    }
    
    if (!classTimes || classTimes.length === 0) {
        alert('请至少选择一个节次');
        return;
    }
    
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const courseIndex = courses.findIndex(c => c.id === editingCardCourseId);
    
    if (courseIndex !== -1) {
        const oldName = courses[courseIndex].name;
        
        // 删除所有同名课程
        const newCourses = courses.filter(c => c.name !== oldName);
        
        // 找到原课程的其他信息（周数、星期等）
        const oldCourses = courses.filter(c => c.name === oldName);
        const startWeek = oldCourses[0]?.startWeek || 1;
        const endWeek = oldCourses[0]?.endWeek || 20;
        const oddWeek = oldCourses[0]?.oddWeek || false;
        const evenWeek = oldCourses[0]?.evenWeek || false;
        
        // 收集所有星期几
        const allWeekdays = new Set();
        oldCourses.forEach(c => {
            c.weekdays.forEach(d => allWeekdays.add(d));
        });
        const weekdays = Array.from(allWeekdays);
        
        // 为每个节次创建新的课程记录
        classTimes.forEach(classTime => {
            newCourses.push({
                id: editingCardCourseId,
                name: courseName,
                location: location || '',
                teacher: teacher || '',
                classTime: classTime,
                weekdays: weekdays,
                startWeek: startWeek,
                endWeek: endWeek,
                color: editCardSelectedColor,
                oddWeek: oddWeek,
                evenWeek: evenWeek
            });
        });
        
        localStorage.setItem('courses', JSON.stringify(newCourses));
        
        // 刷新课程显示
        loadCourses();
        loadMyCourses();
        
        alert('课程已更新');
    }
    
    closeEditCourseCardModal();
}

function deleteCourseCompletely() {
    if (!confirm('确定要完全删除这个课程吗？这将删除该课程名称在所有周数和节次的所有记录，此操作不可恢复！')) {
        return;
    }
    
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const courseIndex = courses.findIndex(c => c.id === editingCardCourseId);
    
    if (courseIndex !== -1) {
        const courseName = courses[courseIndex].name;
        
        // 删除所有同名课程
        const newCourses = courses.filter(c => c.name !== courseName);
        localStorage.setItem('courses', JSON.stringify(newCourses));
        
        // 刷新课程显示
        loadCourses();
        loadMyCourses();
        
        alert('已完全删除该课程');
    }
    
    closeEditCourseCardModal();
}

function showMainPage() {
    switchPage('pageMain');
    updateNav('schedule');
    updateWeekNavVisibility();
}

function switchPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // 每次切换页面时更新周数导航栏可见性
    updateWeekNavVisibility();
}

function updateNav(activePage) {
    const navItems = document.querySelectorAll('.nav-item');
    if (activePage === 'schedule') {
        navItems[0].classList.add('active');
        navItems[1].classList.remove('active');
    } else if (activePage === 'profile') {
        navItems[0].classList.remove('active');
        navItems[1].classList.add('active');
    }
}

function updateWeekNavVisibility() {
    const weekNav = document.querySelector('.week-nav');
    const currentPage = document.querySelector('.page.active');
    
    if (weekNav) {
        if (currentPage && currentPage.id === 'pageMain') {
            weekNav.classList.remove('hidden');
        } else {
            weekNav.classList.add('hidden');
        }
    }
}

function goBack() {
    switchPage(previousPage);
    
    // 根据返回的页面更新导航状态
    if (previousPage === 'pageMain') {
        updateNav('schedule');
        // 重置返回键计数器
        if (typeof resetBackButtonCount === 'function') {
            resetBackButtonCount();
        }
    } else if (previousPage === 'pageProfile') {
        updateNav('profile');
    }
}

function selectColor(element) {
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    selectedColor = element.getAttribute('data-color');
}

function selectEditColor(element) {
    const colorPicker = document.getElementById('editColorPicker');
    colorPicker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    editSelectedColor = element.getAttribute('data-color');
}

function selectEditCardColor(element) {
    const colorPicker = document.getElementById('editCardColorPicker');
    colorPicker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    editCardSelectedColor = element.getAttribute('data-color');
}

function closeEditCourseModal() {
    document.getElementById('editCourseModal').classList.remove('show');
    editingCourseId = null;
}

function saveEditCourse() {
    const courseName = document.getElementById('editCourseName').value;
    const locationName = document.getElementById('editLocationName').value;
    const teacherName = document.getElementById('editTeacherName').value;
    
    if (!courseName) {
        alert('请输入课程名称');
        return;
    }
    
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const courseIndex = courses.findIndex(c => c.id === editingCourseId);
    
    if (courseIndex !== -1) {
        // 更新课程名称、上课地点和授课教师
        courses[courseIndex].name = courseName;
        courses[courseIndex].location = locationName || '';
        courses[courseIndex].teacher = teacherName || '';
        courses[courseIndex].color = editSelectedColor;
        localStorage.setItem('courses', JSON.stringify(courses));
        
        // 刷新课程显示
        loadCourses();
        
        alert('课程已更新');
    }
    
    closeEditCourseModal();
}

function deleteSingleCourse() {
    if (!confirm('确定要删除当前周的这一节课程吗？')) {
        return;
    }
    
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const weekday = String(currentCell.col);
    const weekdayNum = parseInt(weekday);
    
    console.log('删除课程 - 当前星期几:', weekday, '当前周:', currentWeek);
    console.log('删除前课程数量:', courses.length);
    
    // 只删除该课程在当前周当前天的记录，保留其他周和其他天的记录
    const newCourses = courses.map(c => {
        // 如果不是要编辑的课程，原样返回
        if (c.id !== editingCourseId) {
            return c;
        }
        
        // 检查课程是否在当前周数范围内
        const startWeek = parseInt(c.startWeek) || 1;
        const endWeek = parseInt(c.endWeek) || 20;
        
        // 如果课程不在当前周数范围内，原样返回
        if (currentWeek < startWeek || currentWeek > endWeek) {
            return c;
        }
        
        // 检查该课程是否在当前天有记录
        const hasCurrentWeekday = c.weekdays.some(d => {
            const dayNum = typeof d === 'string' ? parseInt(d) : d;
            return dayNum === weekdayNum;
        });
        
        // 如果该课程在当前天没有记录，原样返回
        if (!hasCurrentWeekday) {
            return c;
        }
        
        // 该课程在当前周当前天有记录，需要处理
        
        // 如果课程跨越多周，使用 excludedWeeks 机制
        if (startWeek !== endWeek || endWeek > 1) {
            // 创建课程副本
            const updatedCourse = { ...c };
            
            if (!updatedCourse.excludedWeeks) {
                updatedCourse.excludedWeeks = [];
            }
            
            // 获取被点击的节次
            const classTime = c.classTime;
            const excludeKey = `${classTime}-${weekday}-${currentWeek}`;
            
            if (!updatedCourse.excludedWeeks.includes(excludeKey)) {
                updatedCourse.excludedWeeks.push(excludeKey);
            }
            
            console.log('添加排除标记:', excludeKey);
            return updatedCourse;
        }
        
        // 如果是单周课程
        if (startWeek === endWeek && startWeek === currentWeek) {
            // 检查是否还有其他天的记录
            const otherWeekdays = c.weekdays.filter(d => {
                const dayNum = typeof d === 'string' ? parseInt(d) : d;
                return dayNum !== weekdayNum;
            });
            
            // 如果还有其他天的记录，更新 weekdays
            if (otherWeekdays.length > 0) {
                const updatedCourse = { ...c };
                updatedCourse.weekdays = otherWeekdays.map(d => String(d));
                console.log('保留其他天:', updatedCourse.weekdays);
                return updatedCourse;
            }
            
            // 如果只有当前天的记录，删除该课程
            console.log('删除单周单天课程');
            return null;
        }
        
        return c;
    }).filter(c => c !== null); // 过滤掉被删除的课程
    
    console.log('删除后课程数量:', newCourses.length);
    console.log('剩余课程:', newCourses.map(c => ({ 
        id: c.id, 
        weekdays: c.weekdays, 
        classTime: c.classTime, 
        startWeek: c.startWeek, 
        endWeek: c.endWeek,
        excludedWeeks: c.excludedWeeks
    })));
    
    localStorage.setItem('courses', JSON.stringify(newCourses));
    
    // 刷新课程显示
    loadCourses();
    
    alert('已删除当前周该天的所有课程');
    
    closeEditCourseModal();
}

function deleteAllCourse() {
    if (!confirm('确定要删除这个课程名称的所有课程吗？此操作不可恢复！')) {
        return;
    }
    
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const courseIndex = courses.findIndex(c => c.id === editingCourseId);
    
    if (courseIndex !== -1) {
        const courseName = courses[courseIndex].name;
        
        // 删除所有同名课程
        const newCourses = courses.filter(c => c.name !== courseName);
        localStorage.setItem('courses', JSON.stringify(newCourses));
        
        // 刷新课程显示并重新初始化表格
        initTable();
        
        alert('已删除所有该名称的课程');
    }
    
    closeEditCourseModal();
}

function editCell(cell, row, col) {
    currentCell = { cell, row, col };
    
    // 检查单元格是否有课程 ID
    const courseId = cell.getAttribute('data-course-id');
    
    if (courseId) {
        // 有课程 ID，从 localStorage 中找到这个课程
        const courses = JSON.parse(localStorage.getItem('courses') || '[]');
        const existingCourse = courses.find(c => c.id == courseId);
        
        if (existingCourse) {
            // 显示编辑选项框
            document.getElementById('editCourseName').value = existingCourse.name;
            document.getElementById('editLocationName').value = existingCourse.location || '';
            document.getElementById('editTeacherName').value = existingCourse.teacher || '';
            editingCourseId = existingCourse.id;
            
            // 初始化颜色选择器
            editSelectedColor = existingCourse.color || '#e3f2fd';
            const colorPicker = document.getElementById('editColorPicker');
            colorPicker.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.getAttribute('data-color') === editSelectedColor) {
                    opt.classList.add('selected');
                }
            });
            
            document.getElementById('editCourseModal').classList.add('show');
            return;
        }
    }
    
    // 没有课程 - 进入添加课程页面
    editingCourseId = null;
    // 清空表单
    document.getElementById('courseForm').reset();
    selectedColor = '#e3f2fd';
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelector('.color-option.color-1').classList.add('selected');
    showAddClassPage();
}

// 辅助函数：获取合并单元格的起始行和合并数量
function getMergedCellInfo(cell) {
    const container = cell.parentElement;
    const rowspan = container.getAttribute('rowspan');
    const row = parseInt(container.getAttribute('data-row'));
    const col = parseInt(container.getAttribute('data-col'));
    
    return {
        startRow: row,
        rowspan: rowspan ? parseInt(rowspan) : 1,
        col: col
    };
}

function saveCourse() {
    const courseName = document.getElementById('courseName').value;
    const location = document.getElementById('location').value;
    const teacher = document.getElementById('teacher').value;
    const classTimes = Array.from(document.querySelectorAll('input[name="classTime"]:checked')).map(cb => cb.value);
    const weekdays = Array.from(document.querySelectorAll('input[name="weekday"]:checked')).map(cb => cb.value);
    const startWeek = document.getElementById('startWeek').value;
    const endWeek = document.getElementById('endWeek').value;
    const oddWeek = document.getElementById('oddWeek').checked;
    const evenWeek = document.getElementById('evenWeek').checked;

    if (!courseName) {
        alert('请输入课程名称');
        return;
    }

    if (!classTimes || classTimes.length === 0) {
        alert('请选择上课时间');
        return;
    }

    if (weekdays.length === 0) {
        alert('请选择上课日期');
        return;
    }

    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    
    if (editingCourseId !== null) {
        // 修改现有课程 - 先删除旧课程
        const courseIndex = courses.findIndex(c => c.id === editingCourseId);
        if (courseIndex !== -1) {
            courses.splice(courseIndex, 1);
        }
    }
    
    // 为每个节次创建独立的课程记录
    const courseId = Date.now(); // 为这门课程生成统一的 ID
    classTimes.forEach(classTime => {
        const courseData = {
            id: courseId,
            name: courseName,
            location: location,
            teacher: teacher,
            classTime: classTime,
            weekdays: weekdays,
            startWeek: startWeek || 1,
            endWeek: endWeek || 20,
            color: selectedColor,
            oddWeek: oddWeek,
            evenWeek: evenWeek
        };
        courses.push(courseData);
    });
    
    localStorage.setItem('courses', JSON.stringify(courses));
    
    // 刷新课程显示
    loadCourses();
    
    alert('课程已保存！');
    
    editingCourseId = null;
    currentCell = null;
    goBack();
}

function showWeekSetting() {
    const date = prompt('请输入第一周开始日期（格式：YYYY-MM-DD）：');
    if (date) {
        const newDate = new Date(date);
        if (!isNaN(newDate.getTime())) {
            const year = newDate.getFullYear();
            const month = String(newDate.getMonth() + 1).padStart(2, '0');
            const day = String(newDate.getDate()).padStart(2, '0');
            document.getElementById('firstWeekDate').textContent = `${year}/${month}/${day}`;
            localStorage.setItem('firstWeekDate', date);
            
            firstWeekDate = newDate;
            currentWeek = getWeekNumber();
            updateDate();
            
            alert('第一周日期已更新');
        } else {
            alert('日期格式不正确');
        }
    }
}

function setClassCount() {
    const currentCount = localStorage.getItem('classCount') || '11';
    document.getElementById('selectedClassCount').textContent = currentCount;
    document.getElementById('classCountWheel').classList.remove('show');
    document.getElementById('classCountModal').classList.add('show');
}

function loadClassCount() {
    const savedCount = localStorage.getItem('classCount') || '11';
    const countElement = document.getElementById('classCountValue');
    if (countElement) {
        countElement.textContent = savedCount;
    }
    return parseInt(savedCount);
}

function setClassTime() {
    // 重置到默认值（第 1 节课的时间）
    document.getElementById('selectedClassNum').textContent = '1';
    document.getElementById('selectedHour').textContent = '08';
    document.getElementById('selectedMinute').textContent = '20';
    document.getElementById('selectedEndHour').textContent = '09';
    document.getElementById('selectedEndMinute').textContent = '05';
    
    // 隐藏所有数字轮
    document.querySelectorAll('.number-wheel').forEach(wheel => {
        wheel.classList.remove('show');
    });
    
    // 显示模态框
    document.getElementById('classTimeModal').classList.add('show');
}

function showClassSelector() {
    const classCount = loadClassCount();
    const classWheel = document.getElementById('classWheel');
    let html = '';
    
    for (let i = 1; i <= classCount; i++) {
        const chineseNum = numberToChinese(i);
        html += `<div class="number-wheel-item" onclick="selectClass(${i})">第${chineseNum}节</div>`;
    }
    
    classWheel.innerHTML = html;
    classWheel.classList.toggle('show');
}

function selectClass(num) {
    document.getElementById('selectedClassNum').textContent = num;
    document.getElementById('classWheel').classList.remove('show');
    
    // 加载已保存的时间
    const savedTimes = JSON.parse(localStorage.getItem('classTimes') || '{}');
    const timeKey = `class_${num}`;
    const savedTime = savedTimes[timeKey];
    
    if (savedTime) {
        const [startTime, endTime] = savedTime.split('-');
        const [startHour, startMinute] = startTime.split(':');
        const [endHour, endMinute] = endTime.split(':');
        
        document.getElementById('selectedHour').textContent = startHour.padStart(2, '0');
        document.getElementById('selectedMinute').textContent = startMinute.padStart(2, '0');
        document.getElementById('selectedEndHour').textContent = endHour.padStart(2, '0');
        document.getElementById('selectedEndMinute').textContent = endMinute.padStart(2, '0');
    }
}

function showHourSelector() {
    const hourWheel = document.getElementById('hourWheel');
    let html = '';
    
    for (let i = 0; i <= 24; i++) {
        html += `<div class="number-wheel-item" onclick="selectHour(${i})">${i.toString().padStart(2, '0')}</div>`;
    }
    
    hourWheel.innerHTML = html;
    hourWheel.classList.toggle('show');
}

function selectHour(hour) {
    document.getElementById('selectedHour').textContent = hour.toString().padStart(2, '0');
    document.getElementById('hourWheel').classList.remove('show');
}

function showMinuteSelector() {
    const minuteWheel = document.getElementById('minuteWheel');
    let html = '';
    
    for (let i = 0; i <= 60; i++) {
        html += `<div class="number-wheel-item" onclick="selectMinute(${i})">${i.toString().padStart(2, '0')}</div>`;
    }
    
    minuteWheel.innerHTML = html;
    minuteWheel.classList.toggle('show');
}

function selectMinute(minute) {
    document.getElementById('selectedMinute').textContent = minute.toString().padStart(2, '0');
    document.getElementById('minuteWheel').classList.remove('show');
}

function showEndHourSelector() {
    const hourWheel = document.getElementById('endHourWheel');
    let html = '';
    
    for (let i = 0; i <= 24; i++) {
        html += `<div class="number-wheel-item" onclick="selectEndHour(${i})">${i.toString().padStart(2, '0')}</div>`;
    }
    
    hourWheel.innerHTML = html;
    hourWheel.classList.toggle('show');
}

function selectEndHour(hour) {
    document.getElementById('selectedEndHour').textContent = hour.toString().padStart(2, '0');
    document.getElementById('endHourWheel').classList.remove('show');
}

function showEndMinuteSelector() {
    const minuteWheel = document.getElementById('endMinuteWheel');
    let html = '';
    
    for (let i = 0; i <= 60; i++) {
        html += `<div class="number-wheel-item" onclick="selectEndMinute(${i})">${i.toString().padStart(2, '0')}</div>`;
    }
    
    minuteWheel.innerHTML = html;
    minuteWheel.classList.toggle('show');
}

function selectEndMinute(minute) {
    document.getElementById('selectedEndMinute').textContent = minute.toString().padStart(2, '0');
    document.getElementById('endMinuteWheel').classList.remove('show');
}

function showClassCountSelector() {
    const classCountWheel = document.getElementById('classCountWheel');
    let html = '';
    
    for (let i = 1; i <= 50; i++) {
        html += `<div class="number-wheel-item" onclick="selectClassCount(${i})">${i}</div>`;
    }
    
    classCountWheel.innerHTML = html;
    classCountWheel.classList.toggle('show');
}

function selectClassCount(count) {
    document.getElementById('selectedClassCount').textContent = count;
    document.getElementById('classCountWheel').classList.remove('show');
}

function closeClassCountModal() {
    document.getElementById('classCountModal').classList.remove('show');
    document.getElementById('classCountWheel').classList.remove('show');
}

function confirmClassCount() {
    const count = document.getElementById('selectedClassCount').textContent;
    localStorage.setItem('classCount', count);
    document.getElementById('classCountValue').textContent = count;
    // 重新初始化表格
    initTable();
    closeClassCountModal();
    showToast(`课程节数已设置为${count}节`);
}

function closeClassTimeModal() {
    document.getElementById('classTimeModal').classList.remove('show');
    // 隐藏所有数字轮
    document.querySelectorAll('.number-wheel').forEach(wheel => {
        wheel.classList.remove('show');
    });
}

function saveClassTime() {
    const classNum = document.getElementById('selectedClassNum').textContent;
    const startHour = document.getElementById('selectedHour').textContent;
    const startMinute = document.getElementById('selectedMinute').textContent;
    const endHour = document.getElementById('selectedEndHour').textContent;
    const endMinute = document.getElementById('selectedEndMinute').textContent;
    
    // 验证时间格式
    if (parseInt(startHour) > parseInt(endHour) || 
        (parseInt(startHour) === parseInt(endHour) && parseInt(startMinute) >= parseInt(endMinute))) {
        alert('结束时间必须晚于开始时间');
        return;
    }
    
    // 保存时间设置
    const savedTimes = JSON.parse(localStorage.getItem('classTimes') || '{}');
    const timeKey = `class_${classNum}`;
    savedTimes[timeKey] = `${startHour}:${startMinute}-${endHour}:${endMinute}`;
    localStorage.setItem('classTimes', JSON.stringify(savedTimes));
    
    alert(`第${classNum}节课时间已保存`);
    closeClassTimeModal();
    
    // 重新初始化表格
    initTable();
}

function getClassTimeDisplay(classNum) {
    const savedTimes = JSON.parse(localStorage.getItem('classTimes') || '{}');
    const timeKey = `class_${classNum}`;
    const savedTime = savedTimes[timeKey];
    
    if (savedTime) {
        // 保存的格式是 HH:MM-HH:MM，需要正确分割
        const dashIndex = savedTime.indexOf('-');
        if (dashIndex > 0) {
            const startTime = savedTime.substring(0, dashIndex);
            const endTime = savedTime.substring(dashIndex + 1);
            return `第${numberToChinese(classNum)}节<br>${startTime}<br>${endTime}`;
        } else {
            // 旧格式处理
            const [startTime, endTime] = savedTime.split('<br>');
            return `第${numberToChinese(classNum)}节<br>${startTime}<br>${endTime}`;
        }
    } else {
        // 使用默认时间
        if (classNum <= 11 && defaultClassTimes[classNum]) {
            return `第${numberToChinese(classNum)}节<br>${defaultClassTimes[classNum]}`;
        } else {
            return `第${numberToChinese(classNum)}节`;
        }
    }
}

function setFontSize() {
    const currentSize = localStorage.getItem('fontSize') || '12px';
    const sizeOptions = [
        { label: '小', value: '9px' },
        { label: '标准', value: '12px' },
        { label: '大', value: '15px' },
        { label: '超大', value: '18px' }
    ];
    
    const currentOption = sizeOptions.find(opt => opt.value === currentSize);
    document.getElementById('selectedFontSize').textContent = currentOption ? currentOption.label : '标准';
    document.getElementById('fontSizeWheel').classList.remove('show');
    document.getElementById('fontSizeModal').classList.add('show');
}

function showFontSizeSelector() {
    const fontSizeWheel = document.getElementById('fontSizeWheel');
    const sizeOptions = [
        { label: '小', value: '9px' },
        { label: '标准', value: '12px' },
        { label: '大', value: '15px' },
        { label: '超大', value: '18px' }
    ];
    
    let html = '';
    sizeOptions.forEach(opt => {
        html += `<div class="number-wheel-item" onclick="selectFontSize('${opt.value}', '${opt.label}')">${opt.label}</div>`;
    });
    
    fontSizeWheel.innerHTML = html;
    fontSizeWheel.classList.toggle('show');
}

function selectFontSize(value, label) {
    document.getElementById('selectedFontSize').textContent = label;
    document.getElementById('fontSizeWheel').classList.remove('show');
}

function closeFontSizeModal() {
    document.getElementById('fontSizeModal').classList.remove('show');
    document.getElementById('fontSizeWheel').classList.remove('show');
}

function confirmFontSize() {
    const selectedLabel = document.getElementById('selectedFontSize').textContent;
    const sizeOptions = [
        { label: '小', value: '9px' },
        { label: '标准', value: '12px' },
        { label: '大', value: '15px' },
        { label: '超大', value: '18px' }
    ];
    
    const selectedOption = sizeOptions.find(opt => opt.label === selectedLabel);
    if (selectedOption) {
        localStorage.setItem('fontSize', selectedOption.value);
        document.getElementById('fontSizeValue').textContent = selectedOption.label;
        applyFontSize(selectedOption.value);
        closeFontSizeModal();
        showToast(`字体大小已设置为${selectedOption.label}`);
    }
}

function loadFontSize() {
    const savedSize = localStorage.getItem('fontSize') || '12px';
    const sizeOptions = [
        { label: '小', value: '9px' },
        { label: '标准', value: '12px' },
        { label: '大', value: '15px' },
        { label: '超大', value: '18px' }
    ];
    
    const sizeInfo = sizeOptions.find(opt => opt.value === savedSize);
    if (sizeInfo) {
        const sizeElement = document.getElementById('fontSizeValue');
        if (sizeElement) {
            sizeElement.textContent = sizeInfo.label;
        }
        applyFontSize(savedSize);
    }
}

function applyFontSize(size) {
    const style = document.createElement('style');
    style.id = 'fontSizeStyle';
    style.textContent = `
        .class-cell,
        .class-cell .course-name,
        .class-cell .course-location,
        .class-cell .course-teacher {
            font-size: ${size} !important;
        }
    `;
    
    const existingStyle = document.getElementById('fontSizeStyle');
    if (existingStyle) {
        existingStyle.remove();
    }
    document.head.appendChild(style);
    
    // 应用字体大小后，检测并调整单元格高度
    setTimeout(() => {
        adjustCellsHeightAfterFontSizeChange();
    }, 100);
}

// 字体大小改变后检测并调整单元格高度
function adjustCellsHeightAfterFontSizeChange() {
    const hideWeekend = loadHideWeekend();
    const classCount = loadClassCount();
    
    // 第一步：先清除所有单元格的高度设置，让浏览器根据字体大小自然渲染
    for (let row = 1; row <= classCount; row++) {
        for (let col = 1; col <= 7; col++) {
            if (hideWeekend && (col === 6 || col === 0)) {
                continue;
            }
            
            const container = document.querySelector(`.cell-container[data-row="${row}"][data-col="${col}"]`);
            if (!container || container.style.display === 'none') {
                continue;
            }
            
            const cell = container.querySelector('.class-cell');
            if (cell) {
                // 清除之前设置的高度
                cell.style.height = '';
            }
        }
    }
    
    // 等待浏览器重新渲染后，计算新的最大高度
    setTimeout(() => {
        let maxSingleCellHeight = 0;
        
        // 第二步：遍历所有单元格，找到最大高度
        for (let row = 1; row <= classCount; row++) {
            for (let col = 1; col <= 7; col++) {
                if (hideWeekend && (col === 6 || col === 0)) {
                    continue;
                }
                
                const container = document.querySelector(`.cell-container[data-row="${row}"][data-col="${col}"]`);
                if (!container || container.style.display === 'none') {
                    continue;
                }
                
                const rowspan = container.getAttribute('rowspan');
                if (!rowspan || parseInt(rowspan) === 1) {
                    const cell = container.querySelector('.class-cell');
                    if (cell) {
                        const cellHeight = cell.offsetHeight;
                        if (cellHeight > maxSingleCellHeight) {
                            maxSingleCellHeight = cellHeight;
                        }
                    }
                }
            }
        }
        
        // 第三步：设置所有单元格为统一的最大高度
        for (let row = 1; row <= classCount; row++) {
            for (let col = 1; col <= 7; col++) {
                if (hideWeekend && (col === 6 || col === 0)) {
                    continue;
                }
                
                const container = document.querySelector(`.cell-container[data-row="${row}"][data-col="${col}"]`);
                if (!container || container.style.display === 'none') {
                    continue;
                }
                
                const cell = container.querySelector('.class-cell');
                if (cell) {
                    const rowspan = container.getAttribute('rowspan');
                    if (rowspan && parseInt(rowspan) > 1) {
                        const rowspanCount = parseInt(rowspan);
                        cell.style.height = `${maxSingleCellHeight * rowspanCount}px`;
                    } else {
                        cell.style.height = `${maxSingleCellHeight}px`;
                    }
                }
            }
        }
    }, 50);
}

function clearData() {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
        localStorage.clear();
        alert('数据已清除');
        location.reload();
    }
}

function showFeature() {
    alert('该功能正在开发中！');
}

function showHelpFeedback() {
    document.getElementById('helpFeedbackModal').classList.add('show');
}

function closeHelpFeedbackModal() {
    document.getElementById('helpFeedbackModal').classList.remove('show');
}

function showAbout() {
    document.getElementById('aboutModal').classList.add('show');
}

function closeAboutModal() {
    document.getElementById('aboutModal').classList.remove('show');
}

function copyEmail() {
    const email = 'kanxi12138@126.com';
    navigator.clipboard.writeText(email).then(() => {
        showToast('邮箱地址已复制！');
    }).catch(err => {
        // 备用方案：使用传统的复制方法
        const textArea = document.createElement('textarea');
        textArea.value = email;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('邮箱地址已复制！');
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

let touchStartX = 0;
let touchEndX = 0;
let isSwiping = false;
let editSelectedColor = '#e3f2fd';
let editCardSelectedColor = '#e3f2fd';

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    isSwiping = true;
}, false);

document.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    touchEndX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    isSwiping = false;
}, false);

function handleSwipe() {
    const swipeThreshold = 80;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            const currentPage = document.querySelector('.page.active');
            if (currentPage && currentPage.id === 'pageMain') {
                showProfilePage();
            }
        } else if (diff < 0) {
            const currentPage = document.querySelector('.page.active');
            if (currentPage && currentPage.id === 'pageProfile') {
                showMainPage();
            }
        }
    }
}

let jwxtWebView = null;
let floatButton = null;
let backButton = null;

function openJwxtWebView() {
    const url = document.getElementById('jwxtUrl').value.trim();
    
    if (!url) {
        showToast('请输入教务系统网址');
        return;
    }
    
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = 'http://' + url;
    }
    
    closeUrlInputModal();
    
    if (typeof plus === 'undefined') {
        showToast('请在5+App环境中运行');
        return;
    }
    
    createFloatButton();
    createBackButton();
    
    jwxtWebView = plus.webview.create(finalUrl, 'jwxt_webview', {
        top: '0px',
        bottom: '0px',
        left: '0px',
        right: '0px',
        width: '100%',
        height: '100%',
        scalable: true,
        scrollIndicator: 'vertical'
    });
    
    jwxtWebView.addEventListener('loaded', function() {
        console.log('=== WebView loaded 事件触发 ===');
        console.log('=== 当前 URL: ' + jwxtWebView.getURL());
    });
    
    jwxtWebView.addEventListener('overrideUrlLoading', function(e) {
        console.log('=== overrideUrlLoading 事件触发 ===');
        console.log('=== URL: ' + e.url);
        
        if (e.url && e.url.indexOf('schedule://') === 0) {
            e.preventDefault();
            try {
                var encodedData = e.url.substring('schedule://'.length);
                var result = JSON.parse(decodeURIComponent(encodedData));
                console.log('=== 通过 URL scheme 收到数据 ===');
                console.log('=== result: ' + JSON.stringify(result).substring(0, 200));
                
                if (result.error) {
                    showToast(result.error);
                    return;
                }
                
                if (!result.data || result.data.length === 0) {
                    showToast('未获取到课程，请确保已进入课表页面');
                    return;
                }
                
                processImportedSchedule(result.data);
            } catch(err) {
                console.log('=== URL scheme 解析错误: ' + err.message);
            }
        }
    });
    
    jwxtWebView.show('slide-in-right');
    
    if (plus.key) {
        plus.key.addEventListener('backbutton', handleWebViewBackButton);
    }
    
    showToast('请登录教务系统后点击右下角按钮导入课表');
}

function createFloatButton() {
    if (floatButton) {
        floatButton.close();
        floatButton = null;
    }
    
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || 360;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || 640;
    const btnSize = 56;
    const marginRight = 20;
    const marginBottom = 80;
    
    const initialTop = screenHeight - btnSize - marginBottom;
    const initialLeft = screenWidth - btnSize - marginRight;
    
    let currentLeft = initialLeft;
    let currentTop = initialTop;
    
    floatButton = new plus.nativeObj.View('floatBtn', {
        top: initialTop + 'px',
        left: initialLeft + 'px',
        width: btnSize + 'px',
        height: btnSize + 'px'
    });
    
    floatButton.draw([
        {
            tag: 'rect',
            id: 'bg',
            position: { top: '0px', left: '0px', width: '100%', height: '100%' },
            rectStyles: {
                color: '#1976d2',
                radius: btnSize / 2,
                borderWidth: '0px'
            }
        },
        {
            tag: 'font',
            id: 'text',
            position: { top: '0px', left: '0px', width: '100%', height: '100%' },
            textStyles: {
                size: '28px',
                color: '#ffffff',
                align: 'center',
                verticalAlign: 'middle'
            },
            text: '+'
        }
    ]);
    
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let hasMoved = false;
    
    console.log('=== 悬浮按钮已创建 ===');
    
    floatButton.addEventListener('touchstart', function(e) {
        console.log('=== touchstart ===');
        hasMoved = false;
        startTime = Date.now();
        startX = e.globalX || e.clientX || 0;
        startY = e.globalY || e.clientY || 0;
        console.log('startX: ' + startX + ', startY: ' + startY);
    });
    
    floatButton.addEventListener('touchmove', function(e) {
        let currentX = e.globalX || e.clientX || 0;
        let currentY = e.globalY || e.clientY || 0;
        
        let moveX = currentX - startX;
        let moveY = currentY - startY;
        
        if (Math.abs(moveX) > 10 || Math.abs(moveY) > 10) {
            hasMoved = true;
        }
        
        let newLeft = currentLeft + moveX;
        let newTop = currentTop + moveY;
        
        newLeft = Math.max(0, Math.min(newLeft, screenWidth - btnSize));
        newTop = Math.max(0, Math.min(newTop, screenHeight - btnSize));
        
        floatButton.setStyle({
            top: newTop + 'px',
            left: newLeft + 'px'
        });
        
        startX = currentX;
        startY = currentY;
        currentLeft = newLeft;
        currentTop = newTop;
    });
    
    floatButton.addEventListener('touchend', function(e) {
        console.log('=== touchend ===');
        console.log('hasMoved: ' + hasMoved);
        
        let endTime = Date.now();
        let duration = endTime - startTime;
        console.log('duration: ' + duration + 'ms');
        
        if (!hasMoved && duration < 500) {
            console.log('=== 判定为点击，调用 importScheduleFromWebView ===');
            importScheduleFromWebView();
        }
    });
    
    floatButton.show();
    console.log('=== 悬浮按钮已显示 ===');
}

function createBackButton() {
    if (backButton) {
        backButton.close();
        backButton = null;
    }
    
    const btnSize = 40;
    const marginLeft = 10;
    const marginTop = 10;
    
    backButton = new plus.nativeObj.View('backBtn', {
        top: marginTop + 'px',
        left: marginLeft + 'px',
        width: btnSize + 'px',
        height: btnSize + 'px'
    });
    
    backButton.draw([
        {
            tag: 'rect',
            id: 'bg',
            position: { top: '0px', left: '0px', width: '100%', height: '100%' },
            rectStyles: {
                color: 'rgba(255, 255, 255, 0.95)',
                radius: btnSize / 2,
                borderWidth: '0px'
            }
        },
        {
            tag: 'font',
            id: 'text',
            position: { top: '0px', left: '0px', width: '100%', height: '100%' },
            textStyles: {
                size: '20px',
                color: '#333333',
                align: 'center',
                verticalAlign: 'middle'
            },
            text: '←'
        }
    ]);
    
    backButton.addEventListener('click', function() {
        closeJwxtWebView();
    });
    
    backButton.show();
}

function handleWebViewBackButton() {
    if (jwxtWebView) {
        closeJwxtWebView();
    }
}

function closeJwxtWebView() {
    if (floatButton) {
        floatButton.close();
        floatButton = null;
    }
    
    if (backButton) {
        backButton.close();
        backButton = null;
    }
    
    if (jwxtWebView) {
        jwxtWebView.close('slide-out-right');
        jwxtWebView = null;
    }
    
    if (plus.key) {
        plus.key.removeEventListener('backbutton', handleWebViewBackButton);
    }
    
    showMainPage();
    showToast('已退出教务系统');
}

function importScheduleFromWebView() {
    console.log('=== importScheduleFromWebView 函数开始执行 ===');
    console.log('jwxtWebView: ' + (jwxtWebView ? '存在' : '不存在'));
    
    if (!jwxtWebView) {
        showToast('WebView未打开');
        console.log('=== WebView未打开，退出 ===');
        return;
    }
    
    showToast('正在获取课表数据...');
    console.log('=== 开始执行 evalJS ===');
    
    var jsCode = `
        (function() {
            function parseCourseTableUniversal() {
                var dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                var results = [];
                
                var standardResult = parseStandardSystem();
                if (standardResult.length > 0) {
                    console.log("检测到标准教务系统，使用策略1解析");
                    return standardResult;
                }
                
                var commonResult = parseCommonPattern();
                if (commonResult.length > 0) {
                    console.log("检测到常见课表模式，使用策略2解析");
                    return commonResult;
                }
                
                var allTablesResult = parseAllTables();
                if (allTablesResult.length > 0) {
                    console.log("在页面中找到课表数据，使用策略3解析");
                    return allTablesResult;
                }
                
                console.warn("未能检测到标准课表格式，返回空数组");
                return [];
            }
            
            function parseStandardSystem() {
                var results = [];
                var mainTable = document.querySelector('table[id^="kbgrid_table_"]');
                if (!mainTable) return results;
                
                var dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                
                for (var dayIndex = 0; dayIndex < 7; dayIndex++) {
                    var day = dayNames[dayIndex];
                    
                    for (var period = 1; period <= 11; period++) {
                        var cellId = (dayIndex + 1) + '-' + period;
                        var cell = mainTable.querySelector('td[id="' + cellId + '"]');
                        
                        if (cell && cell.innerHTML.trim()) {
                            var coursesInCell = extractCoursesFromCell(cell, day);
                            results = results.concat(coursesInCell);
                        }
                    }
                }
                
                return results;
            }
            
            function parseCommonPattern() {
                var results = [];
                var dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                
                var possibleTables = document.querySelectorAll('table');
                
                for (var i = 0; i < possibleTables.length; i++) {
                    var table = possibleTables[i];
                    if (hasCourseInfo(table)) {
                        var parsedData = attemptParseTable(table, dayNames);
                        if (parsedData.length > 0) {
                            results = results.concat(parsedData);
                        }
                    }
                }
                
                return results;
            }
            
            function parseAllTables() {
                var results = [];
                var dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                
                var allTables = document.querySelectorAll('table');
                
                for (var i = 0; i < allTables.length; i++) {
                    var table = allTables[i];
                    if (isLikelyScheduleTable(table)) {
                        var parsedData = attemptParseTable(table, dayNames);
                        if (parsedData.length > 0) {
                            results = results.concat(parsedData);
                        }
                    }
                }
                
                return results;
            }
            
            function extractCoursesFromCell(cell, day) {
                var results = [];
                
                var courseContainers = cell.querySelectorAll('.timetable_con, .course_info, .class_item, .kebiao_content, .kbcontent');
                if (courseContainers.length > 0) {
                    for (var i = 0; i < courseContainers.length; i++) {
                        var course = parseCourseContainer(courseContainers[i], day);
                        if (course) results.push(course);
                    }
                }
                
                if (results.length === 0) {
                    var course = parseTableCellContent(cell, day);
                    if (course) results.push(course);
                }
                
                return results;
            }
            
            function parseCourseContainer(container, day) {
                try {
                    var content = container.textContent || container.innerText;
                    var courseInfo = analyzeCourseText(content, day);
                    return courseInfo;
                } catch (e) {
                    return null;
                }
            }
            
            function parseTableCellContent(cell, day) {
                try {
                    var content = cell.textContent || cell.innerText;
                    var courseInfo = analyzeCourseText(content, day);
                    return courseInfo;
                } catch (e) {
                    return null;
                }
            }
            
            function analyzeCourseText(text, day) {
                if (!text || text.trim().length === 0) return null;
                
                var cleanText = text.replace(/\\s+/g, ' ').trim();
                
                var courseName = '';
                var location = '';
                var teacher = '';
                var sectionStart = 0;
                var sectionEnd = 0;
                var weekRangeStart = 0;
                var weekRangeEnd = 0;
                var isOddWeek = false;
                var isEvenWeek = false;
                
                var nameMatch = cleanText.match(/([\\u4e00-\\u9fa5a-zA-Z0-9\\s\\-\\_]+?)(?:\\(|\\s|$|老师|教师|周|节|校区|楼|教室)/);
                if (nameMatch) {
                    courseName = nameMatch[1].trim();
                }
                
                var locationRegex = /(?:\\d+周)?([A-Z\\d\\u4e00-\\u9fa5]*校区[A-Z\\d\\u4e00-\\u9fa5]*[楼栋][A-Z\\d]+)/;
                var locationMatch = cleanText.match(locationRegex);
                if (locationMatch) {
                    location = locationMatch[1].replace(/\\s+/g, '').trim();
                }
                
                var teacherRegex = /([A-Z\\u4e00-\\u9fa5]{2,4})(?:老师|教师|讲授|主讲)/;
                var teacherMatch = cleanText.match(teacherRegex);
                if (teacherMatch) {
                    teacher = teacherMatch[1].trim();
                } else {
                    if (location) {
                        var afterLocationIndex = cleanText.indexOf(location) + location.length;
                        var afterLocationText = cleanText.substring(afterLocationIndex);
                        
                        var nameAfterLocation = afterLocationText.match(/([A-Z\\u4e00-\\u9fa5]{2,4})/);
                        if (nameAfterLocation) {
                            var potentialTeacher = nameAfterLocation[1];
                            if (isValidTeacherName(potentialTeacher)) {
                                teacher = potentialTeacher;
                            }
                        }
                    }
                    
                    if (!teacher) {
                        var potentialTeachers = cleanText.match(/[A-Z\\u4e00-\\u9fa5]{2,4}/g);
                        if (potentialTeachers) {
                            for (var pi = 0; pi < potentialTeachers.length; pi++) {
                                var potentialTeacher = potentialTeachers[pi];
                                if (isValidTeacherName(potentialTeacher) && 
                                    potentialTeacher.indexOf('校区') === -1 && 
                                    potentialTeacher.indexOf('楼') === -1 &&
                                    potentialTeacher.indexOf('周') === -1 &&
                                    potentialTeacher.indexOf('节') === -1) {
                                    teacher = potentialTeacher;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                var timeMatch = cleanText.match(/(\\d+)[-~](\\d+)节/);
                if (timeMatch) {
                    sectionStart = parseInt(timeMatch[1]);
                    sectionEnd = parseInt(timeMatch[2]);
                } else {
                    var singleTimeMatch = cleanText.match(/(\\d+)节/);
                    if (singleTimeMatch) {
                        sectionStart = sectionEnd = parseInt(singleTimeMatch[1]);
                    }
                }
                
                var weekMatch = cleanText.match(/(\\d+)[-~](\\d+)周/);
                if (weekMatch) {
                    weekRangeStart = parseInt(weekMatch[1]);
                    weekRangeEnd = parseInt(weekMatch[2]);
                } else {
                    var singleWeekMatch = cleanText.match(/(\\d+)周/);
                    if (singleWeekMatch) {
                        weekRangeStart = weekRangeEnd = parseInt(singleWeekMatch[1]);
                    }
                }
                
                isOddWeek = cleanText.indexOf('(单)') !== -1 || cleanText.indexOf('单周') !== -1;
                isEvenWeek = cleanText.indexOf('(双)') !== -1 || cleanText.indexOf('双周') !== -1;
                
                if (cleanText.indexOf('单双周') !== -1 || cleanText.indexOf('(单双)') !== -1) {
                    isOddWeek = false;
                    isEvenWeek = false;
                }
                
                if (!courseName) {
                    var words = cleanText.split(/[\\s,，;；]/).filter(function(w) { return w.length > 0; });
                    for (var wi = 0; wi < words.length; wi++) {
                        var word = words[wi];
                        if (word.length >= 3 && /[\\u4e00-\\u9fa5]/.test(word) && !/\\d/.test(word)) {
                            courseName = word;
                            break;
                        }
                    }
                }
                
                return {
                    courseName: courseName || '未知课程',
                    location: location,
                    teacher: teacher,
                    sectionStart: sectionStart,
                    sectionEnd: sectionEnd,
                    day: day,
                    weekRangeStart: weekRangeStart,
                    weekRangeEnd: weekRangeEnd,
                    isOddWeek: isOddWeek,
                    isEvenWeek: isEvenWeek
                };
            }
            
            function isValidTeacherName(name) {
                if (!name || name.length < 2 || name.length > 20) return false;
                return /[\\u4e00-\\u9fa5]/.test(name) && /^[A-Z\\u4e00-\\u9fa5]+$/.test(name);
            }
            
            function hasCourseInfo(element) {
                var text = element.textContent || element.innerText;
                var keywords = ['课程', '星期', '节', '周', '老师', '教师', '教室', '校区', '楼', '教学'];
                for (var i = 0; i < keywords.length; i++) {
                    if (text.indexOf(keywords[i]) !== -1) return true;
                }
                return false;
            }
            
            function isLikelyScheduleTable(table) {
                var headers = table.querySelectorAll('th');
                var headerTexts = [];
                for (var i = 0; i < headers.length; i++) {
                    headerTexts.push(headers[i].textContent || headers[i].innerText);
                }
                
                var weekdayKeywords = ['星期', '周一', '周二', '周三', '周四', '周五', '周六', '周日', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                for (var i = 0; i < headerTexts.length; i++) {
                    var header = headerTexts[i];
                    for (var j = 0; j < weekdayKeywords.length; j++) {
                        if (header.indexOf(weekdayKeywords[j]) !== -1) return true;
                    }
                }
                
                var rows = table.querySelectorAll('tr');
                if (rows.length < 3) return false;
                
                var cells = table.querySelectorAll('td');
                var courseLikeCells = 0;
                for (var i = 0; i < cells.length; i++) {
                    var cellText = cells[i].textContent || cells[i].innerText;
                    if (cellText.length > 0 && (/[\\u4e00-\\u9fa5]/.test(cellText) || /\\d+[-~]\\d+节/.test(cellText) || /\\d+[-~]\\d+周/.test(cellText))) {
                        courseLikeCells++;
                    }
                }
                
                return courseLikeCells / cells.length > 0.1;
            }
            
            function attemptParseTable(table, dayNames) {
                var results = [];
                var rows = table.querySelectorAll('tr');
                
                var headerRowIndex = -1;
                for (var i = 0; i < Math.min(rows.length, 3); i++) {
                    var cells = rows[i].querySelectorAll('th, td');
                    var found = false;
                    for (var j = 0; j < cells.length; j++) {
                        var cellText = cells[j].textContent || cells[j].innerText;
                        var weekdays = ['星期', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                        for (var k = 0; k < weekdays.length; k++) {
                            if (cellText.indexOf(weekdays[k]) !== -1) {
                                headerRowIndex = i;
                                found = true;
                                break;
                            }
                        }
                        if (found) break;
                    }
                    if (found) break;
                }
                
                if (headerRowIndex !== -1) {
                    var headerRow = rows[headerRowIndex];
                    var headerCells = headerRow.querySelectorAll('th, td');
                    var dayColumns = {};
                    
                    for (var i = 0; i < headerCells.length; i++) {
                        var text = headerCells[i].textContent || headerCells[i].innerText;
                        for (var j = 0; j < dayNames.length; j++) {
                            var day = dayNames[j];
                            if (text.indexOf(day) !== -1 || text.indexOf(day.substring(0, 2)) !== -1) {
                                dayColumns[i] = dayNames[j];
                            }
                        }
                    }
                    
                    for (var i = headerRowIndex + 1; i < rows.length; i++) {
                        var row = rows[i];
                        var cells = row.querySelectorAll('td');
                        
                        for (var colIndex = 0; colIndex < cells.length; colIndex++) {
                            if (dayColumns[colIndex] && cells[colIndex].textContent.trim()) {
                                var coursesInCell = extractCoursesFromCell(cells[colIndex], dayColumns[colIndex]);
                                results = results.concat(coursesInCell);
                            }
                        }
                    }
                }
                
                return results;
            }
            
            try {
                console.log("开始解析课表信息...");
                var allCourses = parseCourseTableUniversal();
                
                console.log("=== 解析完成，课程信息如下 ===");
                console.log(JSON.stringify(allCourses).substring(0, 500));
                console.log("共解析出 " + allCourses.length + " 个课程安排");
                
                var result = { data: allCourses, error: null };
                
                window._scheduleResult = JSON.stringify(result);
                
                if (typeof plus !== 'undefined') {
                    try {
                        var mainWebView = plus.webview.getWebviewById(plus.runtime.appid);
                        if (mainWebView) {
                            mainWebView.evalJS('window._receiveScheduleData(' + JSON.stringify(result) + ')');
                        }
                    } catch(e) {
                        console.log('=== 调用主页面失败: ' + e.message);
                    }
                }
            } catch(e) {
                var errorResult = { data: [], error: '解析错误: ' + e.message };
                window._scheduleResult = JSON.stringify(errorResult);
                
                if (typeof plus !== 'undefined') {
                    try {
                        var mainWebView = plus.webview.getWebviewById(plus.runtime.appid);
                        if (mainWebView) {
                            mainWebView.evalJS('window._receiveScheduleData(' + JSON.stringify(errorResult) + ')');
                        }
                    } catch(e2) {}
                }
            }
        })();
    `;
    
    console.log('=== jsCode 长度: ' + jsCode.length);
    
    jwxtWebView.evalJS(jsCode);
    
    console.log('=== evalJS 已执行，等待数据 ===');
    
    setTimeout(function() {
        console.log('=== 500ms 后尝试读取结果 ===');
        
        var getResultCode = 'window._scheduleResult';
        jwxtWebView.evalJS(getResultCode, function(resultStr) {
            console.log('=== evalJS 回调触发 ===');
            console.log('=== resultStr 类型: ' + typeof resultStr);
            
            if (resultStr && resultStr !== 'null' && resultStr !== 'undefined') {
                try {
                    var result = JSON.parse(resultStr);
                    console.log('=== 解析成功 ===');
                    console.log('error: ' + result.error);
                    console.log('data length: ' + (result.data ? result.data.length : 0));
                    
                    if (result.error) {
                        showToast(result.error);
                        return;
                    }
                    
                    if (!result.data || result.data.length === 0) {
                        showToast('未获取到课程数据');
                        return;
                    }
                    
                    processImportedSchedule(result.data);
                } catch(err) {
                    console.log('=== 解析错误: ' + err.message);
                    showToast('数据解析失败');
                }
            } else {
                showToast('未获取到数据，请重试');
            }
        });
    }, 500);
}

window._scheduleReceived = false;

window._receiveScheduleData = function(result) {
    console.log('=== _receiveScheduleData 被调用 ===');
    console.log('=== result: ' + JSON.stringify(result).substring(0, 300));
    
    window._scheduleReceived = true;
    
    if (result.error) {
        showToast(result.error);
        return;
    }
    
    console.log('=== data length: ' + (result.data ? result.data.length : 0));
    
    if (result.debug) {
        console.log('=== debug.info ===');
        console.log('headerRowIndex: ' + result.debug.headerRowIndex);
        console.log('weekdayMapKeys: ' + JSON.stringify(result.debug.weekdayMapKeys));
        console.log('matchedCourses: ' + JSON.stringify(result.debug.matchedCourses));
    }
    
    if (!result.data || result.data.length === 0) {
        showToast('未获取到课程，请确保已进入课表页面');
        console.log('=== debug.cellTexts: ' + JSON.stringify(result.debug ? result.debug.cellTexts : []));
        return;
    }
    
    console.log('=== 成功获取 ' + result.data.length + ' 门课程 ===');
    processImportedSchedule(result.data);
};

window.addEventListener('plusMessage', function(e) {
    console.log('=== plusMessage 事件触发 ===');
    console.log('=== e.data: ' + JSON.stringify(e.data));
    
    if (e.data && e.data.type === 'scheduleData') {
        window._scheduleReceived = true;
        var result = e.data.data;
        
        console.log('=== 收到课表数据 ===');
        console.log('error: ' + result.error);
        console.log('data length: ' + (result.data ? result.data.length : 0));
        console.log('debug: ' + JSON.stringify(result.debug));
        
        if (result.error) {
            showToast(result.error);
            return;
        }
        
        if (!result.data || result.data.length === 0) {
            showToast('未获取到课程，请确保已进入课表页面');
            return;
        }
        
        console.log('=== 准备处理课程数据，共 ' + result.data.length + ' 门课程 ===');
        processImportedSchedule(result.data);
    }
});

window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'scheduleData') {
        processImportedSchedule(e.data.schedule);
    }
});

function processImportedSchedule(scheduleData) {
    console.log('=== processImportedSchedule 开始 ===');
    console.log('=== 课程数量: ' + scheduleData.length);
    
    if (!scheduleData || scheduleData.length === 0) {
        showToast('未获取到课表数据');
        return;
    }
    
    closeJwxtWebView();
    
    var colors = [
        '#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0',
        '#fce4ec', '#e0f7fa', '#fff8e1', '#ede7f6',
        '#efebe9', '#e8eaf6', '#e1f5fe', '#f1f8e9'
    ];
    
    var courseColorMap = {};
    var usedColorIndex = 0;
    
    for (var i = 0; i < scheduleData.length; i++) {
        var courseName = scheduleData[i].courseName;
        if (!courseColorMap[courseName]) {
            courseColorMap[courseName] = colors[usedColorIndex % colors.length];
            usedColorIndex++;
        }
    }
    
    var courseIndex = 0;
    var totalCourses = scheduleData.length;
    
    function addNextCourse() {
        if (courseIndex >= totalCourses) {
            showToast('成功导入 ' + totalCourses + ' 门课程');
            loadCourses();
            showMainPage();
            return;
        }
        
        var item = scheduleData[courseIndex];
        console.log('=== 正在添加第 ' + (courseIndex + 1) + ' 门课程: ' + JSON.stringify(item));
        
        showAddClassPage();
        
        setTimeout(function() {
            var courseNameInput = document.getElementById('courseName');
            var locationInput = document.getElementById('location');
            var teacherInput = document.getElementById('teacher');
            var startWeekInput = document.getElementById('startWeek');
            var endWeekInput = document.getElementById('endWeek');
            var oddWeekCheckbox = document.getElementById('oddWeek');
            var evenWeekCheckbox = document.getElementById('evenWeek');
            
            if (courseNameInput) courseNameInput.value = item.courseName || '';
            if (locationInput) locationInput.value = item.location || '';
            if (teacherInput) teacherInput.value = item.teacher || '';
            if (startWeekInput) startWeekInput.value = item.weekRangeStart || 1;
            if (endWeekInput) endWeekInput.value = item.weekRangeEnd || 20;
            if (oddWeekCheckbox) oddWeekCheckbox.checked = item.isOddWeek || false;
            if (evenWeekCheckbox) evenWeekCheckbox.checked = item.isEvenWeek || false;
            
            var classTimeCheckboxes = document.querySelectorAll('#classTimeCheckboxes input[type="checkbox"]');
            classTimeCheckboxes.forEach(function(cb) {
                var cbValue = parseInt(cb.value);
                cb.checked = (cbValue >= item.sectionStart && cbValue <= item.sectionEnd);
            });
            
            var weekdayCheckboxes = document.querySelectorAll('input[name="weekday"]');
            weekdayCheckboxes.forEach(function(cb) {
                var cbValue = parseInt(cb.value);
                var dayMap = {
                    '周一': 1, '周二': 2, '周三': 3, '周四': 4,
                    '周五': 5, '周六': 6, '周日': 0
                };
                var targetWeekday = dayMap[item.day];
                if (targetWeekday === undefined) targetWeekday = 1;
                cb.checked = (cbValue === targetWeekday);
            });
            
            selectedColor = courseColorMap[item.courseName] || '#e3f2fd';
            
            console.log('=== 已填写课程信息，准备保存 ===');
            
            setTimeout(function() {
                saveCourse();
                console.log('=== 已保存: ' + item.courseName);
                courseIndex++;
                setTimeout(addNextCourse, 200);
            }, 300);
        }, 500);
    }
    
    setTimeout(addNextCourse, 500);
}

function getRandomColor() {
    var colors = [
        '#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0',
        '#fce4ec', '#e0f7fa', '#fff8e1', '#ede7f6',
        '#efebe9', '#e8eaf6', '#e1f5fe', '#f1f8e9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

document.addEventListener('DOMContentLoaded', () => {
    initFirstWeekDate();
    initTable();
    loadClassCount();
    loadHideWeekend();
    loadFontSize();
    updateWeekNavVisibility();
});
