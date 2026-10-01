/**
 * scripts/seed.js
 *
 * Idempotent seed for the Campus Grievance System.
 * Usage:
 *   npm run seed               → upsert demo data (safe to re-run)
 *   npm run seed -- --reset    → wipe collections, then reseed
 *
 * Prints demo credentials at the end.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Models (imported after dotenv so env.js checks pass) ───────────────────
const User     = require('../src/models/User');
const Category = require('../src/models/Category');
const Complaint = require('../src/models/Complaint');
const StatusLog = require('../src/models/StatusLog');
const Comment  = require('../src/models/Comment');
const Feedback = require('../src/models/Feedback');
const Counter  = require('../src/models/Counter');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const RESET = process.argv.includes('--reset');
const DEMO_PASSWORD = 'Password@123';

// ── Helpers ────────────────────────────────────────────────────────────────

async function hash(pw) { return bcrypt.hash(pw, 10); }

/** Return a date that is `daysAgo` days before now. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Return a date `daysFromNow` days from today (positive = future). */
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** Format a date as GRV-YYYY-NNNN style code. */
function makeCode(year, n) {
  return `GRV-${year}-${String(n).padStart(4, '0')}`;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  if (RESET) {
    console.log('Resetting collections...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Complaint.deleteMany({}),
      StatusLog.deleteMany({}),
      Comment.deleteMany({}),
      Feedback.deleteMany({}),
      Counter.deleteMany({}),
    ]);
    console.log('Collections cleared.');
  }

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log('Upserting users...');
  const pw = await hash(DEMO_PASSWORD);

  const usersData = [
    { name: 'Admin User',           email: 'admin@campus.edu',            role: 'admin',   department: null,                passwordHash: pw },
    { name: 'Hostel Officer',       email: 'officer.hostel@campus.edu',   role: 'officer', department: 'Hostel Administration', passwordHash: pw },
    { name: 'Academic Officer',     email: 'officer.academic@campus.edu', role: 'officer', department: 'Academic Section',       passwordHash: pw },
    { name: 'IT Officer',           email: 'officer.it@campus.edu',       role: 'officer', department: 'Computer Centre',        passwordHash: pw },
    { name: 'Student One',          email: 'student1@campus.edu',         role: 'student', department: null,                passwordHash: pw },
    { name: 'Student Two',          email: 'student2@campus.edu',         role: 'student', department: null,                passwordHash: pw },
    { name: 'Staff Member',         email: 'staff1@campus.edu',           role: 'staff',   department: null,                passwordHash: pw },
  ];

  const users = {};
  for (const u of usersData) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      users[u.email] = existing;
    } else {
      users[u.email] = await User.create(u);
    }
  }
  console.log(`Users ready: ${Object.keys(users).length}`);

  // Shortcuts
  const admin    = users['admin@campus.edu'];
  const offH     = users['officer.hostel@campus.edu'];
  const offA     = users['officer.academic@campus.edu'];
  const offIT    = users['officer.it@campus.edu'];
  const s1       = users['student1@campus.edu'];
  const s2       = users['student2@campus.edu'];
  const staff1   = users['staff1@campus.edu'];

  // ── 2. Categories ─────────────────────────────────────────────────────────
  console.log('Upserting categories...');
  const catDefs = [
    { name: 'Hostel & Mess',              department: 'Hostel Administration', defaultHandler: offH._id, description: 'Issues with accommodation, mess food, cleanliness, maintenance in hostels.' },
    { name: 'Academic',                    department: 'Academic Section',       defaultHandler: offA._id, description: 'Exam grievances, attendance, result correction, curriculum issues.' },
    { name: 'IT & Network',               department: 'Computer Centre',        defaultHandler: offIT._id, description: 'Wi-Fi, lab computers, email accounts, software access issues.' },
    { name: 'Infrastructure & Maintenance', department: 'Hostel Administration', defaultHandler: null,     description: 'Electrical, plumbing, civil, furniture maintenance across campus.' },
    { name: 'Harassment & Ragging',        department: 'Academic Section',       defaultHandler: offA._id, description: 'Any form of ragging, bullying, or harassment on campus.' },
    { name: 'Library',                     department: 'Academic Section',       defaultHandler: null,     description: 'Library membership, book availability, fine disputes, reading room.' },
    { name: 'Other',                       department: 'Computer Centre',        defaultHandler: null,     description: 'Anything that does not fit the above categories.' },
  ];

  const cats = {};
  for (const c of catDefs) {
    const existing = await Category.findOne({ name: c.name });
    if (existing) {
      cats[c.name] = existing;
    } else {
      cats[c.name] = await Category.create({ ...c, isActive: true });
    }
  }
  console.log(`Categories ready: ${Object.keys(cats).length}`);

  const catHostel   = cats['Hostel & Mess'];
  const catAcademic = cats['Academic'];
  const catIT       = cats['IT & Network'];
  const catInfra    = cats['Infrastructure & Maintenance'];
  const catHarass   = cats['Harassment & Ragging'];
  const catLibrary  = cats['Library'];
  const catOther    = cats['Other'];

  // ── 3. Complaints ─────────────────────────────────────────────────────────
  // Only create if the DB is nearly empty (idempotent guard)
  const existingCount = await Complaint.countDocuments();
  if (existingCount >= 20) {
    console.log(`Complaints already seeded (${existingCount} found). Skipping complaint creation.`);
    await printSummary();
    return;
  }

  console.log('Seeding ~25 complaints...');
  const year = new Date().getFullYear();
  let codeSeq = 1;

  // Helper to create a complaint with its StatusLogs atomically
  async function makeComplaint({
    title, description, category, priority = 'Medium', filedBy,
    isAnonymous = false, assignedTo = null,
    status = 'Submitted', resolutionNotes = '',
    createdAt, resolvedAt = null, closedAt = null,
    reopenCount = 0,
  }) {
    const slaDays = { High: 2, Medium: 5, Low: 7 }[priority] || 5;
    const created = createdAt || daysAgo(Math.floor(Math.random() * 50) + 5);
    const dueAt = new Date(created);
    dueAt.setDate(dueAt.getDate() + slaDays);
    const code = makeCode(year, codeSeq++);

    // Also advance the Counter so future complaints from the app don't collide
    await Counter.findOneAndUpdate(
      { key: `complaint_${year}` },
      { $max: { seq: codeSeq } },
      { upsert: true }
    );

    const complaint = await Complaint.create({
      code, title, description, category: category._id, priority,
      status, filedBy: filedBy._id, isAnonymous,
      assignedTo: assignedTo ? assignedTo._id : null,
      resolutionNotes, resolvedAt, closedAt, reopenCount,
      dueAt, createdAt: created, updatedAt: created,
    });

    return complaint;
  }

  // ── Submitted (unassigned) ──────────────────────────────────────────────
  const c1 = await makeComplaint({
    title: 'Water leakage from bathroom ceiling in Room 204',
    description: 'There is a persistent water leakage from the ceiling in Room 204, Block C. The leak has been present for 5 days. The floor is slippery and poses a safety risk. Please arrange for urgent repair.',
    category: catHostel, priority: 'High', filedBy: s1, createdAt: daysAgo(3),
  });
  await StatusLog.create({ complaint: c1._id, fromStatus: null, toStatus: 'Submitted', changedBy: null, note: 'Complaint submitted', timestamp: daysAgo(3) });

  const c2 = await makeComplaint({
    title: 'Wi-Fi not working in Block B labs since Monday',
    description: 'The wi-fi network in all labs of Block B has been non-functional since Monday. Students cannot access course materials and online exams. The IT helpdesk has not responded to emails.',
    category: catIT, priority: 'High', filedBy: s2, createdAt: daysAgo(2),
  });
  await StatusLog.create({ complaint: c2._id, fromStatus: null, toStatus: 'Submitted', changedBy: null, note: 'Complaint submitted', timestamp: daysAgo(2) });

  const c3 = await makeComplaint({
    title: 'Library gate pass system not accepting my ID card',
    description: 'My student ID card is not being recognized at the library entry gate. I have tried multiple times and the system shows an error. I am unable to access library resources during the exam period.',
    category: catLibrary, priority: 'Medium', filedBy: staff1, createdAt: daysAgo(1),
  });
  await StatusLog.create({ complaint: c3._id, fromStatus: null, toStatus: 'Submitted', changedBy: null, note: 'Complaint submitted', timestamp: daysAgo(1) });

  // ── Overdue — Submitted and dueAt already passed ──────────────────────
  const c4 = await makeComplaint({
    title: 'Broken benches in Classroom 301 causing injuries',
    description: 'Three benches in Classroom 301 are broken with exposed sharp edges. Two students have received minor cuts. The classroom is used daily for 6 hours. The matter was verbally reported to the department two weeks ago with no action.',
    category: catInfra, priority: 'High', filedBy: s1,
    createdAt: daysAgo(12),
  });
  // Manually set dueAt to past (override the computed value)
  await Complaint.findByIdAndUpdate(c4._id, { dueAt: daysAgo(10) });
  await StatusLog.create({ complaint: c4._id, fromStatus: null, toStatus: 'Submitted', changedBy: null, note: 'Complaint submitted', timestamp: daysAgo(12) });

  const c5 = await makeComplaint({
    title: 'Mess food quality severely deteriorated — stale rotis',
    description: 'The quality of food served in the hostel mess has been consistently poor for the past two weeks. Rotis are stale and hard. Rice is undercooked on some days. Students are falling sick. We request immediate inspection.',
    category: catHostel, priority: 'Medium', filedBy: s2,
    createdAt: daysAgo(10),
  });
  await Complaint.findByIdAndUpdate(c5._id, { dueAt: daysAgo(5) });
  await StatusLog.create({ complaint: c5._id, fromStatus: null, toStatus: 'Submitted', changedBy: null, note: 'Complaint submitted', timestamp: daysAgo(10) });

  const c6 = await makeComplaint({
    title: 'Internal exam marks not updated on student portal',
    description: 'My internal marks for the Operating Systems subject have not been updated on the academic portal even though the faculty confirmed submission three weeks ago. This may affect my eligibility for the final examination.',
    category: catAcademic, priority: 'High', filedBy: s1,
    createdAt: daysAgo(8),
  });
  await Complaint.findByIdAndUpdate(c6._id, { dueAt: daysAgo(6) });
  await StatusLog.create({ complaint: c6._id, fromStatus: null, toStatus: 'Submitted', changedBy: null, note: 'Complaint submitted', timestamp: daysAgo(8) });

  // ── Acknowledged ──────────────────────────────────────────────────────
  const c7 = await makeComplaint({
    title: 'Projector bulb fused in Seminar Hall',
    description: 'The projector in the main Seminar Hall has had a fused bulb for the past week. Multiple presentations and guest lectures have been affected. A replacement request was submitted to the department but there has been no update.',
    category: catInfra, priority: 'Medium', filedBy: staff1, assignedTo: offIT,
    status: 'Acknowledged', createdAt: daysAgo(7),
  });
  await StatusLog.create({ complaint: c7._id, fromStatus: null,        toStatus: 'Submitted',    changedBy: null,     note: 'Complaint submitted', timestamp: daysAgo(7) });
  await StatusLog.create({ complaint: c7._id, fromStatus: 'Submitted', toStatus: 'Acknowledged', changedBy: offIT._id, note: 'Assigned for investigation', timestamp: daysAgo(6) });

  const c8 = await makeComplaint({
    title: 'Sports equipment room locked — cannot access during off-hours',
    description: 'The sports equipment room is locked during evening hours even though college rules allow access until 8 PM. Students training for inter-college events are unable to access equipment.',
    category: catInfra, priority: 'Low', filedBy: s2, assignedTo: offH,
    status: 'Acknowledged', createdAt: daysAgo(6),
  });
  await StatusLog.create({ complaint: c8._id, fromStatus: null,        toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted', timestamp: daysAgo(6) });
  await StatusLog.create({ complaint: c8._id, fromStatus: 'Submitted', toStatus: 'Acknowledged', changedBy: offH._id, note: 'Reviewing policy with warden', timestamp: daysAgo(5) });

  // ── In Progress ───────────────────────────────────────────────────────
  const c9 = await makeComplaint({
    title: 'E-mail account access blocked after password reset',
    description: 'After the college IT department forced a password reset two weeks ago, my institutional email account has been inaccessible. I cannot receive academic notifications, result emails, or participate in online exams sent via email.',
    category: catIT, priority: 'High', filedBy: s1, assignedTo: offIT,
    status: 'In Progress', createdAt: daysAgo(14),
  });
  await StatusLog.create({ complaint: c9._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,      note: 'Complaint submitted',          timestamp: daysAgo(14) });
  await StatusLog.create({ complaint: c9._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offIT._id,  note: 'Escalated to IT admin team',    timestamp: daysAgo(13) });
  await StatusLog.create({ complaint: c9._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offIT._id,  note: 'Working with email admin',      timestamp: daysAgo(11) });
  await Comment.create({ complaint: c9._id, author: offIT._id, text: 'We have identified the root cause. Active Directory sync issue. Working on a fix.', isInternal: true, createdAt: daysAgo(10) });
  await Comment.create({ complaint: c9._id, author: s1._id, text: 'Any estimated time of resolution? I have an exam submission due this week.', isInternal: false, createdAt: daysAgo(9) });
  await Comment.create({ complaint: c9._id, author: offIT._id, text: 'We expect to resolve this within 24 hours. Will notify you.', isInternal: false, createdAt: daysAgo(8) });

  const c10 = await makeComplaint({
    title: 'Drinking water tap in hostel corridor broken',
    description: 'The drinking water tap on the second floor corridor of Block A hostel has been broken for 8 days. Water floods the corridor. Students have to walk to another block for drinking water. Repeated verbal complaints have not worked.',
    category: catHostel, priority: 'Medium', filedBy: s2, assignedTo: offH,
    status: 'In Progress', createdAt: daysAgo(9),
  });
  await StatusLog.create({ complaint: c10._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',      timestamp: daysAgo(9) });
  await StatusLog.create({ complaint: c10._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offH._id, note: 'Plumber informed',         timestamp: daysAgo(8) });
  await StatusLog.create({ complaint: c10._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offH._id, note: 'Plumber visited; parts ordered', timestamp: daysAgo(6) });

  // ── Anonymous complaints ───────────────────────────────────────────────
  const c11 = await makeComplaint({
    title: 'Alleged favouritism in internal marks by subject faculty',
    description: 'There is alleged favouritism in the distribution of internal marks in one of the core subjects. Students with poor attendance are reportedly receiving high marks. This needs an impartial review of the marks distribution data.',
    category: catAcademic, priority: 'High', filedBy: s1, isAnonymous: true,
    assignedTo: offA, status: 'In Progress', createdAt: daysAgo(15),
  });
  await StatusLog.create({ complaint: c11._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',          timestamp: daysAgo(15) });
  await StatusLog.create({ complaint: c11._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offA._id, note: 'Investigating the allegation', timestamp: daysAgo(14) });
  await StatusLog.create({ complaint: c11._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offA._id, note: 'Meeting scheduled with HoD',    timestamp: daysAgo(12) });
  await Comment.create({ complaint: c11._id, author: offA._id, text: 'This is being treated with full confidentiality. Marks audit initiated.', isInternal: true, createdAt: daysAgo(11) });

  const c12 = await makeComplaint({
    title: 'Harassment by senior student during orientation week',
    description: 'A senior student engaged in verbal harassment and intimidation of junior students during orientation activities. Multiple students were affected. The behavior was witnessed by bystanders but no faculty were present at the time.',
    category: catHarass, priority: 'High', filedBy: s2, isAnonymous: true, createdAt: daysAgo(20),
    assignedTo: offA, status: 'Resolved',
    resolutionNotes: 'The matter was investigated by the Anti-Ragging Committee. The senior student has been issued a formal warning with a copy to their parents. CCTV footage reviewed. No further escalation required.',
    resolvedAt: daysAgo(5),
  });
  await StatusLog.create({ complaint: c12._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',           timestamp: daysAgo(20) });
  await StatusLog.create({ complaint: c12._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offA._id, note: 'Anti-ragging committee notified', timestamp: daysAgo(19) });
  await StatusLog.create({ complaint: c12._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offA._id, note: 'Inquiry initiated',             timestamp: daysAgo(16) });
  await StatusLog.create({ complaint: c12._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offA._id, note: 'Action taken; warning issued',  timestamp: daysAgo(5) });

  // ── Resolved ─────────────────────────────────────────────────────────
  const c13 = await makeComplaint({
    title: 'Computer lab PCs extremely slow — taking 10 minutes to boot',
    description: 'All 30 PCs in Lab 2 of the Computer Centre take over 10 minutes to boot and frequently freeze during use. This severely impacts practical sessions. The lab is used for 6 hours daily. Issue has persisted for over 3 weeks.',
    category: catIT, priority: 'Medium', filedBy: staff1, assignedTo: offIT,
    status: 'Resolved', resolutionNotes: 'All 30 PCs formatted and reinstalled with a fresh OS image. RAM upgraded from 4 GB to 8 GB on 20 machines. Issue resolved.',
    resolvedAt: daysAgo(3), createdAt: daysAgo(20),
  });
  await StatusLog.create({ complaint: c13._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,      note: 'Complaint submitted',    timestamp: daysAgo(20) });
  await StatusLog.create({ complaint: c13._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offIT._id,  note: 'Lab survey scheduled',    timestamp: daysAgo(18) });
  await StatusLog.create({ complaint: c13._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offIT._id,  note: 'Formatting commenced',    timestamp: daysAgo(10) });
  await StatusLog.create({ complaint: c13._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offIT._id,  note: 'All machines operational', timestamp: daysAgo(3) });
  await Comment.create({ complaint: c13._id, author: staff1._id, text: 'The machines are working great now. Thanks!', isInternal: false, createdAt: daysAgo(2) });

  const c14 = await makeComplaint({
    title: 'Academic transcript not issued despite fee payment',
    description: 'I paid the transcript fee 6 weeks ago but the academic section has not issued my transcript. I need it urgently for a job application whose deadline is approaching. Multiple follow-up emails have gone unanswered.',
    category: catAcademic, priority: 'High', filedBy: s1, assignedTo: offA,
    status: 'Resolved', resolutionNotes: 'Transcript issued and dispatched by speed post on resolution date. Delay was due to a records backlog. Process improvement memo sent to section head.',
    resolvedAt: daysAgo(7), createdAt: daysAgo(30),
  });
  await StatusLog.create({ complaint: c14._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,     note: 'Complaint submitted',    timestamp: daysAgo(30) });
  await StatusLog.create({ complaint: c14._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offA._id,  note: 'Escalated to registrar', timestamp: daysAgo(28) });
  await StatusLog.create({ complaint: c14._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offA._id,  note: 'Records located',        timestamp: daysAgo(20) });
  await StatusLog.create({ complaint: c14._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offA._id,  note: 'Transcript dispatched',  timestamp: daysAgo(7) });

  // ── Closed with feedback ──────────────────────────────────────────────
  const c15 = await makeComplaint({
    title: 'Generator not starting during evening power cuts',
    description: 'The campus backup generator does not start during evening power outages, which occur 3-4 times a week. Students studying in the evening are left in complete darkness for 30-60 minutes each time. The generator was last serviced over a year ago.',
    category: catInfra, priority: 'Medium', filedBy: s2, assignedTo: offH,
    status: 'Closed', resolutionNotes: 'Generator serviced and a faulty fuel pump replaced. Emergency lighting also installed in all corridors. Generator tested successfully for 5 consecutive evenings.',
    resolvedAt: daysAgo(15), closedAt: daysAgo(14), createdAt: daysAgo(45),
  });
  await StatusLog.create({ complaint: c15._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',            timestamp: daysAgo(45) });
  await StatusLog.create({ complaint: c15._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offH._id, note: 'Maintenance team notified',       timestamp: daysAgo(43) });
  await StatusLog.create({ complaint: c15._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offH._id, note: 'Service engineer booked',         timestamp: daysAgo(35) });
  await StatusLog.create({ complaint: c15._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offH._id, note: 'Repair complete',                 timestamp: daysAgo(15) });
  await StatusLog.create({ complaint: c15._id, fromStatus: 'Resolved',     toStatus: 'Closed',       changedBy: s2._id,   note: 'Complainant verified and closed', timestamp: daysAgo(14) });
  await Feedback.create({ complaint: c15._id, rating: 4, comment: 'Took some time but the issue is properly fixed now.', givenBy: s2._id });

  const c16 = await makeComplaint({
    title: 'Result re-evaluation application form not available online',
    description: 'The result re-evaluation application form is not available on the student portal. Students who wish to apply for re-evaluation have no way to do so within the stipulated period. The deadline is in 5 days.',
    category: catAcademic, priority: 'High', filedBy: s1, assignedTo: offA,
    status: 'Closed', resolutionNotes: 'Form uploaded to portal within 24 hours of complaint. System admin updated the portal automation.',
    resolvedAt: daysAgo(25), closedAt: daysAgo(24), createdAt: daysAgo(40),
  });
  await StatusLog.create({ complaint: c16._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',            timestamp: daysAgo(40) });
  await StatusLog.create({ complaint: c16._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offA._id, note: 'Portal admin contacted',          timestamp: daysAgo(39) });
  await StatusLog.create({ complaint: c16._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offA._id, note: 'Form being uploaded',             timestamp: daysAgo(38) });
  await StatusLog.create({ complaint: c16._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offA._id, note: 'Form live on portal',             timestamp: daysAgo(25) });
  await StatusLog.create({ complaint: c16._id, fromStatus: 'Resolved',     toStatus: 'Closed',       changedBy: s1._id,   note: 'Complainant verified and closed', timestamp: daysAgo(24) });
  await Feedback.create({ complaint: c16._id, rating: 5, comment: 'Very fast resolution! Impressed.', givenBy: s1._id });

  const c17 = await makeComplaint({
    title: 'Library books on hold not released after 2-week wait',
    description: 'I placed a hold on "Computer Networks" by Tanenbaum 4 weeks ago. The library system shows it returned 2 weeks ago but it has still not been made available for my hold. I need the book for the ongoing semester project.',
    category: catLibrary, priority: 'Low', filedBy: staff1, assignedTo: offA,
    status: 'Closed', resolutionNotes: 'A misfiled return was identified. Book issued to the student directly.',
    resolvedAt: daysAgo(18), closedAt: daysAgo(17), createdAt: daysAgo(35),
  });
  await StatusLog.create({ complaint: c17._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',            timestamp: daysAgo(35) });
  await StatusLog.create({ complaint: c17._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offA._id, note: 'Library staff informed',          timestamp: daysAgo(33) });
  await StatusLog.create({ complaint: c17._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offA._id, note: 'Book traced in records',          timestamp: daysAgo(25) });
  await StatusLog.create({ complaint: c17._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offA._id, note: 'Book issued',                     timestamp: daysAgo(18) });
  await StatusLog.create({ complaint: c17._id, fromStatus: 'Resolved',     toStatus: 'Closed',       changedBy: staff1._id, note: 'Complainant verified',          timestamp: daysAgo(17) });
  await Feedback.create({ complaint: c17._id, rating: 3, comment: 'Resolved but took too long for a simple issue.', givenBy: staff1._id });

  // ── Reopened complaints ───────────────────────────────────────────────
  const c18 = await makeComplaint({
    title: 'Wi-Fi password changed without notice — devices not connecting',
    description: 'The hostel Wi-Fi password was changed without any prior notice. Students have been unable to connect for 3 days. A notice was posted only on the physical notice board which is not regularly checked.',
    category: catIT, priority: 'Medium', filedBy: s1, assignedTo: offIT,
    status: 'In Progress', reopenCount: 1, createdAt: daysAgo(25),
  });
  await StatusLog.create({ complaint: c18._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,      note: 'Complaint submitted',                            timestamp: daysAgo(25) });
  await StatusLog.create({ complaint: c18._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offIT._id,  note: 'New password shared via student portal',         timestamp: daysAgo(24) });
  await StatusLog.create({ complaint: c18._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offIT._id,  note: 'Communication policy being reviewed',            timestamp: daysAgo(23) });
  await StatusLog.create({ complaint: c18._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offIT._id,  note: 'Policy updated; email notification enabled',     timestamp: daysAgo(18) });
  await StatusLog.create({ complaint: c18._id, fromStatus: 'Resolved',     toStatus: 'In Progress',  changedBy: s1._id,     note: 'Reopened by complainant: Password changed again without notice after 5 days.', timestamp: daysAgo(12) });
  await Comment.create({ complaint: c18._id, author: s1._id, text: 'Password was changed again without notice. This is a recurring issue.', isInternal: false, createdAt: daysAgo(12) });
  await Comment.create({ complaint: c18._id, author: offIT._id, text: 'Escalated to network admin. Auto-notification system being implemented.', isInternal: true, createdAt: daysAgo(11) });

  const c19 = await makeComplaint({
    title: 'ATM on campus not dispensing cash — machine error',
    description: 'The only ATM on campus has been showing "Unable to dispense cash" for 4 days. Students living on campus do not have easy access to off-campus ATMs. The bank helpline number on the ATM does not connect.',
    category: catOther, priority: 'Medium', filedBy: s2, assignedTo: offH,
    status: 'In Progress', reopenCount: 1, createdAt: daysAgo(30),
  });
  await StatusLog.create({ complaint: c19._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',             timestamp: daysAgo(30) });
  await StatusLog.create({ complaint: c19._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offH._id, note: 'Bank branch contacted',           timestamp: daysAgo(29) });
  await StatusLog.create({ complaint: c19._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offH._id, note: 'Bank technician scheduled',       timestamp: daysAgo(28) });
  await StatusLog.create({ complaint: c19._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offH._id, note: 'Machine replenished by bank',      timestamp: daysAgo(22) });
  await StatusLog.create({ complaint: c19._id, fromStatus: 'Resolved',     toStatus: 'In Progress',  changedBy: s2._id,   note: 'Reopened by complainant: Machine stopped working again within 24 hours.', timestamp: daysAgo(21) });

  // ── More Closed (with feedback) ───────────────────────────────────────
  const c20 = await makeComplaint({
    title: 'Exam hall ventilation fans not working during summer exams',
    description: 'All fans in Examination Hall Block were non-functional during the summer semester exams. Temperature exceeded 40°C. Multiple students felt unwell. Invigilators confirmed the issue but said maintenance was already informed with no results.',
    category: catInfra, priority: 'High', filedBy: s1, assignedTo: offH,
    status: 'Closed', resolutionNotes: 'All fans in examination block repaired. Faulty wiring replaced. Portable air coolers deployed as backup.',
    resolvedAt: daysAgo(40), closedAt: daysAgo(38), createdAt: daysAgo(55),
  });
  await StatusLog.create({ complaint: c20._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',            timestamp: daysAgo(55) });
  await StatusLog.create({ complaint: c20._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offH._id, note: 'Emergency maintenance ordered',  timestamp: daysAgo(54) });
  await StatusLog.create({ complaint: c20._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offH._id, note: 'Electrician team on site',        timestamp: daysAgo(52) });
  await StatusLog.create({ complaint: c20._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offH._id, note: 'All fans operational',           timestamp: daysAgo(40) });
  await StatusLog.create({ complaint: c20._id, fromStatus: 'Resolved',     toStatus: 'Closed',       changedBy: s1._id,  note: 'Complainant verified',           timestamp: daysAgo(38) });
  await Feedback.create({ complaint: c20._id, rating: 2, comment: 'Took way too long. Should have been fixed before exams started.', givenBy: s1._id });

  const c21 = await makeComplaint({
    title: 'Photocopy machine in library always out of service',
    description: 'The only photocopy machine available to students in the library is consistently out of service, often for 2-3 days at a stretch. Students are forced to travel off campus for photocopying study material. This is a recurring issue.',
    category: catLibrary, priority: 'Low', filedBy: staff1, assignedTo: offA,
    status: 'Closed', resolutionNotes: 'Machine repaired by vendor. Annual maintenance contract renewed with a 4-hour SLA for breakdowns.',
    resolvedAt: daysAgo(50), closedAt: daysAgo(48), createdAt: daysAgo(60),
  });
  await StatusLog.create({ complaint: c21._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,      note: 'Complaint submitted',            timestamp: daysAgo(60) });
  await StatusLog.create({ complaint: c21._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offA._id,   note: 'Vendor contacted',               timestamp: daysAgo(58) });
  await StatusLog.create({ complaint: c21._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offA._id,   note: 'Repair parts ordered',           timestamp: daysAgo(55) });
  await StatusLog.create({ complaint: c21._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offA._id,   note: 'Machine repaired and tested',    timestamp: daysAgo(50) });
  await StatusLog.create({ complaint: c21._id, fromStatus: 'Resolved',     toStatus: 'Closed',       changedBy: staff1._id, note: 'Complainant verified',           timestamp: daysAgo(48) });
  await Feedback.create({ complaint: c21._id, rating: 4, comment: 'Good — finally fixed permanently.', givenBy: staff1._id });

  // ── Additional variety complaints ─────────────────────────────────────
  const c22 = await makeComplaint({
    title: 'Noise disturbance from construction near examination centre',
    description: 'Active construction work adjacent to the examination centre is causing extreme noise pollution during ongoing mid-semester examinations. Students are unable to concentrate. The construction was supposed to halt during exam periods as per college policy.',
    category: catOther, priority: 'High', filedBy: s2, createdAt: daysAgo(4),
  });
  await StatusLog.create({ complaint: c22._id, fromStatus: null, toStatus: 'Submitted', changedBy: null, note: 'Complaint submitted', timestamp: daysAgo(4) });

  const c23 = await makeComplaint({
    title: 'Scholarship portal showing incorrect bank account details',
    description: 'The scholarship portal is displaying incorrect bank account details for my profile. The account number linked is not mine. I am concerned about scholarship disbursement going to the wrong account. The portal does not allow self-correction.',
    category: catAcademic, priority: 'High', filedBy: s1, assignedTo: offA,
    status: 'Acknowledged', createdAt: daysAgo(5),
  });
  await StatusLog.create({ complaint: c23._id, fromStatus: null,        toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',          timestamp: daysAgo(5) });
  await StatusLog.create({ complaint: c23._id, fromStatus: 'Submitted', toStatus: 'Acknowledged', changedBy: offA._id, note: 'Portal admin will verify data', timestamp: daysAgo(4) });

  const c24 = await makeComplaint({
    title: 'Hostel room light and fan switch panel sparking dangerously',
    description: 'The switch panel in my hostel room (Block D, Room 118) sparks visibly when lights or fans are switched on. There is a burning smell near the panel. This is a serious electrical and fire hazard. I have vacated the room temporarily as a precaution.',
    category: catHostel, priority: 'High', filedBy: s2, assignedTo: offH,
    status: 'In Progress', createdAt: daysAgo(3),
  });
  await StatusLog.create({ complaint: c24._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,    note: 'Complaint submitted',              timestamp: daysAgo(3) });
  await StatusLog.create({ complaint: c24._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offH._id, note: 'Electrician dispatched urgently',   timestamp: daysAgo(2) });
  await StatusLog.create({ complaint: c24._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offH._id, note: 'Panel isolated; rewiring in progress', timestamp: daysAgo(1) });
  await Comment.create({ complaint: c24._id, author: offH._id, text: 'Fire safety officer inspected. Old wiring — full block rewiring authorized.', isInternal: true, createdAt: daysAgo(1) });
  await Comment.create({ complaint: c24._id, author: s2._id, text: 'When can I return to my room?', isInternal: false, createdAt: new Date() });

  const c25 = await makeComplaint({
    title: 'Online exam submission portal crashing at deadline',
    description: 'The online exam submission portal crashed for approximately 45 minutes during the submission deadline window for the database management end-semester practical exam. Several students could not submit on time and are at risk of receiving zero marks.',
    category: catIT, priority: 'High', filedBy: staff1, assignedTo: offIT,
    status: 'Resolved',
    resolutionNotes: 'Server capacity issue identified and resolved. Exam controller granted a 2-hour grace period to all affected students. Submissions re-enabled and all work accepted.',
    resolvedAt: daysAgo(2), createdAt: daysAgo(15),
  });
  await StatusLog.create({ complaint: c25._id, fromStatus: null,           toStatus: 'Submitted',    changedBy: null,      note: 'Complaint submitted',         timestamp: daysAgo(15) });
  await StatusLog.create({ complaint: c25._id, fromStatus: 'Submitted',    toStatus: 'Acknowledged', changedBy: offIT._id,  note: 'Server logs being reviewed',  timestamp: daysAgo(14) });
  await StatusLog.create({ complaint: c25._id, fromStatus: 'Acknowledged', toStatus: 'In Progress',  changedBy: offIT._id,  note: 'Hotfix deploying',            timestamp: daysAgo(13) });
  await StatusLog.create({ complaint: c25._id, fromStatus: 'In Progress',  toStatus: 'Resolved',     changedBy: offIT._id,  note: 'Portal stable, grace given',  timestamp: daysAgo(2) });

  console.log(`Seeded ${codeSeq - 1} complaints.`);
  await printSummary();
}

async function printSummary() {
  console.log('\n───────────────────────────────────────────────────────');
  console.log('  Campus Grievance System — Demo Credentials');
  console.log('───────────────────────────────────────────────────────');
  console.log('  All passwords: Password@123\n');
  console.log('  Role       Email');
  console.log('  ────────   ──────────────────────────────');
  console.log('  admin      admin@campus.edu');
  console.log('  officer    officer.hostel@campus.edu   (Hostel Administration)');
  console.log('  officer    officer.academic@campus.edu (Academic Section)');
  console.log('  officer    officer.it@campus.edu       (Computer Centre)');
  console.log('  student    student1@campus.edu');
  console.log('  student    student2@campus.edu');
  console.log('  staff      staff1@campus.edu');
  console.log('───────────────────────────────────────────────────────\n');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
