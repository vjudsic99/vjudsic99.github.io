// Globalne varijable
let materials = [];
let euroRate = 1.95583; // Standardni tečaj BAM-EUR
let materialChart = null;

// DOM elementi
document.addEventListener('DOMContentLoaded', function() {
    // Inicijalizacija događaja
    document.getElementById('euroRate').addEventListener('input', updateCalculations);
    document.getElementById('calculateBtn').addEventListener('click', updateCalculations);
    document.getElementById('addMaterialBtn').addEventListener('click', addMaterial);
    
    // Postavljanje početnog datuma na 1.1.2025.
    document.getElementById('date').valueAsDate = new Date(2025, 0, 1);
    
    // Inicijalizacija grafa
    initializeChart();
    
    // Učitavanje podataka iz lokalnog spremnika (ako postoje)
    loadFromLocalStorage();
});

// Funkcije za rad s materijalima
function addMaterial() {
    const materialType = document.getElementById('materialType').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);
    const date = document.getElementById('date').value;
    
    if (!quantity || !price || !date) {
        alert('Molimo unesite sve podatke.');
        return;
    }
    
    const total = quantity * price;
    const totalInBAM = total * euroRate;
    
    const material = {
        id: Date.now(), // Jedinstveni ID
        date,
        type: materialType,
        quantity,
        price,
        total,
        totalInBAM
    };
    
    materials.push(material);
    updateTable();
    updateSummary();
    updateChart();
    saveToLocalStorage();
    
    // Resetiranje polja nakon dodavanja
    document.getElementById('quantity').value = '1';
    document.getElementById('price').value = '10';
}

function deleteMaterial(id) {
    materials = materials.filter(material => material.id !== id);
    updateTable();
    updateSummary();
    updateChart();
    saveToLocalStorage();
}

// Funkcije za ažuriranje prikaza
function updateTable() {
    const tableBody = document.getElementById('materialTableBody');
    tableBody.innerHTML = '';
    
    materials.forEach(material => {
        const row = document.createElement('tr');
        
        // Formatiranje datuma za prikaz
        const dateObj = new Date(material.date);
        const formattedDate = `${dateObj.getDate()}.${dateObj.getMonth() + 1}.${dateObj.getFullYear()}`;
        
        // Naziv materijala s prvim velikim slovom
        const materialName = material.type.charAt(0).toUpperCase() + material.type.slice(1);
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${materialName}</td>
            <td>${material.quantity}</td>
            <td>${material.price.toFixed(2)}</td>
            <td>${material.total.toFixed(2)}</td>
            <td>${material.totalInBAM.toFixed(2)}</td>
            <td><button class="delete-btn" data-id="${material.id}">Obriši</button></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Dodavanje događaja za brisanje
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteMaterial(id);
        });
    });
}

function updateSummary() {
    const totalEUR = materials.reduce((sum, material) => sum + material.total, 0);
    const totalBAM = totalEUR * euroRate;
    
    // Calculate average, min, and max earnings
    let averageEUR = 0;
    let minEUR = materials.length > 0 ? materials[0].total : 0;
    let maxEUR = 0;
    
    if (materials.length > 0) {
        averageEUR = totalEUR / materials.length;
        
        materials.forEach(material => {
            if (material.total < minEUR) minEUR = material.total;
            if (material.total > maxEUR) maxEUR = material.total;
        });
    }
    
    document.getElementById('totalEUR').textContent = totalEUR.toFixed(2);
    document.getElementById('totalBAM').textContent = totalBAM.toFixed(2);
    document.getElementById('averageEUR').textContent = averageEUR.toFixed(2);
    document.getElementById('minEUR').textContent = minEUR.toFixed(2);
    document.getElementById('maxEUR').textContent = maxEUR.toFixed(2);
}

function updateCalculations() {
    const newEuroRate = parseFloat(document.getElementById('euroRate').value);
    
    if (!newEuroRate || newEuroRate <= 0) {
        alert('Molimo unesite ispravnu vrijednost tečaja!');
        document.getElementById('euroRate').value = euroRate;
        return;
    }
    
    euroRate = newEuroRate;
    
    // Ažuriranje BAM vrijednosti za sve materijale
    materials.forEach(material => {
        material.totalInBAM = material.total * euroRate;
    });
    
    updateTable();
    updateSummary();
    saveToLocalStorage();
}

// Funkcije za graf
function initializeChart() {
    const ctx = document.getElementById('materialChart').getContext('2d');
    
    materialChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Cement', 'Cigla', 'Stiropor', 'Pijesak', 'Šljunak'],
            datasets: [{
                label: 'Promet u EUR',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(231, 76, 60, 0.7)',
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(155, 89, 182, 0.7)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(231, 76, 60, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(155, 89, 182, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Iznos (EUR)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Vrsta materijala'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Promet po vrsti materijala'
                }
            }
        }
    });
}

function updateChart() {
    // Izračunaj ukupni promet po tipu materijala
    const materialTotals = {
        cement: 0,
        cigla: 0,
        stiropor: 0,
        pijesak: 0,
        sljunak: 0
    };
    
    materials.forEach(material => {
        materialTotals[material.type] += material.total;
    });
    
    // Ažuriraj podatke grafa
    materialChart.data.datasets[0].data = [
        materialTotals.cement,
        materialTotals.cigla,
        materialTotals.stiropor,
        materialTotals.pijesak,
        materialTotals.sljunak
    ];
    
    materialChart.update();
}

// Funkcije za local storage
function saveToLocalStorage() {
    const data = {
        materials,
        euroRate
    };
    
    localStorage.setItem('gradevinski-materijali-2025', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('gradevinski-materijali-2025');
    
    if (savedData) {
        const data = JSON.parse(savedData);
        materials = data.materials || [];
        euroRate = data.euroRate || 1.95583;
        
        document.getElementById('euroRate').value = euroRate;
        
        updateTable();
        updateSummary();
        updateChart();
    }
}
