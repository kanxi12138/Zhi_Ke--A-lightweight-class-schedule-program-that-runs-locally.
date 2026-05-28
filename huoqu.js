/**
 * 通用教务系统课表信息爬取脚本
 * 使用方法：打开课表页面 -> F12 -> Console -> 粦贴并执行
 * 特点：使用多种策略适配不同教务系统，具有更强的容错能力
 */

function parseCourseTableUniversal() {
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const results = [];
    
    // 策略1: 尝试标准正方教务系统
    const standardResult = parseStandardSystem();
    if (standardResult.length > 0) {
        console.log("检测到标准教务系统，使用策略1解析");
        return standardResult;
    }
    
    // 策略2: 尝试查找常见的课表表格
    const commonResult = parseCommonPattern();
    if (commonResult.length > 0) {
        console.log("检测到常见课表模式，使用策略2解析");
        return commonResult;
    }
    
    // 策略3: 尝试查找所有可能的表格
    const allTablesResult = parseAllTables();
    if (allTablesResult.length > 0) {
        console.log("在页面中找到课表数据，使用策略3解析");
        return allTablesResult;
    }
    
    console.warn("未能检测到标准课表格式，返回空数组");
    return [];
}

// 策略1: 标准正方教务系统解析
function parseStandardSystem() {
    const results = [];
    const mainTable = document.querySelector('table[id^="kbgrid_table_"]');
    if (!mainTable) return results;
    
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    // 遍历每一天
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const day = dayNames[dayIndex];
        
        // 遍历可能的时间段
        for (let period = 1; period <= 11; period++) {
            const cellId = `${dayIndex + 1}-${period}`;
            const cell = mainTable.querySelector(`td[id="${cellId}"]`);
            
            if (cell && cell.innerHTML.trim()) {
                const coursesInCell = extractCoursesFromCell(cell, day);
                results.push(...coursesInCell);
            }
        }
    }
    
    return results;
}

// 策略2: 常见课表模式解析
function parseCommonPattern() {
    const results = [];
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    // 查找可能的课表容器
    const possibleTables = [
        ...document.querySelectorAll('table'),
        ...document.querySelectorAll('div.table, div[kb], div.timetable]')
    ];
    
    for (const table of possibleTables) {
        // 检查是否包含课程信息
        if (hasCourseInfo(table)) {
            // 尝试解析这个表格
            const parsedData = attemptParseTable(table, dayNames);
            if (parsedData.length > 0) {
                results.push(...parsedData);
            }
        }
    }
    
    return results;
}

// 策略3: 扫描所有表格
function parseAllTables() {
    const results = [];
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    const allTables = document.querySelectorAll('table');
    
    for (const table of allTables) {
        // 检查表格是否可能是课表
        if (isLikelyScheduleTable(table)) {
            const parsedData = attemptParseTable(table, dayNames);
            if (parsedData.length > 0) {
                results.push(...parsedData);
            }
        }
    }
    
    return results;
}

// 从单元格中提取课程信息
function extractCoursesFromCell(cell, day) {
    const results = [];
    
    // 方法1: 查找特定类名的课程容器
    const courseContainers = cell.querySelectorAll('.timetable_con, .course_info, .class_item, .kebiao_content, .kbcontent');
    if (courseContainers.length > 0) {
        for (const container of courseContainers) {
            const course = parseCourseContainer(container, day);
            if (course) results.push(course);
        }
    }
    
    // 方法2: 如果没有找到特定容器，则直接分析单元格内容
    if (results.length === 0) {
        const course = parseTableCellContent(cell, day);
        if (course) results.push(course);
    }
    
    return results;
}

// 解析课程容器
function parseCourseContainer(container, day) {
    try {
        const content = container.textContent || container.innerText;
        const courseInfo = analyzeCourseText(content, day);
        return courseInfo;
    } catch (e) {
        console.warn("解析课程容器失败:", e.message);
        return null;
    }
}

// 直接解析单元格内容
function parseTableCellContent(cell, day) {
    try {
        const content = cell.textContent || cell.innerText;
        const courseInfo = analyzeCourseText(content, day);
        return courseInfo;
    } catch (e) {
        console.warn("解析单元格内容失败:", e.message);
        return null;
    }
}

