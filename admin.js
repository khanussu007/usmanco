const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- MONGODB CACHED CONNECTION ---
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is missing.");
        return null;
    }
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI).then((mongoose) => mongoose);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

// --- MONGODB SCHEMAS (Must match index.js) ---
const bookingSchema = new mongoose.Schema({
    bookingId: { type: String, required: true, unique: true },
    name: String, phone: String, email: String, company: String,
    service: String, date: String, time: String, budget: String,
    message: String, status: { type: String, default: 'New' },
    utm_source: String, utm_medium: String, utm_campaign: String,
    landingPage: String, referrer: String
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
    name: String, email: String, phone: String, service: String, source: String
}, { timestamps: true });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

// --- AUTH MIDDLEWARE ---
const JWT_SECRET = process.env.SESSION_SECRET || 'fallback_secret_do_not_use_in_prod';

function verifyToken(req) {
    const token = req.cookies.admin_token;
    if (!token) return false;
    try {
        jwt.verify(token, JWT_SECRET);
        return true;
    } catch(e) {
        return false;
    }
}

const requireAuth = (req, res, next) => {
    if (verifyToken(req)) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- ADMIN API ROUTES ---
app.post('/admin/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '8h' });
        res.cookie('admin_token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 8*60*60*1000 });
        res.status(200).json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/admin/api/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.status(200).json({ success: true });
});

app.get('/admin/api/stats', requireAuth, async (req, res) => {
    try {
        await connectDB();
        const totalBookings = await Booking.countDocuments();
        const newBookings = await Booking.countDocuments({ status: 'New' });
        const totalLeads = await Lead.countDocuments();
        res.json({ totalBookings, newBookings, totalLeads });
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

app.get('/admin/api/bookings', requireAuth, async (req, res) => {
    try {
        await connectDB();
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

app.patch('/admin/api/bookings/:id', requireAuth, async (req, res) => {
    try {
        await connectDB();
        await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

app.delete('/admin/api/bookings/:id', requireAuth, async (req, res) => {
    try {
        await connectDB();
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

app.get('/admin/api/leads', requireAuth, async (req, res) => {
    try {
        await connectDB();
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

// --- ADMIN UI RENDERER ---
app.get('/admin', (req, res) => {
    if (!verifyToken(req)) {
        return res.send(generateLoginHTML());
    }
    res.send(generateDashboardHTML());
});

// --- HTML STRINGS ---
function generateLoginHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - usmanco</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        body { background: #f2f7fb; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .clay-card {
            background: #ffffff; border-radius: 24px; padding: 40px; width: 100%; max-width: 400px;
            box-shadow: 12px 12px 24px #dce5ef, -12px -12px 24px #ffffff; position: relative;
        }
        .clay-card::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 24px; box-shadow: inset 4px 4px 8px rgba(255,255,255,0.7), inset -4px -4px 8px rgba(0,0,0,0.05); z-index: -1;
        }
        h2 { text-align: center; color: #4c1d95; margin-bottom: 30px; }
        input {
            width: 100%; padding: 16px; margin-bottom: 20px; border-radius: 16px; border: none;
            background: #f2f7fb; box-shadow: inset 6px 6px 12px #dce5ef, inset -6px -6px 12px #ffffff;
            font-family: inherit; font-size: 14px; outline: none; box-sizing: border-box;
        }
        button {
            width: 100%; padding: 16px; border-radius: 16px; border: none;
            background: linear-gradient(135deg, #6d28d9, #2563eb); color: white;
            font-weight: 600; cursor: pointer; box-shadow: 6px 6px 16px rgba(37,99,235,0.3);
            transition: transform 0.2s;
        }
        button:hover { transform: translateY(-2px); }
        .error { color: #ef4444; text-align: center; font-size: 14px; margin-bottom: 15px; display: none; }
    </style>
</head>
<body>
    <div class="clay-card">
        <h2>usmanco Admin</h2>
        <div id="error" class="error">Invalid credentials</div>
        <form id="loginForm">
            <input type="text" name="username" placeholder="Admin Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            const res = await fetch('/admin/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) window.location.reload();
            else document.getElementById('error').style.display = 'block';
        });
    </script>
</body>
</html>`;
}

function generateDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - usmanco</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <style>
        :root { --bg: #f2f7fb; --primary: #4c1d95; --text: #1e293b; --clay-shadow: 8px 8px 16px #dce5ef, -8px -8px 16px #ffffff; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); display: flex; height: 100vh; overflow: hidden; }
        
        /* Sidebar */
        .sidebar { width: 250px; background: #ffffff; padding: 30px 20px; box-shadow: 4px 0 10px rgba(0,0,0,0.02); z-index: 10; display: flex; flex-direction: column; }
        .logo { font-weight: 700; font-size: 24px; color: var(--primary); margin-bottom: 40px; text-align: center; }
        .nav-item { padding: 15px; margin-bottom: 10px; border-radius: 12px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 10px; font-weight: 500; }
        .nav-item:hover, .nav-item.active { background: var(--bg); color: var(--primary); box-shadow: inset 2px 2px 5px #dce5ef, inset -2px -2px 5px #ffffff; }
        .logout { margin-top: auto; color: #ef4444; }

        /* Main Content */
        .main { flex: 1; padding: 40px; overflow-y: auto; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        
        /* Stats */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #ffffff; padding: 25px; border-radius: 20px; box-shadow: var(--clay-shadow); text-align: center; }
        .stat-val { font-size: 32px; font-weight: 700; color: var(--primary); margin-top: 10px; }
        
        /* Tables */
        .table-container { background: #ffffff; border-radius: 20px; padding: 20px; box-shadow: var(--clay-shadow); overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th, td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        th { color: #64748b; font-weight: 500; }
        select { padding: 5px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; }
        .btn-delete { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
        
        .view-section { display: none; }
        .view-section.active { display: block; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="logo">usmanco</div>
        <div class="nav-item active" onclick="switchTab('dashboard')"><i class="ph ph-squares-four"></i> Dashboard</div>
        <div class="nav-item" onclick="switchTab('bookings')"><i class="ph ph-calendar-check"></i> Bookings</div>
        <div class="nav-item" onclick="switchTab('leads')"><i class="ph ph-users"></i> Leads</div>
        <div class="nav-item logout" onclick="logout()"><i class="ph ph-sign-out"></i> Logout</div>
    </div>

    <div class="main">
        <div id="dashboard" class="view-section active">
            <div class="header"><h2>Overview</h2></div>
            <div class="stats-grid">
                <div class="stat-card"><div>Total Bookings</div><div class="stat-val" id="statTotal">0</div></div>
                <div class="stat-card"><div>New Bookings</div><div class="stat-val" id="statNew">0</div></div>
                <div class="stat-card"><div>Total Leads</div><div class="stat-val" id="statLeads">0</div></div>
            </div>
            <h3>Recent Bookings</h3>
            <div class="table-container" style="margin-top: 20px;">
                <table>
                    <thead><tr><th>ID</th><th>Name</th><th>Service</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody id="recentTbody"></tbody>
                </table>
            </div>
        </div>

        <div id="bookings" class="view-section">
            <div class="header"><h2>All Bookings</h2></div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Ref ID</th><th>Client</th><th>Contact</th><th>Service</th><th>Pref. Date/Time</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody id="bookingsTbody"></tbody>
                </table>
            </div>
        </div>

        <div id="leads" class="view-section">
            <div class="header"><h2>Leads</h2></div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Service</th><th>Source</th><th>Date</th></tr></thead>
                    <tbody id="leadsTbody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        function switchTab(tabId) {
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            event.currentTarget.classList.add('active');
        }

        async function logout() {
            await fetch('/admin/api/logout', { method: 'POST' });
            window.location.reload();
        }

        async function loadData() {
            // Load Stats
            const statsRes = await fetch('/admin/api/stats');
            const stats = await statsRes.json();
            document.getElementById('statTotal').innerText = stats.totalBookings || 0;
            document.getElementById('statNew').innerText = stats.newBookings || 0;
            document.getElementById('statLeads').innerText = stats.totalLeads || 0;

            // Load Bookings
            const bookRes = await fetch('/admin/api/bookings');
            const bookings = await bookRes.json();
            
            const bHtml = bookings.map(b => {
                const tr = document.createElement('tr');
                tr.innerHTML = \`
                    <td><strong>\${b.bookingId}</strong></td>
                    <td>\${b.name}<br><small style="color:#64748b">\${b.company || ''}</small></td>
                    <td>\${b.phone}<br>\${b.email}</td>
                    <td>\${b.service}</td>
                    <td>\${b.date} at \${b.time}</td>
                    <td>
                        <select onchange="updateStatus('\${b._id}', this.value)">
                            <option \${b.status==='New'?'selected':''}>New</option>
                            <option \${b.status==='Contacted'?'selected':''}>Contacted</option>
                            <option \${b.status==='Confirmed'?'selected':''}>Confirmed</option>
                            <option \${b.status==='Completed'?'selected':''}>Completed</option>
                            <option \${b.status==='Cancelled'?'selected':''}>Cancelled</option>
                        </select>
                    </td>
                    <td><button class="btn-delete" onclick="deleteBooking('\${b._id}')"><i class="ph ph-trash"></i></button></td>
                \`;
                return tr.outerHTML;
            }).join('');
            document.getElementById('bookingsTbody').innerHTML = bHtml;
            
            // Recent Bookings (First 5)
            const rHtml = bookings.slice(0, 5).map(b => {
                return \`<tr><td>\${b.bookingId}</td><td>\${b.name}</td><td>\${b.service}</td><td>\${b.date}</td><td>\${b.status}</td></tr>\`;
            }).join('');
            document.getElementById('recentTbody').innerHTML = rHtml;

            // Load Leads
            const leadsRes = await fetch('/admin/api/leads');
            const leads = await leadsRes.json();
            const lHtml = leads.map(l => {
                return \`<tr><td>\${l.name}</td><td>\${l.email}</td><td>\${l.phone}</td><td>\${l.service || '-'}</td><td>\${l.source}</td><td>\${new Date(l.createdAt).toLocaleDateString()}</td></tr>\`;
            }).join('');
            document.getElementById('leadsTbody').innerHTML = lHtml;
        }

        async function updateStatus(id, status) {
            await fetch('/admin/api/bookings/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            loadData();
        }

        async function deleteBooking(id) {
            if(confirm('Delete this booking?')) {
                await fetch('/admin/api/bookings/' + id, { method: 'DELETE' });
                loadData();
            }
        }

        window.onload = loadData;
    </script>
</body>
</html>`;
}

module.exports = app;
