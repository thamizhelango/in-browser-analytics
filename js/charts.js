// Chart utilities for the In-Browser Analytics demo
// This file contains specialized chart creation functions

/**
 * Creates a bar chart for product analysis
 * @param {HTMLCanvasElement} canvas - The canvas element to render the chart on
 * @param {Object} data - The product data
 * @returns {Chart} The created chart instance
 */
function createProductChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.rows.map(row => row.product),
      datasets: [
        {
          label: 'Total Sales ($)',
          data: data.rows.map(row => row.total_sales),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        },
        {
          label: 'Number of Sales',
          data: data.rows.map(row => row.num_sales),
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

/**
 * Creates a pie chart for region analysis
 * @param {HTMLCanvasElement} canvas - The canvas element to render the chart on
 * @param {Object} data - The region data
 * @returns {Chart} The created chart instance
 */
function createRegionChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: data.rows.map(row => row.region),
      datasets: [{
        data: data.rows.map(row => row.total_sales),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Sales by Region'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              
              return `${label}: ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Creates a line chart for time series analysis
 * @param {HTMLCanvasElement} canvas - The canvas element to render the chart on
 * @param {Object} data - The time series data
 * @returns {Chart} The created chart instance
 */
function createTimeSeriesChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.rows.map(row => {
        // Format the date for display
        const date = new Date(row.month);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }),
      datasets: [{
        label: 'Monthly Sales',
        data: data.rows.map(row => row.monthly_sales),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Sales ($)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Monthly Sales Trend'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Sales: ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(context.parsed.y)}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Creates a dashboard with multiple charts
 * @param {Object} container - The container element for the dashboard
 * @param {Object} data - The analytics data
 */
function createDashboard(container, data) {
  // Clear the container
  container.innerHTML = '';
  
  // Create elements for each chart
  const gridContainer = document.createElement('div');
  gridContainer.className = 'dashboard-grid';
  
  // Product Chart
  const productCard = document.createElement('div');
  productCard.className = 'dashboard-card';
  productCard.innerHTML = `
    <h3>Product Analysis</h3>
    <div class="chart-container">
      <canvas id="productChart"></canvas>
    </div>
  `;
  
  // Region Chart
  const regionCard = document.createElement('div');
  regionCard.className = 'dashboard-card';
  regionCard.innerHTML = `
    <h3>Regional Analysis</h3>
    <div class="chart-container">
      <canvas id="regionChart"></canvas>
    </div>
  `;
  
  // Time Series Chart
  const timeSeriesCard = document.createElement('div');
  timeSeriesCard.className = 'dashboard-card';
  timeSeriesCard.innerHTML = `
    <h3>Sales Trend</h3>
    <div class="chart-container">
      <canvas id="timeSeriesChart"></canvas>
    </div>
  `;
  
  // Add the cards to the grid
  gridContainer.appendChild(productCard);
  gridContainer.appendChild(regionCard);
  gridContainer.appendChild(timeSeriesCard);
  
  // Add the grid to the container
  container.appendChild(gridContainer);
  
  // Create the charts
  createProductChart(document.getElementById('productChart'), data.productResults);
  createRegionChart(document.getElementById('regionChart'), data.regionResults);
  createTimeSeriesChart(document.getElementById('timeSeriesChart'), data.monthlyResults);
}

// Export the functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createProductChart,
    createRegionChart,
    createTimeSeriesChart,
    createDashboard
  };
}