// 分析课程文本内容
function analyzeCourseText(text, day) {
    if (!text || text.trim().length === 0) return null;
    
    // 清理文本
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // 提取基本信息
    let courseName = '';
    let location = '';
    let teacher = '';
    let sectionStart = 0;
    let sectionEnd = 0;
    let weekRangeStart = 0;
    let weekRangeEnd = 0;
    let isOddWeek = false;
    let isEvenWeek = false;
    
    // 尝试匹配课程名称
    const nameMatch = cleanText.match(/([\u4e00-\u9fa5a-zA-Z0-9\s\-\_]+?)(?:\(|\s|$|老师|教师|周|节|校区|楼|教室)/);
    if (nameMatch) {
        courseName = nameMatch[1].trim();
    }
    
    // 查找位置信息 - 只提取校区+楼+房间号，排除前面的周次信息
    const locationRegex = /(?:\d+周)?([A-Z\d\u4e00-\u9fa5]*校区[A-Z\d\u4e00-\u9fa5]*[楼栋][A-Z\d]+)/;
    const locationMatch = cleanText.match(locationRegex);
    if (locationMatch) {
        location = locationMatch[1].replace(/\s+/g, '').trim(); // 移除空格
    }
    
    // 查找教师信息 - 寻找以"老师"或"教师"结尾的姓名，或在位置信息之后的中文姓名
    const teacherRegex = /([A-Z\u4e00-\u9fa5]{2,4})(?:老师|教师|讲授|主讲)/;
    const teacherMatch = cleanText.match(teacherRegex);
    if (teacherMatch) {
        teacher = teacherMatch[1].trim();
    } else {
        // 在位置信息之后寻找教师名字
        if (location) {
            // 截取位置信息之后的部分
            const afterLocationIndex = cleanText.indexOf(location) + location.length;
            const afterLocationText = cleanText.substring(afterLocationIndex);
            
            // 查找中文姓名（2-4个汉字）
            const nameAfterLocation = afterLocationText.match(/([A-Z\u4e00-\u9fa5]{2,4})/);
            if (nameAfterLocation) {
                const potentialTeacher = nameAfterLocation[1];
                if (isValidTeacherName(potentialTeacher)) {
                    teacher = potentialTeacher;
                }
            }
        }
        
        // 如果仍没找到，尝试在整个文本中查找最像教师的名称
        if (!teacher) {
            const potentialTeachers = cleanText.match(/[A-Z\u4e00-\u9fa5]{2,4}/g);
            if (potentialTeachers) {
                for (const potentialTeacher of potentialTeachers) {
                    if (isValidTeacherName(potentialTeacher) && 
                        !potentialTeacher.includes('校区') && 
                        !potentialTeacher.includes('楼') &&
                        !potentialTeacher.includes('周') &&
                        !potentialTeacher.includes('节') &&
                        !potentialTeacher.includes('A') && // 排除课程名的一部分
                        !potentialTeacher.includes('程') && // 排除"程序设计"
                        !potentialTeacher.includes('息') && // 排除"信息"
                        !potentialTeacher.includes('网') && // 排除"网络"
                        !potentialTeacher.includes('大') && // 排除"大数据"
                        !potentialTeacher.includes('项') && // 排除"项目"
                        !potentialTeacher.includes('管')) { // 排除"管理"
                        teacher = potentialTeacher;
                        break;
                    }
                }
            }
        }
    }
    
    // 查找时间信息
    const timeMatch = cleanText.match(/(\d+)[-~](\d+)节/);
    if (timeMatch) {
        sectionStart = parseInt(timeMatch[1]);
        sectionEnd = parseInt(timeMatch[2]);
    } else {
        const singleTimeMatch = cleanText.match(/(\d+)节/);
        if (singleTimeMatch) {
            sectionStart = sectionEnd = parseInt(singleTimeMatch[1]);
        }
    }
    
    // 查找周次信息
    const weekMatch = cleanText.match(/(\d+)[-~](\d+)周/);
    if (weekMatch) {
        weekRangeStart = parseInt(weekMatch[1]);
        weekRangeEnd = parseInt(weekMatch[2]);
    } else {
        const singleWeekMatch = cleanText.match(/(\d+)周/);
        if (singleWeekMatch) {
            weekRangeStart = weekRangeEnd = parseInt(singleWeekMatch[1]);
        }
    }
    
    // 检查单双周
    isOddWeek = cleanText.includes('(单)') || cleanText.includes('单周');
    isEvenWeek = cleanText.includes('(双)') || cleanText.includes('双周');
    
    // 如果没有成功提取课程名称，使用更宽松的规则
    if (!courseName) {
        const words = cleanText.split(/[\s,，;\；]/).filter(w => w.length > 0);
        for (const word of words) {
            if (word.length >= 3 && containsChinese(word) && !containsNumbers(word)) {
                courseName = word;
                break;
            }
        }
    }
    
    return {
        courseName: courseName || '未知课程',
        location,
        teacher,
        sectionStart,
        sectionEnd,
        day,
        weekRangeStart,
        weekRangeEnd,
        isOddWeek,
        isEvenWeek
    };
}

// 检查是否为有效的教师姓名
function isValidTeacherName(name) {
    if (!name || name.length < 2 || name.length > 20) return false;
    // 检查是否包含中文字符，且长度适中
    return /[\u4e00-\u9fa5]/.test(name) && /^[A-Z\u4e00-\u9fa5]+$/.test(name);
}

// 检查字符串是否包含中文
function containsChinese(str) {
    return /[\u4e00-\u9fa5]/.test(str);
}

// 检查字符串是否包含数字
function containsNumbers(str) {
    return /\d/.test(str);
}

// 检查元素是否包含课程信息
function hasCourseInfo(element) {
    const text = element.textContent || element.innerText;
    const keywords = ['课程', '星期', '节', '周', '老师', '教师', '教室', '校区', '楼', '教学'];
    return keywords.some(keyword => text.includes(keyword));
}

// 检查表格是否可能是课表
function isLikelyScheduleTable(table) {
    const headers = table.querySelectorAll('th');
    const headerTexts = Array.from(headers).map(th => th.textContent || th.innerText);
    
    // 检查是否包含星期相关的表头
    const weekdayKeywords = ['星期', '周一', '周二', '周三', '周四', '周五', '周六', '周日', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hasWeekdayHeaders = headerTexts.some(header => 
        weekdayKeywords.some(keyword => header.includes(keyword))
    );
    
    if (hasWeekdayHeaders) return true;
    
    // 检查表格是否有合理的行列结构
    const rows = table.querySelectorAll('tr');
    if (rows.length < 3) return false; // 至少需要表头和两行数据
    
    // 检查单元格内容是否包含课程特征
    const cells = table.querySelectorAll('td');
    const courseLikeCells = Array.from(cells).filter(cell => {
        const text = cell.textContent || cell.innerText;
        return text.length > 0 && (
            containsChinese(text) || 
            /\d+[-~]\d+节/.test(text) || 
            /\d+[-~]\d+周/.test(text) ||
            /.*校区.*|.*楼.*|.*教室.*/.test(text)
        );
    });
    
    // 如果超过一定比例的单元格包含课程特征，则认为是课表
    return courseLikeCells.length / cells.length > 0.1;
}

// 尝试解析表格
function attemptParseTable(table, dayNames) {
    const results = [];
    
    // 尝试按行解析
    const rows = table.querySelectorAll('tr');
    
    // 寻找表头行
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 3); i++) {
        const cells = rows[i].querySelectorAll('th, td');
        const cellTexts = Array.from(cells).map(cell => cell.textContent || cell.innerText);
        
        if (cellTexts.some(text => 
            ['星期', '周一', '周二', '周三', '周四', '周五', '周六', '周日'].some(weekday => text.includes(weekday))
        )) {
            headerRowIndex = i;
            break;
        }
    }
    
    if (headerRowIndex !== -1) {
        // 解析表头
        const headerRow = rows[headerRowIndex];
        const headerCells = headerRow.querySelectorAll('th, td');
        const dayColumns = {};
        
        headerCells.forEach((cell, index) => {
            const text = cell.textContent || cell.innerText;
            dayNames.forEach((day, dayIndex) => {
                if (text.includes(day) || text.includes(day.substring(0, 2))) {
                    dayColumns[index] = dayNames[dayIndex];
                }
            });
        });
        
        // 解析数据行
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            
            cells.forEach((cell, colIndex) => {
                if (dayColumns[colIndex] && cell.textContent.trim()) {
                    const coursesInCell = extractCoursesFromCell(cell, dayColumns[colIndex]);
                    results.push(...coursesInCell);
                }
            });
        }
    } else {
        // 如果没有找到明确的表头，尝试按列索引解析
        // 假设前几列是时间，后面的列是星期几
        for (let dayIndex = 0; dayIndex < Math.min(dayNames.length, 10); dayIndex++) {
            // 查找可能对应这个星期的列
            const possibleCells = Array.from(document.querySelectorAll('td')).filter(cell => {
                const siblings = Array.from(cell.parentNode.children);
                const cellIndex = siblings.indexOf(cell);
                return cellIndex === dayIndex + 1; // 假设第一列是时间
            });
            
            possibleCells.forEach(cell => {
                if (cell.textContent.trim()) {
                    const coursesInCell = extractCoursesFromCell(cell, dayNames[dayIndex]);
                    results.push(...coursesInCell);
                }
            });
        }
    }
    
    return results;
}

