// Main Application JavaScript
// This file handles UI interactions and coordinates with the worker

// Initialize the UI
const statusElement = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const logContainer = document.getElementById('logContainer');
const generateDataButton = document.getElementById('generateData');
const loadDataButton = document.getElementById('loadData');
const showResultsButton = document.getElementById('showResults');
const rowCountInput = document.getElementById('rowCount');
const resultsTable = document.getElementById('resultsTable');

let worker;
let analyticsResults;
let chart;

// Initialize the app
function initApp() {
  updateStatus('Creating Web Worker...');
  
  // Create a Web Worker
  worker = new Worker('js/worker.js');
  
  // Set up message handling from the worker
  worker.onmessage = handleWorkerMessage;
  
  // Initialize the worker
  worker.postMessage({ command: 'init' });
  
  // Set up UI event handlers
  generateDataButton.addEventListener('click', handleGenerateData);
  loadDataButton.addEventListener('click', handleLoadData);
  showResultsButton.addEventListener('click', showResults);
  
  logMessage('Web Worker created, initializing DuckDB...');
}

// Handle messages from the worker
function handleWorkerMessage(e) {
  const { type, message, level, value } = e.data;
  
  switch (type) {
    case 'initialized':
      updateStatus('DuckDB initialized and ready!');
      generateDataButton.disabled = false;
      logMessage('DuckDB initialized successfully!', 'success');
      break;
      
    case 'log':
      logMessage(message, level);
      break;
      
    case 'progress':
      updateProgress(value, e.data.message);
      break;
      
    case 'error':
      updateStatus('Error: ' + message, true);
      logMessage(message, 'error');
      break;
      
    case 'dataGenerated':
      updateStatus('Data generated successfully!');
      loadDataButton.disabled = false;
      break;
      
    case 'results':
      analyticsResults = e.data;
      updateStatus('Analytics completed, ready to view results!');
      showResultsButton.disabled = false;
      break;
  }
}

// Generate test data
function handleGenerateData() {
  const rowCount = parseInt(rowCountInput.value);
  if (isNaN(rowCount) || rowCount < 1000 || rowCount > 1000000) {
    alert('Please enter a valid number of rows between 1,000 and 1,000,000');
    return;
  }
  
  updateStatus(`Generating ${rowCount.toLocaleString()} rows of test data...`);
  updateProgress(0);
  generateDataButton.disabled = true;
  loadDataButton.disabled = true;
  showResultsButton.disabled = true;
  
  logMessage(`Starting data generation process for ${rowCount.toLocaleString()} rows...`);
  
  worker.postMessage({ 
    command: 'generateData',
    params: { rowCount }
  });
}

// Load data with progress tracking
function handleLoadData() {
  updateStatus('Running analytics queries...');
  updateProgress(0);
  loadDataButton.disabled = true;
  
  logMessage('Starting analytics process...');
  
  worker.postMessage({ command: 'runAnalytics' });
}

// Show results
function showResults() {
  if (!analyticsResults) {
    logMessage('No results available yet', 'error');
    return;
  }
  
  // Display product results table
  displayTable(analyticsResults.productResults, 'Product Analysis');
  
  // Create chart
  createChart(analyticsResults);
}

// Create chart from analysis results
function createChart(results) {
  const ctx = document.getElementById('resultsChart').getContext('2d');
  
  // Destroy previous chart if it exists
  if (chart) {
    chart.destroy();
  }
  
  // Create a new chart
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: results.productResults.rows.map(row => row.product),
      datasets: [
        {
          label: 'Total Sales ($)',
          data: results.productResults.rows.map(row => row.total_sales),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        },
        {
          label: 'Number of Sales',
          data: results.productResults.rows.map(row => row.num_sales),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Total Sales ($)'
          }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Sales'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Product Sales Analysis'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.datasetIndex === 0) {
                  label += new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(context.parsed.y);
                } else {
                  label += context.parsed.y.toLocaleString();
                }
              }
              return label;
            }
          }
        }
      }
    }
  });
}

// Display a table with the results
function displayTable(resultData, title) {
  const { columns, rows } = resultData;
  
  let html = `<h3>${title}</h3>`;
  html += '<table class="data-table"><thead><tr>';
  
  // Add headers
  columns.forEach(col => {
    html += `<th>${formatColumnName(col)}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  // Add rows
  rows.forEach(row => {
    html += '<tr class="data-row">';
    columns.forEach(col => {
      html += `<td>${formatValue(row[col], col)}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  resultsTable.innerHTML = html;
}

// Format column names for display
function formatColumnName(columnName) {
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format value for display
function formatValue(value, columnName) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  if (columnName.includes('sales') || columnName.includes('amount')) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }
  
  if (columnName.includes('month') && value instanceof Date) {
    return value.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
  
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  
  return value;
}

// Update the status message
function updateStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#e74c3c' : '#2c3e50';
}

// Update the progress bar
function updateProgress(percentage, message) {
  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = message || `${percentage}%`;
}

// Add a log message
function logMessage(message, level = 'info') {
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${level}`;
  logEntry.textContent = message;
  
  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Start the application when the page loads
window.addEventListener('load', initApp);
