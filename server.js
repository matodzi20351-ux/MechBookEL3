/**
 * MechBook EL — Full Backend
 * Stack : Express · bcryptjs · jsonwebtoken
 * File  : server.js
 *
 * Run   : node server.js
 * URL   : http://localhost:3000
 *
 * Endpoints:
 *   POST  /api/register
 *   POST  /api/login
 *   GET   /api/me                      (auth)
 *   POST  /api/bookings                (auth – owner)
 *   GET   /api/bookings/mine           (auth – owner)
 *   GET   /api/bookings/workshop       (auth – mechanic)
 *   PATCH /api/bookings/:ref/status    (auth – mechanic)
 *   GET   /api/notifications           (auth)
 *   PATCH /api/notifications/read      (auth)
 *   GET   /api/users                   (dev – no auth)
 */

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app    = express();
const PORT   = 3000;
const DB     = path.join(__dirname, 'db.json');
const SECRET = 'mechbook_el_jwt_secret_2026';

/* ─── middleware ─── */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));   // serves all HTML/CSS/JS from same folder

/* ─── db helpers ─── */
function readDB() {
  if (!fs.existsSync(DB))
    fs.writeFileSync(DB, JSON.stringify({ users:[], bookings:[], notifications:[] }, null, 2));
  const raw = JSON.parse(fs.readFileSync(DB, 'utf8'));
  if (!raw.bookings)      raw.bookings      = [];
  if (!raw.notifications) raw.notifications = [];
  return raw;
}
function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

/* ─── auth middleware ─── */
function auth(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try   { req.user = jwt.verify(token, SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token.' }); }
}

/* ══════════════════════════════════════
   POST /api/register
══════════════════════════════════════ */
app.post('/api/register', async (req, res) => {
  const { fname, lname, email, phone, password, role, wsname } = req.body;

  if (!fname || fname.trim().length < 2)
    return res.status(400).json({ field:'fname', error:'First name must be at least 2 characters.' });
  if (!lname || lname.trim().length < 2)
    return res.status(400).json({ field:'lname', error:'Last name must be at least 2 characters.' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ field:'email', error:'Please enter a valid email address.' });
  if (!phone || !/^(\+27|0)[6-8][0-9]{8}$/.test(phone.replace(/\s/g,'')))
    return res.status(400).json({ field:'phone', error:'Enter a valid South African phone number.' });
  if (!password || password.length < 8)
    return res.status(400).json({ field:'password', error:'Password must be at least 8 characters.' });
  if (!['owner','mechanic'].includes(role))
    return res.status(400).json({ field:'role', error:'Invalid account type.' });
  if (role === 'mechanic' && (!wsname || wsname.trim().length < 2))
    return res.status(400).json({ field:'wsname', error:'Workshop name is required for mechanics.' });

  const db = readDB();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()))
    return res.status(409).json({ field:'email', error:'An account with this email already exists.' });

  const hash  = await bcrypt.hash(password, 12);
  const wsTrimmed = role === 'mechanic' ? wsname.trim() : null;
  const user  = {
    id:        Date.now().toString(),
    fname:     fname.trim(),
    lname:     lname.trim(),
    fullname:  `${fname.trim()} ${lname.trim()}`,
    email:     email.toLowerCase().trim(),
    phone:     phone.trim(),
    role,
    wsname:    wsTrimmed,
    wskey:     wsTrimmed ? wsTrimmed.replace(/[^a-z0-9]/gi,'').toLowerCase() : null,
    password:  hash,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDB(db);

  const token = jwt.sign({ id:user.id, email:user.email, role:user.role }, SECRET, { expiresIn:'7d' });
  const { password:_, ...safe } = user;
  return res.status(201).json({ message:'Account created successfully.', token, user:safe });
});

/* ══════════════════════════════════════
   POST /api/login
══════════════════════════════════════ */
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password)
    return res.status(400).json({ error:'Email and password are required.' });

  const db   = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user)
    return res.status(401).json({ field:'email', error:'No account found with that email address.' });

  if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ field:'password', error:'Incorrect password. Please try again.' });

  if (role && user.role !== role)
    return res.status(401).json({
      field: 'role',
      error: `This account is registered as a ${user.role === 'mechanic' ? 'Workshop Owner' : 'Car Owner'}, not a ${role === 'mechanic' ? 'Mechanic' : 'Car Owner'}.`
    });

  const token = jwt.sign({ id:user.id, email:user.email, role:user.role }, SECRET, { expiresIn:'7d' });
  const { password:_, ...safe } = user;
  return res.status(200).json({ message:'Login successful.', token, user:safe });
});

