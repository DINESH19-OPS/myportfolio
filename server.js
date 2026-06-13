import express from "express";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import nodemailer from "nodemailer";

// Load environment variables if .env exists
try {
  process.loadEnvFile();
} catch (error) {
  // .env file might not exist or failed to load, continue without it
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "portfolio.sqlite");
const port = process.env.PORT || 3000;

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    tech_stack TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    live_url TEXT,
    repo_url TEXT,
    featured INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    group_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS experience (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    duration TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    degree TEXT NOT NULL,
    institution TEXT NOT NULL,
    duration TEXT NOT NULL,
    details TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const projectCount = db.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
if (projectCount === 0) {
  const insertProject = db.prepare(`
    INSERT INTO projects (title, summary, tech_stack, category, image_url, live_url, repo_url, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    [
      "Sign Detection Language",
      "A machine learning project that converts sign language gestures into readable text.",
      "Python, OpenCV, Machine Learning",
      "Web App",
      "/assets/sign-detection-language.svg",
      "https://sign-language-communication-system.vercel.app/",
      "https://github.com/yourname/sign-detection-language",
      1
    ],
    [
      "Review Hub",
      "A review platform concept for browsing, sharing, and managing user feedback in one place.",
      "Node.js, Express, PostgreSQL",
      "Full Stack",
      "/assets/review-hub.svg",
      "https://rvhub123.onrender.com/",
      "https://github.com/yourname/review-hub",
      1
    ],
    [
      "Insight Notes",
      "A clean note-taking app that organizes research notes by topic, tag, and reading status.",
      "JavaScript, REST API, MongoDB",
      "Productivity",
      "/assets/temple-game.png",
      "https://echoes-of-the-temple.onrender.com/",
      "https://github.com/yourname/insight-notes",
      0
    ]
  ].forEach((project) => insertProject.run(...project));
}

const skillCount = db.prepare("SELECT COUNT(*) AS count FROM skills").get().count;
if (skillCount === 0) {
  const insertSkill = db.prepare("INSERT INTO skills (name, level, group_name) VALUES (?, ?, ?)");
  [
    ["HTML5", 95, "Frontend"],
    ["CSS3", 90, "Frontend"],
    ["JavaScript", 88, "Frontend"],
    ["Responsive Web Design", 90, "Frontend"],
    ["MongoDB", 85, "Database"],
    ["Database Management", 82, "Database"],
    ["Git & GitHub", 85, "Tools"],
    ["Front-End Development", 90, "Frontend"],
    ["Problem Solving", 88, "Tools"],
    ["Team Collaboration", 85, "Tools"]
  ].forEach((skill) => insertSkill.run(...skill));
}

const experienceCount = db.prepare("SELECT COUNT(*) AS count FROM experience").get().count;
if (experienceCount === 0) {
  const insertExperience = db.prepare("INSERT INTO experience (role, company, duration, description) VALUES (?, ?, ?, ?)");
  [
    [
      "Virtual Intern",
      "ServiceNow",
      "May 2025 - Jun 2025",
      JSON.stringify([
        "Learned workflow automation, service management, and system administration concepts.",
        "Gained exposure to Agentic AI, flows, and automated testing frameworks (ATF)."
      ])
    ],
    [
      "Virtual Intern (Cohort 12)",
      "Google Cloud Generative AI",
      "Jan 2025 - Mar 2025",
      JSON.stringify([
        "Learned Generative AI fundamentals, prompt engineering, and cloud-based AI workflows.",
        "Completed hands-on labs aligned with real-world use cases."
      ])
    ],
    [
      "Virtual Intern (Cohort 13)",
      "Google AI-ML",
      "Sep 2024 - Nov 2024",
      JSON.stringify([
        "Gained exposure to machine learning fundamentals and model workflows.",
        "Practiced data preprocessing and model evaluation techniques."
      ])
    ]
  ].forEach((exp) => insertExperience.run(...exp));
}

const educationCount = db.prepare("SELECT COUNT(*) AS count FROM education").get().count;
if (educationCount === 0) {
  const insertEducation = db.prepare("INSERT INTO education (degree, institution, duration, details) VALUES (?, ?, ?, ?)");
  [
    [
      "Bachelor of Technology (B.Tech) – Computer Science and Engineering",
      "Koneru Lakshmaiah Education Foundation",
      "July 2024 - May 2028",
      "Hyderabad, India. Current CGPA: 9.48."
    ],
    [
      "MPC Intermediate",
      "Sri Chaitanya Junior College",
      "June 2022 - March 2024",
      "Hyderabad, India. Percentage: 81.4%."
    ],
    [
      "SSC School",
      "Sri Chaitanya School",
      "June 2021 - May 2022",
      "Hyderabad, India. CGPA: 9.3."
    ]
  ].forEach((edu) => insertEducation.run(...edu));
}

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/profile", (_req, res) => {
  res.json({
    name: "P DINESH",
    role: "Full-Stack Developer",
    location: "India",
    summary:
      "I build polished, practical web experiences with thoughtful interfaces, reliable APIs, and database-backed features.",
    about_summary:
      "Hi, I'm Dinesh, a B.Tech student passionate about web development and technology. I enjoy building practical and user-friendly web applications while continuously learning new tools and technologies. I have developed several projects using HTML, CSS, JavaScript, and modern development tools, which have strengthened my problem-solving and development skills.\n\nAlongside my academic journey, I have completed virtual internships and earned certifications in MongoDB Development and MongoDB Administration. I am always eager to explore new opportunities, enhance my technical expertise, and contribute to meaningful projects.",
    stats: [
      { label: "B.Tech CGPA", value: "9.48" },
      { label: "Projects Built", value: "10+" },
      { label: "LeetCode Solved", value: "81" }
    ],
    goal: "To grow as a software developer, gain industry experience, and create impactful digital solutions that solve real-world problems.",
    what_i_do: [
      "💻 Build responsive and interactive websites",
      "🚀 Develop real-world projects using modern web technologies",
      "📚 Continuously learn and explore new technologies",
      "🤝 Collaborate on projects and improve through hands-on experience",
      "🎯 Focus on creating clean, efficient, and user-friendly solutions"
    ],
    certifications: [
      "MongoDB Developer Certification",
      "MongoDB Administrator Certification",
      "Virtual Internship Certificates",
      "Cohort Program Certificates"
    ],
    email: "dinesh126ab@gmail.com",
    socials: {
      github: "https://github.com/yourname",
      linkedin: "https://linkedin.com/in/yourname"
    }
  });
});

app.get("/api/projects", (_req, res) => {
  const projects = db
    .prepare("SELECT * FROM projects ORDER BY featured DESC, id DESC")
    .all()
    .map((project) => ({
      ...project,
      featured: Boolean(project.featured),
      tech_stack: project.tech_stack.split(",").map((item) => item.trim())
    }));

  res.json(projects);
});

app.get("/api/skills", (_req, res) => {
  const rows = db.prepare("SELECT * FROM skills ORDER BY group_name, level DESC").all();
  const groups = rows.reduce((result, skill) => {
    result[skill.group_name] ||= [];
    result[skill.group_name].push({
      id: skill.id,
      name: skill.name,
      level: skill.level
    });
    return result;
  }, {});

  res.json(groups);
});

app.get("/api/experience", (_req, res) => {
  const rows = db.prepare("SELECT * FROM experience ORDER BY id ASC").all().map(row => ({
    ...row,
    description: JSON.parse(row.description)
  }));
  res.json(rows);
});

app.get("/api/education", (_req, res) => {
  const rows = db.prepare("SELECT * FROM education ORDER BY id ASC").all();
  res.json(rows);
});

app.post("/api/messages", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const result = db
    .prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)")
    .run(name.trim(), email.trim(), message.trim());

  // Send an email notification using Nodemailer
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER, // Send it to the portfolio owner
        subject: `New Message from ${name} (Portfolio)`,
        text: `You have received a new message from your portfolio contact form.\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`,
        replyTo: email,
      });
      console.log("Email notification sent successfully.");
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  } else {
    console.warn("GMAIL_USER or GMAIL_APP_PASSWORD is not set. Skipping email notification.");
  }

  res.status(201).json({
    id: result.lastInsertRowid,
    message: "Thanks for reaching out. Your message has been saved."
  });
});

app.get("/api/messages", (_req, res) => {
  const messages = db.prepare("SELECT * FROM messages ORDER BY created_at DESC").all();
  res.json(messages);
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: path.basename(dbPath) });
});

app.get("/messages", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "messages.html"));
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Portfolio running at http://localhost:${port}`);
});
