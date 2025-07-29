/* Advanced Study Planner - Front-end only */
const form = document.getElementById('planForm');
const output = document.getElementById('output');
const subjectContainer = document.getElementById('subjectContainer');
const addSubjectBtn = document.getElementById('addSubject');

// Add new subject input row
addSubjectBtn.addEventListener('click', () => {
    const subjectInput = document.createElement('div');
    subjectInput.className = 'subject-input';
    subjectInput.innerHTML = `
    <input type="text" name="subjectName[]" placeholder="Subject name" required/>
    <input type="number" name="subjectHours[]" placeholder="Hours" min="0.5" step="0.5" required/>
    <button type="button" class="remove-subject" onclick="removeSubject(this)">×</button>
  `;
    subjectContainer.appendChild(subjectInput);
});

// Remove subject input row
function removeSubject(button) {
    if (subjectContainer.children.length > 1) {
        button.parentElement.remove();
    }
}

form.addEventListener('submit', e => {
    e.preventDefault();
    output.innerHTML = '<div class="loading">Generating study plan... ⏳</div>';

    // 1. Collect and validate input
    const subjectNames = Array.from(form.querySelectorAll('input[name="subjectName[]"]'))
        .map(input => input.value.trim())
        .filter(Boolean);

    const subjectHours = Array.from(form.querySelectorAll('input[name="subjectHours[]"]'))
        .map(input => parseFloat(input.value))
        .filter(hours => hours > 0);

    const days = parseInt(form.days.value);
    const maxHoursPerDay = parseFloat(form.maxHoursPerDay.value);

    // Validation
    if (subjectNames.length !== subjectHours.length || subjectNames.length === 0) {
        output.innerHTML = '<div class="error">❌ Please fill in all subject fields</div>';
        return;
    }

    if (days <= 0 || maxHoursPerDay <= 0) {
        output.innerHTML = '<div class="error">❌ Please enter valid numbers for days and hours</div>';
        return;
    }

    // Check if total hours can fit
    const totalHours = subjectHours.reduce((sum, hours) => sum + hours, 0);
    const totalAvailableHours = days * maxHoursPerDay;

    if (totalHours > totalAvailableHours) {
        output.innerHTML = `<div class="error">❌ Not enough time! You need ${totalHours} hours but only have ${totalAvailableHours} hours available.</div>`;
        return;
    }

    // 2. Create subjects array with remaining hours
    const subjects = subjectNames.map((name, index) => ({
        name: name,
        totalHours: subjectHours[index],
        remainingHours: subjectHours[index],
        sessionsCompleted: 0
    }));

    // 3. Generate schedule using intelligent distribution
    const schedule = generateSchedule(subjects, days, maxHoursPerDay);

    // 4. Render the schedule
    renderSchedule(schedule, days);
});

function generateSchedule(subjects, days, maxHoursPerDay) {
    const schedule = {};

    // Initialize schedule for each day
    for (let day = 1; day <= days; day++) {
        schedule[day] = [];
    }

    // Calculate total study hours needed
    const totalHours = subjects.reduce((sum, subject) => sum + subject.totalHours, 0);

    // Distribute subjects across days
    for (let day = 1; day <= days; day++) {
        let remainingHoursForDay = maxHoursPerDay;

        // Sort subjects by remaining hours (descending) and sessions completed (ascending)
        const availableSubjects = subjects
            .filter(s => s.remainingHours > 0)
            .sort((a, b) => {
                // Prioritize subjects with more remaining hours and fewer completed sessions
                const remainingDiff = b.remainingHours - a.remainingHours;
                if (Math.abs(remainingDiff) < 0.1) {
                    return a.sessionsCompleted - b.sessionsCompleted;
                }
                return remainingDiff;
            });

        // Assign subjects to this day
        for (const subject of availableSubjects) {
            if (remainingHoursForDay <= 0 || subject.remainingHours <= 0) continue;

            // Calculate optimal session length
            const optimalSessionLength = Math.min(
                subject.remainingHours,
                remainingHoursForDay,
                Math.max(0.5, subject.totalHours / days) // Spread sessions across days
            );

            if (optimalSessionLength >= 0.5) {
                schedule[day].push({
                    subject: subject.name,
                    hours: Math.round(optimalSessionLength * 2) / 2 // Round to nearest 0.5
                });

                subject.remainingHours -= optimalSessionLength;
                subject.sessionsCompleted++;
                remainingHoursForDay -= optimalSessionLength;
            }
        }
    }

    return schedule;
}