/* ══════════════════════════════════════
   GET /api/me
══════════════════════════════════════ */
app.get('/api/me', auth, (req, res) => {
  const db   = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error:'User not found.' });
  const { password:_, ...safe } = user;
  return res.json({ user: safe });
});

/* ══════════════════════════════════════
   POST /api/bookings   (car owner creates)
══════════════════════════════════════ */
app.post('/api/bookings', auth, (req, res) => {
  if (req.user.role !== 'owner')
    return res.status(403).json({ error:'Only car owners can create bookings.' });

  const { fname, lname, phone, email, make, model, year, rego,
          service, desc, workshop, date, time } = req.body;

  if (!fname||!lname||!phone||!email||!make||!model||!service||!workshop||!date||!time)
    return res.status(400).json({ error:'Missing required booking fields.' });

  const db     = readDB();
  const ref    = 'MCH-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
  const wsKey  = workshop.replace(/[^a-z0-9]/gi,'').toLowerCase();
  const wsOwner= db.users.find(u => u.role === 'mechanic' && u.wskey === wsKey);

  const booking = {
    ref,
    ownerId:    req.user.id,
    ownerName:  `${fname} ${lname}`,
    ownerEmail: email,
    ownerPhone: phone,
    vehicle:    [make, model, year].filter(Boolean).join(' ') + (rego ? ' · ' + rego : ''),
    service,
    desc:       desc || '',
    workshop,
    wsKey,
    date,
    time,
    status:     'Pending',
    feedback:   '',
    bookedAt:   new Date().toISOString()
  };
  db.bookings.push(booking);

  /* notify car owner */
  db.notifications.push({
    id:        `${Date.now()}_o`,
    userId:    req.user.id,
    icon:      '📅',
    title:     'Booking Submitted',
    msg:       `Your request for ${service} at ${workshop} on ${date} at ${time} is pending confirmation. Ref: ${ref}`,
    time:      new Date().toLocaleString('en-GB'),
    ref,
    read:      false,
    createdAt: new Date().toISOString()
  });

  /* notify workshop owner if they have an account */
  if (wsOwner) {
    db.notifications.push({
      id:        `${Date.now()}_m`,
      userId:    wsOwner.id,
      icon:      '🆕',
      title:     'New Booking Request',
      msg:       `${fname} ${lname} requested ${service} for a ${make} ${model} on ${date} at ${time}. Ref: ${ref}`,
      time:      new Date().toLocaleString('en-GB'),
      ref,
      read:      false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  return res.status(201).json({ message:'Booking created.', booking });
});

/* ══════════════════════════════════════
   GET /api/bookings/mine  (car owner)
══════════════════════════════════════ */
app.get('/api/bookings/mine', auth, (req, res) => {
  const db = readDB();
  return res.json({ bookings: db.bookings.filter(b => b.ownerId === req.user.id) });
});

/* ══════════════════════════════════════
   GET /api/bookings/workshop  (mechanic)
══════════════════════════════════════ */
app.get('/api/bookings/workshop', auth, (req, res) => {
  if (req.user.role !== 'mechanic')
    return res.status(403).json({ error:'Only workshop owners can access this.' });

  const db   = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user || !user.wskey)
    return res.status(400).json({ error:'No workshop found for this account.' });

  return res.json({ bookings: db.bookings.filter(b => b.wsKey === user.wskey) });
});

/* ══════════════════════════════════════
   PATCH /api/bookings/:ref/status  (mechanic)
══════════════════════════════════════ */
app.patch('/api/bookings/:ref/status', auth, (req, res) => {
  if (req.user.role !== 'mechanic')
    return res.status(403).json({ error:'Only workshop owners can update booking status.' });

  const { status, feedback } = req.body;
  const validStatuses = ['Confirmed','Declined','In Progress','Completed'];
  if (!validStatuses.includes(status))
    return res.status(400).json({ error:`Status must be one of: ${validStatuses.join(', ')}` });

  const db  = readDB();
  const idx = db.bookings.findIndex(b => b.ref === req.params.ref);
  if (idx === -1) return res.status(404).json({ error:'Booking not found.' });

  const meUser  = db.users.find(u => u.id === req.user.id);
  const booking = db.bookings[idx];

  if (!meUser || meUser.wskey !== booking.wsKey)
    return res.status(403).json({ error:'You do not manage this workshop.' });

  db.bookings[idx].status    = status;
  db.bookings[idx].feedback  = feedback || '';
  db.bookings[idx].updatedAt = new Date().toISOString();

  const notifContent = {
    'Confirmed':   { icon:'✅', title:'Booking Confirmed!',         msg:`${booking.workshop} confirmed your booking on ${booking.date} at ${booking.time}. Ref: ${booking.ref}` },
    'Declined':    { icon:'❌', title:'Booking Declined',            msg:`${booking.workshop} could not take your booking on ${booking.date}.${feedback?' Note: '+feedback:''} Ref: ${booking.ref}` },
    'In Progress': { icon:'🔧', title:'Your Car is Being Worked On', msg:`Your ${booking.vehicle} is now being serviced at ${booking.workshop}. Ref: ${booking.ref}` },
    'Completed':   { icon:'🏁', title:'Service Complete!',           msg:`Your vehicle is ready at ${booking.workshop}.${feedback?' Mechanic note: '+feedback:''} Ref: ${booking.ref}` }
  };

  const nc = notifContent[status];
  if (nc) {
    db.notifications.push({
      id:        Date.now().toString(),
      userId:    booking.ownerId,
      icon:      nc.icon,
      title:     nc.title,
      msg:       nc.msg,
      time:      new Date().toLocaleString('en-GB'),
      ref:       booking.ref,
      read:      false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  return res.json({ message:`Booking updated to ${status}.`, booking: db.bookings[idx] });
});

/* ══════════════════════════════════════
   GET /api/notifications
══════════════════════════════════════ */
app.get('/api/notifications', auth, (req, res) => {
  const db = readDB();
  const notifs = db.notifications
    .filter(n => n.userId === req.user.id)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ notifications: notifs });
});

/* ══════════════════════════════════════
   PATCH /api/notifications/read
══════════════════════════════════════ */
app.patch('/api/notifications/read', auth, (req, res) => {
  const db = readDB();
  db.notifications = db.notifications.map(n =>
    n.userId === req.user.id ? { ...n, read: true } : n
  );
  writeDB(db);
  return res.json({ message:'All notifications marked as read.' });
});

/* ══════════════════════════════════════
   GET /api/users  (dev only)
══════════════════════════════════════ */
app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users.map(({ password:_, ...u }) => u));
});

/* ─── start ─── */
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   MechBook EL  ·  Backend Server    ║
║   http://localhost:${PORT}              ║
╚══════════════════════════════════════╝

  POST  /api/register
  POST  /api/login
  GET   /api/me
  POST  /api/bookings
  GET   /api/bookings/mine
  GET   /api/bookings/workshop
  PATCH /api/bookings/:ref/status
  GET   /api/notifications
  PATCH /api/notifications/read
`);
});