const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MONGODB CACHED CONNECTION (Vercel Serverless Ready) ---
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

// --- MONGODB SCHEMAS ---
const bookingSchema = new mongoose.Schema({
    bookingId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    company: String,
    service: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    budget: String,
    message: String,
    status: { type: String, default: 'New' },
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    utm_term: String,
    utm_content: String,
    landingPage: String,
    referrer: String
}, { timestamps: true });

const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    message: String
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    service: String,
    source: String,
    utm_source: String,
    utm_medium: String,
    utm_campaign: String
}, { timestamps: true });

// Check to prevent model overwrite errors in hot-reloading
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

// --- TRACKING INJECTION ---
function getTrackingScripts() {
    let scripts = '';
    if (process.env.META_PIXEL_ID) {
        scripts += `
        <!-- Meta Pixel Code -->
        <script>
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${process.env.META_PIXEL_ID}');
        fbq('track', 'PageView');
        </script>`;
    }
    if (process.env.GOOGLE_ANALYTICS_ID) {
        scripts += `
        <!-- Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=${process.env.GOOGLE_ANALYTICS_ID}"></script>
        <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${process.env.GOOGLE_ANALYTICS_ID}');
        </script>`;
    }
    return scripts;
}

// --- API ROUTES ---
app.post('/api/bookings', async (req, res) => {
    try {
        const db = await connectDB();
        if (!db) return res.status(503).json({ error: 'Database unavailable.' });

        const bookingId = 'USM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const newBooking = new Booking({
            bookingId,
            ...req.body
        });

        await newBooking.save();
        
        // Also capture as Lead
        await Lead.create({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            service: req.body.service,
            source: 'Booking Form',
            utm_source: req.body.utm_source,
            utm_medium: req.body.utm_medium,
            utm_campaign: req.body.utm_campaign
        });

        res.status(200).json({ success: true, bookingId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit booking.' });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const db = await connectDB();
        if (!db) return res.status(503).json({ error: 'Database unavailable.' });
        await Contact.create(req.body);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message.' });
    }
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// --- PUBLIC WEBSITE GENERATION ---
app.get('/', (req, res) => {
    res.send(generatePublicHTML());
});

function generatePublicHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>usmanco — Website Design, Meta Ads & Google Ads in Vapi</title>
    <meta name="description" content="usmanco provides premium digital growth services including Website Design, Meta Ads, Google Ads, and Lead Generation in Vapi, Gujarat, India. Book a free consultation today.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    ${getTrackingScripts()}
    <style>
        :root {
            --bg-color: #f2f7fb;
            --text-main: #1e293b;
            --text-light: #64748b;
            --primary: #4c1d95;
            --primary-light: #6d28d9;
            --secondary: #2563eb;
            --accent: #ec4899;
            --white: #ffffff;
            
            /* Claymorphism shadows */
            --clay-shadow: 12px 12px 24px #dce5ef, -12px -12px 24px #ffffff;
            --clay-inset: inset 4px 4px 8px rgba(255,255,255,0.7), inset -4px -4px 8px rgba(0,0,0,0.05);
            --btn-shadow: 6px 6px 12px #dce5ef, -6px -6px 12px #ffffff, inset 2px 2px 4px rgba(255,255,255,0.4);
            --btn-hover: 4px 4px 8px #dce5ef, -4px -4px 8px #ffffff, inset 3px 3px 6px rgba(255,255,255,0.5);
            --input-shadow: inset 6px 6px 12px #dce5ef, inset -6px -6px 12px #ffffff;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
            overflow-x: hidden;
        }

        h1, h2, h3, h4, h5 { font-family: 'Poppins', sans-serif; font-weight: 700; line-height: 1.2; }

        /* Utilities */
        .container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
        .section { padding: 100px 0; }
        .text-center { text-align: center; }
        .gradient-text {
            background: linear-gradient(135deg, var(--primary), var(--secondary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Buttons */
        .clay-btn {
            display: inline-block;
            background: var(--bg-color);
            color: var(--primary);
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            padding: 14px 32px;
            border-radius: 50px;
            border: 2px solid transparent;
            box-shadow: var(--btn-shadow);
            cursor: pointer;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        .clay-btn:hover { box-shadow: var(--btn-hover); transform: translateY(-2px); }
        .clay-btn-primary {
            background: linear-gradient(135deg, var(--primary-light), var(--secondary));
            color: var(--white);
            border: none;
            box-shadow: 6px 6px 16px rgba(37,99,235,0.3), -6px -6px 16px rgba(255,255,255,0.8), inset 2px 2px 4px rgba(255,255,255,0.4);
        }
        .clay-btn-primary:hover {
            box-shadow: 4px 4px 10px rgba(37,99,235,0.4), -4px -4px 10px rgba(255,255,255,0.8), inset 2px 2px 4px rgba(255,255,255,0.5);
            transform: translateY(-2px);
        }
        .clay-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Cards */
        .clay-card {
            background: var(--bg-color);
            border-radius: 32px;
            padding: 40px;
            box-shadow: var(--clay-shadow);
            position: relative;
            z-index: 1;
            transition: transform 0.3s ease;
        }
        .clay-card::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 32px; box-shadow: var(--clay-inset); z-index: -1;
        }
        .clay-card:hover { transform: translateY(-10px); }

        /* Navbar */
        nav {
            position: fixed; top: 0; width: 100%; z-index: 1000;
            background: rgba(242, 247, 251, 0.85);
            backdrop-filter: blur(12px);
            padding: 20px 0;
            transition: all 0.3s ease;
        }
        .nav-container { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: var(--primary); text-decoration: none; }
        .nav-links { display: flex; gap: 32px; align-items: center; }
        .nav-links a { color: var(--text-main); text-decoration: none; font-weight: 500; transition: color 0.3s; }
        .nav-links a:hover { color: var(--secondary); }
        .mobile-menu-btn { display: none; font-size: 28px; cursor: pointer; color: var(--primary); }

        /* Hero Section */
        .hero { padding: 160px 0 100px; display: flex; align-items: center; justify-content: space-between; gap: 60px; }
        .hero-content { flex: 1; }
        .hero h1 { font-size: 56px; margin-bottom: 24px; }
        .hero p { font-size: 20px; color: var(--text-light); margin-bottom: 40px; max-width: 600px; }
        .hero-btns { display: flex; gap: 20px; }
        .hero-image { flex: 1; position: relative; }
        .hero-img-wrapper {
            border-radius: 40px; overflow: hidden;
            box-shadow: var(--clay-shadow);
            position: relative; z-index: 2;
        }
        .hero-img-wrapper img { width: 100%; display: block; }
        .hero-blob {
            position: absolute; width: 300px; height: 300px;
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            border-radius: 50%; filter: blur(80px); opacity: 0.3;
            z-index: 1; top: -50px; right: -50px;
            animation: float 6s infinite ease-in-out;
        }

        /* Services Grid */
        .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px; margin-top: 60px; }
        .service-icon {
            width: 70px; height: 70px; border-radius: 20px;
            background: var(--bg-color); box-shadow: var(--clay-shadow);
            display: flex; align-items: center; justify-content: center;
            font-size: 32px; color: var(--primary); margin-bottom: 24px;
        }

        /* Split Sections */
        .split-section { display: flex; align-items: center; gap: 60px; margin-bottom: 100px; }
        .split-section.reverse { flex-direction: row-reverse; }
        .split-content { flex: 1; }
        .split-image { flex: 1; position: relative; border-radius: 32px; box-shadow: var(--clay-shadow); overflow: hidden; padding: 20px; background: var(--bg-color); }
        .split-image img { width: 100%; border-radius: 20px; }

        /* Process Steps */
        .process-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; margin-top: 60px; }
        .process-step { text-align: center; position: relative; }
        .step-number { font-size: 48px; font-weight: 800; color: rgba(76, 29, 149, 0.1); position: absolute; top: -10px; right: 20px; z-index: -1; }

        /* Forms */
        .form-group { margin-bottom: 24px; text-align: left; }
        .form-group label { display: block; font-weight: 500; margin-bottom: 8px; font-size: 14px; }
        .clay-input, .clay-select, .clay-textarea {
            width: 100%; padding: 16px 24px; border-radius: 20px; border: none;
            background: var(--bg-color); box-shadow: var(--input-shadow);
            font-family: 'Inter', sans-serif; font-size: 16px; color: var(--text-main);
            outline: none; transition: box-shadow 0.3s;
        }
        .clay-input:focus, .clay-select:focus, .clay-textarea:focus { box-shadow: inset 8px 8px 16px #dce5ef, inset -8px -8px 16px #ffffff, 0 0 0 2px rgba(76, 29, 149, 0.2); }
        .clay-textarea { resize: vertical; min-height: 120px; }
        
        .form-row { display: flex; gap: 24px; }
        .form-row .form-group { flex: 1; }

        /* FAQ */
        .faq-item { margin-bottom: 20px; }
        .faq-question {
            background: var(--bg-color); box-shadow: var(--clay-shadow);
            padding: 20px 30px; border-radius: 20px; cursor: pointer;
            font-weight: 600; font-family: 'Poppins'; display: flex; justify-content: space-between; align-items: center;
        }
        .faq-answer { padding: 0 30px; max-height: 0; overflow: hidden; transition: max-height 0.3s ease; color: var(--text-light); }
        .faq-item.active .faq-answer { max-height: 200px; padding: 20px 30px; }

        /* Footer */
        footer { padding: 80px 0 40px; background: #e8f0f7; margin-top: 100px; box-shadow: inset 0 10px 20px rgba(0,0,0,0.02); }
        .footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; margin-bottom: 60px; }
        .footer-col h4 { margin-bottom: 24px; color: var(--primary); }
        .footer-col ul { list-style: none; }
        .footer-col ul li { margin-bottom: 12px; }
        .footer-col a { color: var(--text-light); text-decoration: none; transition: color 0.3s; }
        .footer-col a:hover { color: var(--primary); }

        /* Animations */
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
        .reveal { opacity: 0; transform: translateY(40px); transition: all 0.8s ease; }
        .reveal.active { opacity: 1; transform: translateY(0); }

        /* Loading Spinner */
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid var(--primary); border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; display: none; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Success State */
        .success-state { display: none; text-align: center; padding: 40px; }
        .success-icon { font-size: 64px; color: #10b981; margin-bottom: 20px; }
        .ref-box { background: var(--bg-color); box-shadow: var(--input-shadow); padding: 15px; border-radius: 12px; font-family: monospace; font-size: 18px; margin: 20px 0; font-weight: bold; color: var(--primary); }

        /* Responsive */
        @media (max-width: 1024px) {
            .hero h1 { font-size: 48px; }
            .process-grid { grid-template-columns: repeat(3, 1fr); }
            .split-section, .split-section.reverse { flex-direction: column; text-align: center; }
        }
        @media (max-width: 768px) {
            .nav-links {
                position: absolute; top: 100%; left: 0; width: 100%;
                background: var(--bg-color); flex-direction: column;
                padding: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.05);
                display: none;
            }
            .nav-links.active { display: flex; }
            .mobile-menu-btn { display: block; }
            .hero { flex-direction: column; text-align: center; padding-top: 120px; }
            .hero h1 { font-size: 36px; }
            .hero-btns { justify-content: center; }
            .process-grid { grid-template-columns: 1fr; }
            .form-row { flex-direction: column; gap: 0; }
        }
    </style>
</head>
<body>

    <!-- Navbar -->
    <nav>
        <div class="container nav-container">
            <a href="#" class="logo">usmanco</a>
            <div class="nav-links" id="navLinks">
                <a href="#services">Services</a>
                <a href="#process">Process</a>
                <a href="#work">Work</a>
                <a href="#faq">FAQ</a>
                <a href="#contact">Contact</a>
                <a href="#booking" class="clay-btn clay-btn-primary" style="padding: 10px 24px;">Book Consultation</a>
            </div>
            <i class="ph ph-list mobile-menu-btn" id="mobileBtn"></i>
        </div>
    </nav>

    <!-- Hero -->
    <section class="hero container reveal">
        <div class="hero-content">
            <p style="font-weight: 600; color: var(--primary); margin-bottom: 12px;">Vapi, Gujarat | Global Reach</p>
            <h1>Websites That Look Better. <br><span class="gradient-text">Ads That Bring Business.</span></h1>
            <p>usmanco helps businesses build their online presence, capture leads, and acquire customers through custom Website Design, Meta Ads, and Google Ads.</p>
            <div class="hero-btns">
                <a href="#booking" class="clay-btn clay-btn-primary">Book a Free Consultation</a>
                <a href="#services" class="clay-btn">View Services</a>
            </div>
        </div>
        <div class="hero-image">
            <div class="hero-blob"></div>
            <div class="hero-img-wrapper">
                <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80" alt="Digital Marketing and Website Design Analytics" loading="lazy">
            </div>
        </div>
    </section>

    <!-- Services -->
    <section id="services" class="section">
        <div class="container">
            <div class="text-center reveal">
                <h2>Our Digital Services</h2>
                <p style="color: var(--text-light); max-width: 600px; margin: 16px auto;">End-to-end digital growth solutions designed to maximize your return on investment.</p>
            </div>
            <div class="services-grid">
                <div class="clay-card reveal">
                    <div class="service-icon"><i class="ph ph-desktop"></i></div>
                    <h3>Website Design</h3>
                    <p style="margin-top: 12px; color: var(--text-light);">Premium, responsive websites that build trust and convert visitors into leads.</p>
                </div>
                <div class="clay-card reveal">
                    <div class="service-icon"><i class="ph ph-target"></i></div>
                    <h3>Meta Ads</h3>
                    <p style="margin-top: 12px; color: var(--text-light);">Facebook & Instagram ad campaigns focused on lead generation and precise targeting.</p>
                </div>
                <div class="clay-card reveal">
                    <div class="service-icon"><i class="ph ph-magnifying-glass"></i></div>
                    <h3>Google Ads</h3>
                    <p style="margin-top: 12px; color: var(--text-light);">High-intent search advertising to capture customers actively looking for your services.</p>
                </div>
                <div class="clay-card reveal">
                    <div class="service-icon"><i class="ph ph-layout"></i></div>
                    <h3>Landing Pages</h3>
                    <p style="margin-top: 12px; color: var(--text-light);">High-conversion landing pages designed specifically for your advertising campaigns.</p>
                </div>
                <div class="clay-card reveal">
                    <div class="service-icon"><i class="ph ph-calendar-check"></i></div>
                    <h3>Booking Systems</h3>
                    <p style="margin-top: 12px; color: var(--text-light);">Custom online booking functionality seamlessly integrated into your website.</p>
                </div>
                <div class="clay-card reveal">
                    <div class="service-icon"><i class="ph ph-trend-up"></i></div>
                    <h3>Lead Generation</h3>
                    <p style="margin-top: 12px; color: var(--text-light);">End-to-end funnels designed to deliver qualified leads directly to your CRM.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Highlight: Website Design -->
    <section id="web-design" class="section container">
        <div class="split-section reveal">
            <div class="split-image">
                <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80" alt="Website Design Process" loading="lazy">
            </div>
            <div class="split-content">
                <h2>Conversion-Focused Website Design</h2>
                <p style="margin: 20px 0; color: var(--text-light);">Your website shouldn't just look pretty—it should act as your best salesperson. We build modern, mobile-first websites using premium design systems that establish trust and capture leads effectively.</p>
                <ul style="list-style: none; margin-bottom: 30px;">
                    <li style="margin-bottom: 12px;"><i class="ph ph-check-circle" style="color: var(--primary); margin-right: 8px;"></i> Responsive on all devices</li>
                    <li style="margin-bottom: 12px;"><i class="ph ph-check-circle" style="color: var(--primary); margin-right: 8px;"></i> Fast loading performance</li>
                    <li style="margin-bottom: 12px;"><i class="ph ph-check-circle" style="color: var(--primary); margin-right: 8px;"></i> Clear call-to-actions</li>
                </ul>
                <a href="#booking" class="clay-btn">Discuss My Website</a>
            </div>
        </div>
    </section>

    <!-- Highlight: Ads -->
    <section id="ads" class="section container">
        <div class="split-section reverse reveal">
            <div class="split-image">
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" alt="Data Analytics and Ads" loading="lazy">
            </div>
            <div class="split-content">
                <h2>Meta & Google Ads Management</h2>
                <p style="margin: 20px 0; color: var(--text-light);">Stop wasting ad spend. We create data-driven advertising campaigns on Facebook, Instagram, and Google to bring high-quality traffic to your business.</p>
                <ul style="list-style: none; margin-bottom: 30px;">
                    <li style="margin-bottom: 12px;"><i class="ph ph-check-circle" style="color: var(--secondary); margin-right: 8px;"></i> Audience targeting & Retargeting</li>
                    <li style="margin-bottom: 12px;"><i class="ph ph-check-circle" style="color: var(--secondary); margin-right: 8px;"></i> Creative testing & Optimization</li>
                    <li style="margin-bottom: 12px;"><i class="ph ph-check-circle" style="color: var(--secondary); margin-right: 8px;"></i> Transparent conversion tracking</li>
                </ul>
                <a href="#booking" class="clay-btn">Discuss Advertising</a>
            </div>
        </div>
    </section>

    <!-- Process -->
    <section id="process" class="section" style="background: rgba(255,255,255,0.4);">
        <div class="container">
            <div class="text-center reveal">
                <h2>Our Proven Process</h2>
                <p style="color: var(--text-light); max-width: 600px; margin: 16px auto;">A systematic approach to building your digital presence.</p>
            </div>
            <div class="process-grid">
                <div class="clay-card process-step reveal">
                    <span class="step-number">01</span>
                    <i class="ph ph-compass" style="font-size: 40px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Discovery</h4>
                    <p style="font-size: 14px; color: var(--text-light); margin-top: 8px;">Understanding your business and goals.</p>
                </div>
                <div class="clay-card process-step reveal">
                    <span class="step-number">02</span>
                    <i class="ph ph-lightbulb" style="font-size: 40px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Strategy</h4>
                    <p style="font-size: 14px; color: var(--text-light); margin-top: 8px;">Planning the architecture and ad campaigns.</p>
                </div>
                <div class="clay-card process-step reveal">
                    <span class="step-number">03</span>
                    <i class="ph ph-paint-brush" style="font-size: 40px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Design</h4>
                    <p style="font-size: 14px; color: var(--text-light); margin-top: 8px;">Creating premium visual experiences.</p>
                </div>
                <div class="clay-card process-step reveal">
                    <span class="step-number">04</span>
                    <i class="ph ph-rocket-launch" style="font-size: 40px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Launch</h4>
                    <p style="font-size: 14px; color: var(--text-light); margin-top: 8px;">Deploying the website and ad campaigns.</p>
                </div>
                <div class="clay-card process-step reveal">
                    <span class="step-number">05</span>
                    <i class="ph ph-chart-line-up" style="font-size: 40px; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Optimize</h4>
                    <p style="font-size: 14px; color: var(--text-light); margin-top: 8px;">Monitoring data to improve conversions.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Work / Portfolio (Sample Concepts) -->
    <section id="work" class="section container">
        <div class="text-center reveal">
            <h2>Work & Concepts</h2>
            <p style="color: var(--text-light); max-width: 600px; margin: 16px auto;">Examples of layout concepts and design approaches.</p>
        </div>
        <div class="services-grid">
            <div class="clay-card reveal" style="padding: 20px;">
                <img src="https://images.unsplash.com/photo-1481481312846-f6b4f4a56910?auto=format&fit=crop&w=600&q=80" alt="E-commerce Concept" style="width:100%; border-radius: 16px; margin-bottom: 16px;" loading="lazy">
                <h4>E-commerce Concept</h4>
                <p style="font-size: 14px; color: var(--text-light);">Sample Project</p>
            </div>
            <div class="clay-card reveal" style="padding: 20px;">
                <img src="https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=600&q=80" alt="Service Business Demo" style="width:100%; border-radius: 16px; margin-bottom: 16px;" loading="lazy">
                <h4>Service Business Demo</h4>
                <p style="font-size: 14px; color: var(--text-light);">Demo UI</p>
            </div>
            <div class="clay-card reveal" style="padding: 20px;">
                <img src="https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=600&q=80" alt="Landing Page Layout" style="width:100%; border-radius: 16px; margin-bottom: 16px;" loading="lazy">
                <h4>Lead Gen Landing Page</h4>
                <p style="font-size: 14px; color: var(--text-light);">Concept</p>
            </div>
        </div>
    </section>

    <!-- Booking Section -->
    <section id="booking" class="section">
        <div class="container" style="max-width: 800px;">
            <div class="clay-card reveal">
                
                <div id="bookingFormUI">
                    <div class="text-center">
                        <h2>Let's Talk About Your Project</h2>
                        <p style="color: var(--text-light); margin: 16px 0 32px;">Fill out the form below to request a free consultation with Khan Usman.</p>
                    </div>
                    <form id="bookingForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Full Name *</label>
                                <input
