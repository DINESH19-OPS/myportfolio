const projectGrid = document.querySelector("#project-grid");
const skillsList = document.querySelector("#skills-list");
const profileName = document.querySelector("#profile-name");
const profileSummary = document.querySelector("#profile-summary");
const footerName = document.querySelector("#footer-name");
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

const aboutText = document.querySelector("#about-text");
const aboutStats = document.querySelector("#about-stats");
const experienceTimeline = document.querySelector("#experience-timeline");
const educationTimeline = document.querySelector("#education-timeline");
const aboutGoal = document.querySelector("#about-goal");
const aboutDo = document.querySelector("#about-do");
const aboutCertifications = document.querySelector("#about-certifications");
const contactEmail = document.querySelector("#contact-email");

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const renderProfile = (profile) => {
  profileName.textContent = profile.name;
  profileSummary.textContent = `${profile.role} based in ${profile.location}. ${profile.summary}`;
  footerName.textContent = profile.name;
  document.title = `${profile.name} | Portfolio`;

  if (aboutText && profile.about_summary) {
    // Preserve formatting with newlines
    aboutText.style.whiteSpace = "pre-wrap";
    aboutText.textContent = profile.about_summary;
  }
  if (aboutStats && profile.stats) {
    aboutStats.innerHTML = profile.stats
      .map(
        (stat) => `
          <div class="stat-card">
            <strong>${stat.value}</strong>
            <span>${stat.label}</span>
          </div>
        `
      )
      .join("");
  }
  if (aboutGoal && profile.goal) {
    aboutGoal.textContent = profile.goal;
  }
  if (aboutDo && profile.what_i_do) {
    aboutDo.innerHTML = profile.what_i_do
      .map((item) => `<li>${item}</li>`)
      .join("");
  }
  if (aboutCertifications && profile.certifications) {
    aboutCertifications.innerHTML = profile.certifications
      .map(
        (cert) => `
          <div class="cert-card">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cert-icon" style="color: var(--teal-dark);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>${cert}</span>
          </div>
        `
      )
      .join("");
  }
  if (contactEmail && profile.email) {
    contactEmail.href = `mailto:${profile.email}`;
    contactEmail.textContent = profile.email;
  }
};

const renderProjects = (projects) => {
  projectGrid.innerHTML = projects
    .map(
      (project) => `
        <article class="project-card">
          <img src="${project.image_url}" alt="${project.title} project preview" loading="lazy" />
          <div class="project-card-body">
            <p class="eyebrow">${project.category}${project.featured ? " · Featured" : ""}</p>
            <h3>${project.title}</h3>
            <p>${project.summary}</p>
            <ul class="tag-list">
              ${project.tech_stack.map((tech) => `<li>${tech}</li>`).join("")}
            </ul>
            <div class="project-links">
              <a href="${project.live_url}" target="_blank" rel="noreferrer">Live</a>
              <a href="${project.repo_url}" target="_blank" rel="noreferrer">Code</a>
            </div>
          </div>
        </article>
      `
    )
    .join("");
};

const renderSkills = (groups) => {
  skillsList.innerHTML = Object.entries(groups)
    .map(
      ([groupName, skills]) => `
        <article class="skill-group">
          <h3>${groupName}</h3>
          ${skills
            .map(
              (skill) => `
                <div class="skill">
                  <div class="skill-label">
                    <span>${skill.name}</span>
                    <span>${skill.level}%</span>
                  </div>
                  <div class="skill-meter" aria-label="${skill.name} skill level ${skill.level}%">
                    <span style="width: ${skill.level}%"></span>
                  </div>
                </div>
              `
            )
            .join("")}
        </article>
      `
    )
    .join("");
};

const renderExperience = (experience) => {
  if (!experienceTimeline) return;
  experienceTimeline.innerHTML = experience
    .map(
      (exp) => `
        <div class="timeline-item">
          <div class="timeline-date">${exp.duration}</div>
          <div class="timeline-card">
            <h4>${exp.role}</h4>
            <div class="timeline-subtitle">${exp.company}</div>
            <div class="timeline-details">
              <ul>
                ${exp.description.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </div>
          </div>
        </div>
      `
    )
    .join("");
};

const renderEducation = (education) => {
  if (!educationTimeline) return;
  educationTimeline.innerHTML = education
    .map(
      (edu) => `
        <div class="timeline-item">
          <div class="timeline-date">${edu.duration}</div>
          <div class="timeline-card">
            <h4>${edu.degree}</h4>
            <div class="timeline-subtitle">${edu.institution}</div>
            <p class="timeline-details">${edu.details}</p>
          </div>
        </div>
      `
    )
    .join("");
};

const loadPortfolio = async () => {
  try {
    const [profile, projects, skills, experience, education] = await Promise.all([
      getJson("/api/profile"),
      getJson("/api/projects"),
      getJson("/api/skills"),
      getJson("/api/experience"),
      getJson("/api/education")
    ]);

    renderProfile(profile);
    renderProjects(projects);
    renderSkills(skills);
    renderExperience(experience);
    renderEducation(education);
  } catch (error) {
    projectGrid.innerHTML = `<p>Portfolio data could not be loaded. Please try again later.</p>`;
    console.error(error);
  }
};

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "Sending...";

  const formData = Object.fromEntries(new FormData(contactForm));

  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Message could not be sent.");
    }

    contactForm.reset();
    formStatus.textContent = result.message;
  } catch (error) {
    formStatus.textContent = error.message;
  }
});

loadPortfolio();
