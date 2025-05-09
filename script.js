document.addEventListener('DOMContentLoaded', () => {
  const gradeForm = document.getElementById('gradeForm');
  const gradesList = document.getElementById('gradesList');
  const classesTable = document.getElementById('classesTable').getElementsByTagName('tbody')[0];
  const classList = document.getElementById('classList');

  let grades = JSON.parse(localStorage.getItem('grades')) || [];

  const classes = [
    'Islamska',
    'Bosanski',
    'Tjelesni',
    'Informatika',
    'Matematika',
    'Biologija',
    'Geografija',
    'Historija',
    'Fizika',
    'Muzicko',
    'Njemacki',
    'Engleski',
    'Tehnicko'
  ];

  function populateClassesTable() {
    classesTable.innerHTML = classes.map(className => 
      `<tr><td>${className}</td></tr>`
    ).join('');

    classList.innerHTML = classes.map(className =>
      `<option value="${className}">`
    ).join('');
  }

  function calculateAverage(grades) {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, grade) => acc + Number(grade), 0);
    return (sum / grades.length).toFixed(2);
  }

  function calculateFinalGrade(average) {
    if (average >= 4.5) return 5;
    if (average >= 3.5) return 4;
    if (average >= 2.5) return 3;
    if (average >= 1.5) return 2;
    return 1;
  }

  function getGradeDescription(grade) {
    const descriptions = {
      5: 'Odličan',
      4: 'Vrlo dobar',
      3: 'Dobar',
      2: 'Dovoljan',
      1: 'Nedovoljan'
    };
    return descriptions[grade] || '';
  }

  function saveGrades() {
    localStorage.setItem('grades', JSON.stringify(grades));
  }

  function displayGrades() {
    gradesList.innerHTML = '';
    
    const studentGrades = {};
    grades.forEach((grade, index) => {
      if (!studentGrades[grade.studentName]) {
        studentGrades[grade.studentName] = {};
      }
      if (!studentGrades[grade.studentName][grade.className]) {
        studentGrades[grade.studentName][grade.className] = [];
      }
      studentGrades[grade.studentName][grade.className].push({...grade, index});
    });

    Object.entries(studentGrades).forEach(([studentName, classGrades]) => {
      const studentSection = document.createElement('div');
      studentSection.className = 'student-section';
      
      const nameHeader = document.createElement('div');
      nameHeader.className = 'student-name-header';
      
      // Calculate overall average
      let totalSum = 0;
      let totalCount = 0;
      Object.values(classGrades).forEach(grades => {
        grades.forEach(grade => {
          totalSum += Number(grade.grade);
          totalCount++;
        });
      });
      const overallAverage = (totalSum / totalCount).toFixed(2);
      const finalGrade = calculateFinalGrade(overallAverage);
      
      nameHeader.innerHTML = `
        <div>
          <h3>${studentName}</h3>
          <p class="average-info">Ukupan prosjek: ${overallAverage} (${getGradeDescription(finalGrade)})</p>
        </div>
        <button onclick="removeStudent('${studentName}')">Izbriši učenika</button>
      `;
      
      const table = document.createElement('table');
      table.className = 'student-table';
      
      let tableContent = `
        <thead>
          <tr>
            <th>Predmet</th>
            <th>Ocjene</th>
            <th>Prosjek</th>
            <th>Zaključna</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
      `;
      
      Object.entries(classGrades).forEach(([className, classGradesList]) => {
        const grades = classGradesList.map(g => g.grade);
        const average = calculateAverage(grades);
        const finalGrade = calculateFinalGrade(average);
        
        tableContent += `
          <tr>
            <td>${className}</td>
            <td>${grades.join(', ')}</td>
            <td>${average}</td>
            <td>${finalGrade} (${getGradeDescription(finalGrade)})</td>
            <td>
              ${classGradesList.map(grade => `
                <button class="delete-grade" onclick="removeGrade(${grade.index})">Izbriši</button>
              `).join('')}
            </td>
          </tr>
        `;
      });
      
      tableContent += '</tbody>';
      table.innerHTML = tableContent;
      
      studentSection.appendChild(nameHeader);
      studentSection.appendChild(table);
      gradesList.appendChild(studentSection);
    });
  }

  window.removeGrade = (index) => {
    grades.splice(index, 1);
    saveGrades();
    displayGrades();
  };

  window.removeStudent = (studentName) => {
    grades = grades.filter(grade => grade.studentName !== studentName);
    saveGrades();
    displayGrades();
  };

  gradeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const studentName = document.getElementById('studentName').value;
    const className = document.getElementById('className').value;
    const grade = document.getElementById('grade').value;

    grades.push({ studentName, className, grade });
    saveGrades();
    displayGrades();
    
    gradeForm.reset();
  });

  classesTable.addEventListener('click', (e) => {
    const cell = e.target.closest('td');
    if (cell) {
      document.getElementById('className').value = cell.textContent;
    }
  });

  populateClassesTable();
  displayGrades();
});
