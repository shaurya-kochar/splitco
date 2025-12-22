import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../../dev-operations.log');
const isDevMode = process.env.DEV_MODE === 'true';

// Initialize log file
function initLogger() {
  if (isDevMode) {
    const timestamp = new Date().toISOString();
    const header = `\n${'='.repeat(80)}\nDEV MODE LOG - Server Started: ${timestamp}\nNode Version: ${process.version}\nPlatform: ${process.platform}\nEnvironment: ${process.env.NODE_ENV || 'development'}\nPID: ${process.pid}\n${'='.repeat(80)}\n`;
    fs.appendFileSync(LOG_FILE, header);
    console.log(`Dev logging enabled. Logs will be written to: ${LOG_FILE}`);
  }
}

// Log HTTP requests
function logRequest(req, res, responseTime, statusCode, error = null) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    let logEntry = `\n[${timestamp}] HTTP REQUEST\n`;
    logEntry += `-`.repeat(80) + '\n';
    logEntry += `Method: ${req.method}\n`;
    logEntry += `URL: ${req.originalUrl || req.url}\n`;
    logEntry += `Route: ${req.route?.path || 'N/A'}\n`;
    logEntry += `Status Code: ${statusCode}\n`;
    logEntry += `Response Time: ${responseTime}ms\n`;
    
    // Client info
    logEntry += `\nCLIENT INFO:\n`;
    logEntry += `  IP: ${req.ip || req.connection?.remoteAddress || 'Unknown'}\n`;
    logEntry += `  User-Agent: ${req.headers['user-agent'] || 'Unknown'}\n`;
    logEntry += `  Origin: ${req.headers.origin || 'N/A'}\n`;
    
    // Authentication
    logEntry += `\nAUTHENTICATION:\n`;
    if (req.user) {
      logEntry += `  Authenticated: Yes\n`;
      logEntry += `  User ID: ${req.user.id}\n`;
      logEntry += `  Phone: ${req.user.phone}\n`;
      logEntry += `  Name: ${req.user.name || 'N/A'}\n`;
    } else {
      logEntry += `  Authenticated: No\n`;
    }
    logEntry += `  Authorization Header: ${req.headers.authorization ? 'Present' : 'Missing'}\n`;
    
    // Request params
    if (req.params && Object.keys(req.params).length > 0) {
      logEntry += `\nPATH PARAMS:\n`;
      Object.entries(req.params).forEach(([key, value]) => {
        logEntry += `  ${key}: ${value}\n`;
      });
    }
    
    // Query params
    if (req.query && Object.keys(req.query).length > 0) {
      logEntry += `\nQUERY PARAMS:\n`;
      Object.entries(req.query).forEach(([key, value]) => {
        logEntry += `  ${key}: ${value}\n`;
      });
    }
    
    // Request body
    if (req.body && Object.keys(req.body).length > 0) {
      logEntry += `\nREQUEST BODY:\n`;
      const body = JSON.parse(JSON.stringify(req.body));
      // Mask sensitive data
      if (body.password) body.password = '***MASKED***';
      if (body.otp) body.otp = '***MASKED***';
      logEntry += `${JSON.stringify(body, null, 2)}\n`;
    }
    
    // Error details
    if (error) {
      logEntry += `\nERROR:\n`;
      logEntry += `  Message: ${error.message}\n`;
      logEntry += `  Stack: ${error.stack}\n`;
    }
    
    logEntry += `\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Error writing request log:', err.message);
  }
}

// Log authentication events
function logAuth(event, data) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    let logEntry = `\n[${timestamp}] AUTH EVENT: ${event}\n`;
    logEntry += `-`.repeat(80) + '\n';
    
    switch(event) {
      case 'OTP_SENT':
        logEntry += `Phone: ${data.phone}\n`;
        logEntry += `OTP: ${data.otp}\n`;
        logEntry += `Expiry: ${data.expiry || 'N/A'}\n`;
        break;
      case 'OTP_VERIFIED':
        logEntry += `Phone: ${data.phone}\n`;
        logEntry += `User ID: ${data.userId}\n`;
        logEntry += `Session Token: ${data.token ? data.token.substring(0, 20) + '...' : 'N/A'}\n`;
        break;
      case 'SESSION_CREATED':
        logEntry += `User ID: ${data.userId}\n`;
        logEntry += `Session ID: ${data.sessionId}\n`;
        logEntry += `Token: ${data.token ? data.token.substring(0, 20) + '...' : 'N/A'}\n`;
        break;
      case 'AUTH_FAILED':
        logEntry += `Reason: ${data.reason}\n`;
        logEntry += `Phone: ${data.phone || 'N/A'}\n`;
        break;
      default:
        logEntry += JSON.stringify(data, null, 2) + '\n';
    }
    
    logEntry += `\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Error writing auth log:', err.message);
  }
}

