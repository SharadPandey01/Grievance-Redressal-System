const Counter = require('../models/Counter');

async function nextComplaintCode() {
  const year = new Date().getFullYear();
  const counterKey = `complaint_${year}`;

  const result = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  const padded = String(result.seq).padStart(4, '0');
  return `GRV-${year}-${padded}`;
}

module.exports = { nextComplaintCode };
