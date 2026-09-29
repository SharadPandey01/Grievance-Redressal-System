require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const config = require('../src/config/env');
const connectDB = require('../src/config/db');

const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Complaint = require('../src/models/Complaint');
const Feedback = require('../src/models/Feedback');
const Counter = require('../src/models/Counter');

const { ROLES, PRIORITIES, SLA_DAYS } = require('../src/constants');

let passed = 0;
let failed = 0;

function check(label, result) {
  if (result) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

async function initialCleanup() {
  await User.deleteMany({ email: /^verify\.|^bad\.officer\./ });
  await Category.deleteMany({ name: /^Test Category / });
  await Counter.deleteMany({ key: /^complaint_/ });
}

async function cleanup(ids) {
  const complaintIds = [ids.complaintId, ids.complaint2Id, ids.complaint3Id].filter(Boolean);
  await Feedback.deleteMany({ complaint: { $in: complaintIds } });
  await Complaint.deleteMany({ _id: { $in: complaintIds } });
  await Category.deleteMany({ _id: ids.categoryId });
  await User.deleteMany({ _id: { $in: (ids.userIds || []) } });
  await Counter.deleteMany({ key: /^complaint_/ });
}

async function run() {
  await connectDB(config.mongoUri);
  console.log('\nRunning model verification checks...\n');

  const ids = {};

  await initialCleanup();

  try {
    const user1 = await User.create({
      name: 'Verify Student',
      email: `verify.student.${Date.now()}@campus.edu`,
      passwordHash: 'fakehash',
      role: ROLES.STUDENT,
    });

    const officer = await User.create({
      name: 'Verify Officer',
      email: `verify.officer.${Date.now()}@campus.edu`,
      passwordHash: 'fakehash',
      role: ROLES.OFFICER,
      department: 'IT',
    });

    ids.userIds = [user1._id, officer._id];

    check('Student created without department', !!user1._id);
    check('Officer created with department', !!officer._id && officer.department === 'IT');

    let officerNoDept = null;
    try {
      officerNoDept = await User.create({
        name: 'Bad Officer',
        email: `bad.officer.${Date.now()}@campus.edu`,
        passwordHash: 'fakehash',
        role: ROLES.OFFICER,
      });
    } catch (err) {
      officerNoDept = null;
    }
    check('Officer without department is rejected', officerNoDept === null);

    let dupUser = null;
    try {
      dupUser = await User.create({
        name: 'Dup User',
        email: user1.email,
        passwordHash: 'fakehash',
        role: ROLES.STUDENT,
      });
    } catch (err) {
      dupUser = null;
    }
    check('Duplicate email is rejected', dupUser === null);

    const userJSON = user1.toJSON();
    check('toJSON strips passwordHash', !('passwordHash' in userJSON));
    check('toJSON strips __v', !('__v' in userJSON));

    const category = await Category.create({
      name: `Test Category ${Date.now()}`,
      description: 'For verification',
      department: 'IT',
      defaultHandler: officer._id,
    });
    ids.categoryId = category._id;
    check('Category created with defaultHandler', !!category._id);

    const highComplaint = await Complaint.createWithCode({
      title: 'High priority test',
      description: 'Verifying SLA for high priority',
      category: category._id,
      priority: PRIORITIES.HIGH,
      filedBy: user1._id,
    });
    ids.complaintId = highComplaint._id;

    const codeRegex = /^GRV-\d{4}-\d{4}$/;
    check('Complaint code matches GRV-YYYY-NNNN format', codeRegex.test(highComplaint.code));

    const expectedHighDays = SLA_DAYS[PRIORITIES.HIGH];
    const diffDays = Math.round((highComplaint.dueAt - highComplaint.createdAt) / (1000 * 60 * 60 * 24));
    check(`dueAt is ${expectedHighDays} days from creation for High priority`, diffDays === expectedHighDays);

    const mediumComplaint = await Complaint.createWithCode({
      title: 'Medium priority test',
      description: 'Verifying SLA for medium priority',
      category: category._id,
      priority: PRIORITIES.MEDIUM,
      filedBy: user1._id,
    });
    ids.complaint2Id = mediumComplaint._id;

    const expectedMedDays = SLA_DAYS[PRIORITIES.MEDIUM];
    const diffDaysMed = Math.round((mediumComplaint.dueAt - mediumComplaint.createdAt) / (1000 * 60 * 60 * 24));
    check(`dueAt is ${expectedMedDays} days from creation for Medium priority`, diffDaysMed === expectedMedDays);

    const code1 = highComplaint.code;
    const code2 = mediumComplaint.code;
    const seq1 = parseInt(code1.split('-')[2], 10);
    const seq2 = parseInt(code2.split('-')[2], 10);
    check('Second code has a higher sequence than first', seq2 > seq1);

    const lowComplaint = await Complaint.createWithCode({
      title: 'Low priority test',
      description: 'Verifying SLA for low priority',
      category: category._id,
      priority: PRIORITIES.LOW,
      filedBy: user1._id,
    });
    ids.complaint3Id = lowComplaint._id;

    const expectedLowDays = SLA_DAYS[PRIORITIES.LOW];
    const diffDaysLow = Math.round((lowComplaint.dueAt - lowComplaint.createdAt) / (1000 * 60 * 60 * 24));
    check(`dueAt is ${expectedLowDays} days from creation for Low priority`, diffDaysLow === expectedLowDays);

    const feedback1 = await Feedback.create({
      complaint: highComplaint._id,
      rating: 4,
      comment: 'Good response',
      givenBy: user1._id,
    });
    check('Feedback created successfully', !!feedback1._id);

    let dupFeedback = null;
    try {
      dupFeedback = await Feedback.create({
        complaint: highComplaint._id,
        rating: 2,
        comment: 'Trying again',
        givenBy: user1._id,
      });
    } catch (err) {
      dupFeedback = null;
    }
    check('Duplicate feedback for same complaint is rejected', dupFeedback === null);

    const isOverdueTest = highComplaint.isOverdue;
    check('isOverdue virtual returns boolean', typeof isOverdueTest === 'boolean');

  } catch (err) {
    console.error('\nUnexpected error during checks:', err.message);
    failed++;
  } finally {
    await cleanup(ids);
    await mongoose.disconnect();
  }

  console.log(`\n--- Results: ${passed} PASS, ${failed} FAIL ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