// Log user actions
function logUserAction(action, userId, details = {}) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    let logEntry = `\n[${timestamp}] USER ACTION: ${action}\n`;
    logEntry += `-`.repeat(80) + '\n';
    logEntry += `User ID: ${userId}\n`;
    logEntry += `Details:\n${JSON.stringify(details, null, 2)}\n`;
    logEntry += `\n`;
    
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Error writing user action log:', err.message);
  }
}

// Log expense creation
function logExpense(expense, splits, paidByData, groupMembers, userId = null) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    let logEntry = `\n[${timestamp}] EXPENSE CREATED\n`;
    logEntry += `-`.repeat(80) + '\n';
    logEntry += `Expense ID: ${expense.id}\n`;
    logEntry += `Group ID: ${expense.groupId}\n`;
    logEntry += `Created By User ID: ${userId || 'Unknown'}\n`;
    logEntry += `Amount: ₹${expense.amount}\n`;
    logEntry += `Description: ${expense.description || 'N/A'}\n`;
    logEntry += `Category: ${expense.category || 'N/A'}\n`;
    logEntry += `Created At: ${expense.createdAt}\n`;
    logEntry += `Timestamp: ${Date.now()}\n\n`;

    // Payment details
    logEntry += `PAYMENT DETAILS:\n`;
    if (paidByData.mode === 'single') {
      const payer = groupMembers.find(m => m.userId === paidByData.userId);
      logEntry += `  Mode: Single Payer\n`;
      logEntry += `  Paid by: ${payer?.name || payer?.phone || 'Unknown'} (ID: ${paidByData.userId})\n`;
      logEntry += `  Amount: ₹${expense.amount}\n`;
    } else if (paidByData.mode === 'multiple') {
      logEntry += `  Mode: Multiple Payers\n`;
      logEntry += `  Payments:\n`;
      paidByData.payments.forEach(payment => {
        const payer = groupMembers.find(m => m.userId === payment.userId);
        logEntry += `    - ${payer?.name || payer?.phone || 'Unknown'} (ID: ${payment.userId}): ₹${payment.amount}\n`;
      });
      const totalPaid = paidByData.payments.reduce((sum, p) => sum + p.amount, 0);
      logEntry += `  Total Paid: ₹${totalPaid}\n`;
    }

    // Split details
    logEntry += `\nSPLIT DETAILS:\n`;
    logEntry += `  Number of splits: ${splits.length}\n`;
    logEntry += `  Splits:\n`;
    splits.forEach(split => {
      const member = groupMembers.find(m => m.userId === split.userId);
      logEntry += `    - ${member?.name || member?.phone || 'Unknown'} (ID: ${split.userId}): ₹${split.shareAmount}\n`;
    });
    const totalSplit = splits.reduce((sum, s) => sum + s.shareAmount, 0);
    logEntry += `  Total Split: ₹${totalSplit}\n`;

    // Validation check
    const totalPaid = paidByData.mode === 'multiple' 
      ? paidByData.payments.reduce((sum, p) => sum + p.amount, 0)
      : expense.amount;
    const isValid = Math.abs(totalPaid - totalSplit) < 0.01 && Math.abs(totalPaid - expense.amount) < 0.01;
    logEntry += `\nVALIDATION: ${isValid ? '✓ PASSED' : '✗ FAILED'}\n`;
    if (!isValid) {
      logEntry += `  Expected: ₹${expense.amount}\n`;
      logEntry += `  Total Paid: ₹${totalPaid}\n`;
      logEntry += `  Total Split: ₹${totalSplit}\n`;
    }

    logEntry += `\n`;

    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    console.error('Error writing to dev log:', error.message);
  }
}