function renderSchedule(schedule, days) {
    output.innerHTML = '';

    // Create summary section
    const summary = document.createElement('div');
    summary.className = 'schedule-summary';

    let totalScheduledHours = 0;
    Object.values(schedule).forEach(daySchedule => {
        daySchedule.forEach(session => {
            totalScheduledHours += session.hours;
        });
    });

    summary.innerHTML = `
    <h3>📚 Study Plan Summary</h3>
    <p><strong>Total Study Hours:</strong> ${totalScheduledHours} hours</p>
    <p><strong>Study Period:</strong> ${days} days</p>
  `;
    output.appendChild(summary);

    // Create the main schedule table
    const table = document.createElement('table');
    table.className = 'schedule-table';

    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
    <tr>
      <th class="day-header">Day</th>
      <th class="subjects-header">Subjects & Hours</th>
      <th class="total-header">Daily Total</th>
    </tr>
  `;
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    for (let day = 1; day <= days; day++) {
        const daySchedule = schedule[day];
        const row = document.createElement('tr');

        // Calculate daily total
        const dailyTotal = daySchedule.reduce((sum, session) => sum + session.hours, 0);

        // Create subjects cell content
        let subjectsContent = '';
        if (daySchedule.length === 0) {
            subjectsContent = '<span class="no-study">Rest Day</span>';
        } else {
            subjectsContent = daySchedule.map(session =>
                `<div class="subject-session">
          <span class="subject-name">${session.subject}</span>
          <span class="session-hours">${session.hours}h</span>
        </div>`
            ).join('');
        }

        row.innerHTML = `
      <td class="day-cell">
        <div class="day-number">${day}</div>
        <div class="day-label">Day ${day}</div>
      </td>
      <td class="subjects-cell">${subjectsContent}</td>
      <td class="total-cell">
        <span class="daily-total">${dailyTotal > 0 ? dailyTotal + 'h' : '-'}</span>
      </td>
    `;

        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    output.appendChild(table);

    // Add subject-wise breakdown
    const breakdown = document.createElement('div');
    breakdown.className = 'subject-breakdown';
    breakdown.innerHTML = '<h3>📊 Subject-wise Progress</h3>';

    const breakdownTable = document.createElement('table');
    breakdownTable.className = 'breakdown-table';

    // Calculate subject totals from schedule
    const subjectTotals = {};
    Object.values(schedule).forEach(daySchedule => {
        daySchedule.forEach(session => {
            subjectTotals[session.subject] = (subjectTotals[session.subject] || 0) + session.hours;
        });
    });

    let breakdownContent = '<thead><tr><th>Subject</th><th>Total Hours</th><th>Sessions</th></tr></thead><tbody>';
    Object.entries(subjectTotals).forEach(([subject, hours]) => {
        const sessions = Object.values(schedule).reduce((count, daySchedule) => {
            return count + daySchedule.filter(session => session.subject === subject).length;
        }, 0);

        breakdownContent += `
      <tr>
        <td>${subject}</td>
        <td>${hours}h</td>
        <td>${sessions}</td>
      </tr>
    `;
    });
    breakdownContent += '</tbody>';

    breakdownTable.innerHTML = breakdownContent;
    breakdown.appendChild(breakdownTable);
    output.appendChild(breakdown);
}