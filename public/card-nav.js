document.addEventListener("DOMContentLoaded", () => {
  const items = [
    {
      label: "About",
      href: "#about",
      bgColor: "#1B1722",
      textColor: "#fff",
      links: [
        { label: "Background", href: "#about", ariaLabel: "About Background" },
        { label: "Education", href: "#about", ariaLabel: "About Education" }
      ]
    },
    {
      label: "Projects", 
      href: "#projects",
      bgColor: "#2F293A",
      textColor: "#fff",
      links: [
        { label: "Featured", href: "#projects", ariaLabel: "Featured Projects" },
        { label: "Skills", href: "#skills", ariaLabel: "My Skills" }
      ]
    },
    {
      label: "Contact",
      href: "#contact",
      bgColor: "#2F293A", 
      textColor: "#fff",
      links: [
        { label: "Message", href: "#contact", ariaLabel: "Send a message" },
        { label: "Email", href: "#contact", ariaLabel: "Email me" }
      ]
    }
  ];

  const baseColor = "transparent";
  const menuColor = "#fff";
  const buttonBgColor = "#111";
  const buttonTextColor = "#fff";
  const ease = "back.out(1.7)";

  // Setup DOM structure
  const container = document.getElementById("card-nav-root");
  if (!container) return;

  container.innerHTML = `
    <div class="card-nav-container">
      <nav id="card-nav" class="card-nav" style="background-color: ${baseColor}">
        <div class="card-nav-top">
          <div id="hamburger-menu" class="hamburger-menu" role="button" aria-label="Open menu" tabindex="0" style="color: ${menuColor}">
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
          </div>
          <div class="logo-container">
            <a href="#top" style="text-decoration: none; font-weight: 800; font-size: 20px; color: ${menuColor};">PD</a>
          </div>
        </div>
        <div id="card-nav-content" class="card-nav-content" aria-hidden="true">
          ${items.slice(0, 3).map((item, idx) => `
            <div class="nav-card card-nav-card" style="background-color: ${item.bgColor}; color: ${item.textColor}">
              <a href="${item.href}" class="nav-card-label nav-card-main-link" style="text-decoration: none; color: inherit; display: block;">${item.label}</a>
              <div class="nav-card-links">
                ${item.links.map(lnk => `
                  <a class="nav-card-link" href="${lnk.href}" aria-label="${lnk.ariaLabel}" style="color: inherit;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-card-link-icon" aria-hidden="true" style="margin-right: 6px;"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                    ${lnk.label}
                  </a>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </nav>
    </div>
  `;

  // Animation logic
  let isExpanded = false;
  let tl = null;
  const navEl = document.getElementById("card-nav");
  const hamburgerEl = document.getElementById("hamburger-menu");
  const contentEl = document.getElementById("card-nav-content");
  const cardsEl = document.querySelectorAll(".card-nav-card");
  const linksEl = document.querySelectorAll(".nav-card-link, .nav-card-main-link");

  const calculateHeight = () => {
    if (!navEl) return 260;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      if (contentEl) {
        const wasVisible = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';

        contentEl.offsetHeight; // force reflow

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisible;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }
    return 260;
  };

  const createTimeline = () => {
    if (!navEl) return null;
    if (typeof gsap === 'undefined') {
        console.error("GSAP is not loaded.");
        return null;
    }

    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(cardsEl, { y: 50, opacity: 0 });

    const timeline = gsap.timeline({ paused: true });

    timeline.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease
    });

    timeline.to(cardsEl, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');

    return timeline;
  };

  tl = createTimeline();

  const toggleMenu = () => {
    if (!tl) tl = createTimeline();
    if (!tl) return;

    if (!isExpanded) {
      hamburgerEl.classList.add("open");
      navEl.classList.add("open");
      contentEl.setAttribute("aria-hidden", "false");
      isExpanded = true;
      tl.play(0);
    } else {
      hamburgerEl.classList.remove("open");
      contentEl.setAttribute("aria-hidden", "true");
      tl.eventCallback('onReverseComplete', () => {
        navEl.classList.remove("open");
        isExpanded = false;
      });
      tl.reverse();
    }
  };

  hamburgerEl.addEventListener("click", toggleMenu);
  hamburgerEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleMenu();
    }
  });

  // Close menu when clicking a link
  linksEl.forEach(link => {
      link.addEventListener("click", () => {
          if (isExpanded) {
              toggleMenu();
          }
      });
  });

  window.addEventListener("resize", () => {
    if (!tl) return;
    if (isExpanded) {
      const newHeight = calculateHeight();
      gsap.set(navEl, { height: newHeight });
      tl.kill();
      tl = createTimeline();
      if (tl) {
        tl.progress(1);
      }
    } else {
      tl.kill();
      tl = createTimeline();
    }
  });
});