// Log settlement creation
function logSettlement(settlement, fromUser, toUser, groupId, currentUserId = null) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    let logEntry = `\n[${timestamp}] SETTLEMENT CREATED\n`;
    logEntry += `-`.repeat(80) + '\n';
    logEntry += `Settlement ID: ${settlement.id}\n`;
    logEntry += `Group ID: ${groupId}\n`;
    logEntry += `Created By User ID: ${currentUserId || 'Unknown'}\n`;
    logEntry += `Amount: ₹${settlement.amount}\n`;
    logEntry += `From: ${fromUser?.name || fromUser?.phone || 'Unknown'} (ID: ${settlement.fromUserId})\n`;
    logEntry += `To: ${toUser?.name || toUser?.phone || 'Unknown'} (ID: ${settlement.toUserId})\n`;
    logEntry += `Payment Method: ${settlement.method || 'manual'}\n`;
    logEntry += `Type: ${settlement.type || 'manual'}\n`;
    logEntry += `Created At: ${settlement.createdAt}\n`;
    logEntry += `Timestamp: ${Date.now()}\n`;
    logEntry += `\n`;

    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    console.error('Error writing to dev log:', error.message);
  }
}

// Log balance calculation
function logBalances(groupId, balances, requestedByUserId = null) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    let logEntry = `\n[${timestamp}] BALANCE CALCULATION\n`;
    logEntry += `-`.repeat(80) + '\n';
    logEntry += `Group ID: ${groupId}\n`;
    logEntry += `Requested By User ID: ${requestedByUserId || 'Unknown'}\n`;
    logEntry += `Number of Members: ${balances.length}\n`;
    logEntry += `Balances:\n`;
    
    balances.forEach(balance => {
      const status = balance.balance > 0 ? 'gets back' : balance.balance < 0 ? 'owes' : 'settled';
      logEntry += `  ${balance.userName} (ID: ${balance.userId}): ${status} ₹${Math.abs(balance.balance).toFixed(2)}\n`;
    });
    
    const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
    const maxBalance = Math.max(...balances.map(b => Math.abs(b.balance)));
    const minBalance = Math.min(...balances.map(b => Math.abs(b.balance)));
    logEntry += `\nNet Total: ₹${totalBalance.toFixed(2)} (should be ~0)\n`;
    logEntry += `Max Balance: ₹${maxBalance.toFixed(2)}\n`;
    logEntry += `Min Balance: ₹${minBalance.toFixed(2)}\n`;
    logEntry += `Balance Check: ${Math.abs(totalBalance) < 0.01 ? '✓ PASSED' : '✗ FAILED'}\n`;
    logEntry += `Timestamp: ${Date.now()}\n`;
    logEntry += `\n`;

    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    console.error('Error writing to dev log:', error.message);
  }
}

// Log group operations
function logGroupOperation(operation, groupId, userId, details = {}) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    let logEntry = `\n[${timestamp}] GROUP OPERATION: ${operation}\n`;
    logEntry += `-`.repeat(80) + '\n';
    logEntry += `Group ID: ${groupId}\n`;
    logEntry += `User ID: ${userId}\n`;
    logEntry += `Details:\n${JSON.stringify(details, null, 2)}\n`;
    logEntry += `Timestamp: ${Date.now()}\n`;
    logEntry += `\n`;
    
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Error writing group operation log:', err.message);
  }
}

// Log errors
function logError(error, context = {}) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    let logEntry = `\n[${timestamp}] ERROR\n`;
    logEntry += `-`.repeat(80) + '\n';
    logEntry += `Error Message: ${error.message}\n`;
    logEntry += `Error Name: ${error.name}\n`;
    logEntry += `Context:\n${JSON.stringify(context, null, 2)}\n`;
    logEntry += `Stack Trace:\n${error.stack}\n`;
    logEntry += `\n`;
    
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Error writing error log:', err.message);
  }
}

export {
  initLogger,
  logExpense,
  logSettlement,
  logBalances,
  logRequest,
  logAuth,
  logUserAction,
  logGroupOperation,
  logError
};
