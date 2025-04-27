// Web Worker for DuckDB operations
// This worker runs DuckDB in a separate thread to keep the UI responsive

// Import DuckDB-WASM
importScripts('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.24.0/dist/duckdb.js');

let db;
let conn;

// Initialize DuckDB
async function initDuckDB() {
  try {
    // Select the bundle based on browser support
    const JSDELIVR_BUNDLES = {
      mvp: {
        mainModule: 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.24.0/dist/duckdb-mvp.wasm',
        mainWorker: 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.24.0/dist/duckdb-browser-mvp.worker.js',
      },
      eh: {
        mainModule: 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.24.0/dist/duckdb-eh.wasm',
        mainWorker: 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.24.0/dist/duckdb-browser-eh.worker.js',
      }
    };
    
    // Select the appropriate bundle
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    
    // Create a logger that posts messages back to the main thread
    const logger = {
      log: (...args) => postMessage({ type: 'log', level: 'info', message: args.join(' ') }),
      debug: (...args) => postMessage({ type: 'log', level: 'debug', message: args.join(' ') }),
      warn: (...args) => postMessage({ type: 'log', level: 'warn', message: args.join(' ') }),
      error: (...args) => postMessage({ type: 'log', level: 'error', message: args.join(' ') })
    };
    
    // Initialize DuckDB in-memory database
    db = new duckdb.AsyncDuckDB(logger);
    await db.instantiate(bundle.mainModule);
    conn = await db.connect();
    
    postMessage({ type: 'initialized' });
  } catch (error) {
    postMessage({ type: 'error', message: error.toString() });
  }
}

// Generate sample data
async function generateData(rowCount) {
  try {
    // Create a table for our data
    await conn.query(`
      DROP TABLE IF EXISTS sales;
      CREATE TABLE sales(
        id INTEGER,
        date DATE,
        product VARCHAR,
        region VARCHAR,
        amount DECIMAL
      );
    `);
    
    // Log progress
    postMessage({ type: 'log', level: 'info', message: `Creating table with ${rowCount} rows...` });
    postMessage({ type: 'progress', value: 5 });
    
    // Generate data in batches to show progress
    const batchSize = 10000;
    const batches = Math.ceil(rowCount / batchSize);
    const products = ['Laptop', 'Smartphone', 'Tablet', 'Desktop', 'Monitor'];
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, rowCount);
      const currentBatchSize = batchEnd - batchStart;
      
      // Generate values for this batch
      let values = [];
      for (let i = 0; i < currentBatchSize; i++) {
        const id = batchStart + i + 1;
        const dayOffset = Math.floor(Math.random() * 365);
        const date = new Date(2025, 0, 1);
        date.setDate(date.getDate() + dayOffset);
        const dateStr = date.toISOString().split('T')[0];
        const product = products[Math.floor(Math.random() * products.length)];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const amount = (Math.random() * 1500 + 500).toFixed(2);
        
        values.push(`(${id}, '${dateStr}', '${product}', '${region}', ${amount})`);
      }
      
      // Insert this batch
      await conn.query(`
        INSERT INTO sales VALUES ${values.join(', ')}
      `);
      
      // Update progress
      const progress = Math.round(((batch + 1) / batches) * 90) + 5;
      postMessage({ 
        type: 'progress', 
        value: progress,
        message: `Generated ${batchEnd} of ${rowCount} rows (${progress}%)` 
      });
    }
    
    postMessage({ type: 'log', level: 'success', message: `Successfully generated ${rowCount} rows of test data!` });
    postMessage({ type: 'dataGenerated' });
  } catch (error) {
    postMessage({ type: 'error', message: error.toString() });
  }
}

// Run analytics queries
async function runAnalytics() {
  try {
    postMessage({ type: 'log', level: 'info', message: 'Running analytics queries...' });
    postMessage({ type: 'progress', value: 95 });
    
    // Product Analysis
    const productResults = await conn.query(`
      SELECT 
        product, 
        COUNT(*) as num_sales,
        SUM(amount) as total_sales
      FROM sales
      GROUP BY product
      ORDER BY total_sales DESC
    `);
    
    // Region Analysis
    const regionResults = await conn.query(`
      SELECT 
        region, 
        COUNT(*) as num_sales,
        SUM(amount) as total_sales
      FROM sales
      GROUP BY region
      ORDER BY total_sales DESC
    `);
    
    // Monthly Trend
    const monthlyResults = await conn.query(`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(amount) as monthly_sales
      FROM sales
      GROUP BY month
      ORDER BY month
    `);
    
    // Send results back to the main thread
    postMessage({ 
      type: 'results', 
      productResults: convertResultToObject(productResults),
      regionResults: convertResultToObject(regionResults),
      monthlyResults: convertResultToObject(monthlyResults)
    });
    
    postMessage({ type: 'progress', value: 100 });
    postMessage({ type: 'log', level: 'success', message: 'Analytics completed successfully!' });
  } catch (error) {
    postMessage({ type: 'error', message: error.toString() });
  }
}

// Helper function to convert DuckDB result to a plain object for transfer
function convertResultToObject(result) {
  const columns = result.schema.fields;
  const rowCount = result.getChild(columns[0].name).length;
  const rows = [];
  
  for (let i = 0; i < rowCount; i++) {
    const row = {};
    columns.forEach(col => {
      const colData = result.getChild(col.name).toArray();
      row[col.name] = colData[i];
    });
    rows.push(row);
  }
  
  return {
    columns: columns.map(col => col.name),
    rows: rows
  };
}

// Listen for messages from the main thread
onmessage = async function(e) {
  try {
    const { command, params } = e.data;
    
    switch (command) {
      case 'init':
        await initDuckDB();
        break;
        
      case 'generateData':
        await generateData(params.rowCount);
        break;
        
      case 'runAnalytics':
        await runAnalytics();
        break;
        
      default:
        postMessage({ type: 'error', message: `Unknown command: ${command}` });
    }
  } catch (error) {
    postMessage({ type: 'error', message: error.toString() });
  }
};