// --- 执行 ---
console.log("开始解析课表信息...");
const allCourses = parseCourseTableUniversal();

console.log("=== 解析完成，课程信息如下 ===");
console.log(allCourses);

// 输出详细统计信息
console.log(`\n=== 详细统计信息 ===`);
console.log(`共解析出 ${allCourses.length} 个课程安排`);
if (allCourses.length > 0) {
    const uniqueCourses = [...new Set(allCourses.map(course => course.courseName))];
    console.log(`唯一课程数: ${uniqueCourses.length}`);
    console.log(`课程列表:`, uniqueCourses);
    
    // 按天分组显示
    console.log('\n按天分组的课程:');
    const coursesByDay = {};
    allCourses.forEach(course => {
        if (!coursesByDay[course.day]) {
            coursesByDay[course.day] = [];
        }
        coursesByDay[course.day].push(`${course.courseName} (${course.sectionStart}-${course.sectionEnd}节)`);
    });
    
    Object.keys(coursesByDay).forEach(day => {
        console.log(`${day}: ${coursesByDay[day].length} 门课程`);
        coursesByDay[day].forEach(course => console.log(`  - ${course}`));
    });
}

// 如需格式化的 JSON 字符串，请执行：
// console.log(JSON.stringify(allCourses, null, 2));
