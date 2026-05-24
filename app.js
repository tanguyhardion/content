document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const projectsGrid = document.getElementById('projects-grid');
  const searchInput = document.getElementById('search-input');
  const projectCountBadge = document.getElementById('project-count');
  const emptyState = document.getElementById('empty-state');
  const loader = document.getElementById('loader');
  const yearSpan = document.getElementById('year');
  const githubLink = document.getElementById('github-repo-link');

  // Set Year in footer
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Set Dynamic GitHub URL based on deployment
  setupGitHubLink(githubLink);

  // Existing local projects fallback
  const FALLBACK_PAGES = [
    {
      path: 'soul-gates',
      title: 'Soul Gates - Fate Alignment',
      description: 'Guide the soul through the rotating gates of destiny to reach the golden core.'
    },
    {
      path: 'two-souls',
      title: 'Lonely Souls',
      description: 'Can red and blue souls find each other before time runs out?'
    },
    {
      path: 'soul-orbit',
      title: 'Soul Orbit - Celestial Resonance',
      description: 'Watch soul fragments orbit, leap through rotating barriers, and merge with the stellar core in this generative simulation.'
    }
  ];

  let allProjects = [];

  // Load projects list
  fetch('./pages.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        // Hydrate projects with descriptions from our fallback if they are missing
        allProjects = data.map(project => {
          const fallback = FALLBACK_PAGES.find(p => p.path === project.path);
          return {
            ...project,
            description: project.description || (fallback ? fallback.description : 'Interactive web experience.')
          };
        });
      } else {
        allProjects = FALLBACK_PAGES;
      }
      renderProjects(allProjects);
    })
    .catch(error => {
      console.warn('Could not fetch pages.json (likely due to local CORS). Falling back to hardcoded project list.', error);
      allProjects = FALLBACK_PAGES;
      renderProjects(allProjects);
    });

  // Render projects function
  function renderProjects(projects) {
    // Hide loader
    if (loader) loader.classList.add('hidden');

    // Clear previous results
    // Keep loader hidden and just clear rest of contents
    const existingCards = projectsGrid.querySelectorAll('.card-wrapper');
    existingCards.forEach(card => card.remove());

    if (projects.length === 0) {
      emptyState.classList.remove('hidden');
      projectCountBadge.textContent = '0';
      return;
    }

    emptyState.classList.add('hidden');
    projectCountBadge.textContent = projects.length;

    projects.forEach(project => {
      const cardWrapper = createProjectCard(project);
      projectsGrid.appendChild(cardWrapper);
    });
  }

  // Create card element
  function createProjectCard(project) {
    const hash = getHash(project.path);
    const hue1 = hash % 360;
    const hue2 = (hue1 + 130) % 360;

    const wrapper = document.createElement('a');
    wrapper.href = `./${project.path}/`;
    wrapper.className = 'card-wrapper';

    const card = document.createElement('div');
    card.className = 'project-card';
    
    // Set custom CSS variables for glowing effects based on page name hash
    card.style.setProperty('--glow-color', `hsla(${hue1}, 80%, 65%, 0.3)`);
    card.style.setProperty('--glow-color-soft', `hsla(${hue1}, 80%, 10%, 0.65)`);
    card.style.setProperty('--thumbnail-bg', `linear-gradient(135deg, hsla(${hue1}, 70%, 16%, 0.95) 0%, hsla(${hue2}, 70%, 8%, 0.98) 100%)`);

    // Procedural SVG Pattern for thumbnail
    const svgPattern = `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:hsl(${hue1}, 80%, 60%);stop-opacity:0.25" />
            <stop offset="100%" style="stop-color:hsl(${hue2}, 80%, 50%);stop-opacity:0.02" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad-${hash})" />
        <circle cx="${35 + (hash % 30)}%" cy="${35 + ((hash >> 2) % 30)}%" r="${25 + (hash % 20)}" fill="none" stroke="hsl(${hue1}, 80%, 60%)" stroke-width="1.5" stroke-dasharray="4, 4" opacity="0.3" />
        <circle cx="${65 - (hash % 20)}%" cy="${65 - ((hash >> 3) % 30)}%" r="${12 + (hash % 15)}" fill="hsla(${hue2}, 85%, 65%, 0.1)" stroke="hsla(${hue2}, 85%, 65%, 0.2)" stroke-width="1" />
        <line x1="${10 + (hash % 20)}%" y1="${80 - (hash % 20)}%" x2="${90 - (hash % 20)}%" y2="${20 + (hash % 20)}%" stroke="hsla(${hue1}, 80%, 60%, 0.1)" stroke-width="1" />
      </svg>
    `;

    card.innerHTML = `
      <div class="card-thumbnail">
        <div class="thumbnail-pattern">${svgPattern}</div>
        <span class="card-tag">/${project.path}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">${project.title}</h2>
        <p class="card-desc">${project.description}</p>
        <div class="card-footer">
          <span class="launch-label">
            Launch Experience
            <svg class="launch-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </div>
      </div>
    `;

    // Interactive mouse move spotlight effect (Vercel-style glow)
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    });

    wrapper.appendChild(card);
    return wrapper;
  }

  // Simple string hashing function
  function getHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  // Setup repo links based on deployment hostname
  function setupGitHubLink(element) {
    if (!element) return;
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    let gitHubRepoUrl = 'https://github.com';
    
    if (hostname.endsWith('.github.io')) {
      const username = hostname.split('.')[0];
      const repo = pathname.split('/')[1] || '';
      if (repo) {
        gitHubRepoUrl = `https://github.com/${username}/${repo}`;
      } else {
        gitHubRepoUrl = `https://github.com/${username}`;
      }
    }
    element.href = gitHubRepoUrl;
  }

  // Search logic with simple filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtered = allProjects.filter(project => {
        return project.title.toLowerCase().includes(query) || 
               project.path.toLowerCase().includes(query) ||
               (project.description && project.description.toLowerCase().includes(query));
      });
      renderProjects(filtered);
    });
  }
});
