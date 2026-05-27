import React, { useState } from 'react';
import TitleText from './components/TitleText/TitleText';
import FullscreenBtn from './components/FullscreenBtn/FullscreenBtn';
import ExperienceCard from './components/ExperienceCard/ExperienceCard';
import BackgroundGlow from './components/BackgroundGlow/BackgroundGlow';
import HarmonicBounces from './components/Experiences/HarmonicBounces/HarmonicBounces';
import styles from './App.module.css';

function App() {
  const [activeExperience, setActiveExperience] = useState(null);

  const experiences = [
    {
      id: 'harmonic-bounces',
      title: 'Harmonic Bounces',
      description: 'A continually escalating cascade of musical bounces and echoing chaos.',
      component: <HarmonicBounces />
    }
  ];

  if (activeExperience) {
    const exp = experiences.find(e => e.id === activeExperience);
    return (
      <div className={styles.experienceWrapper}>
        <button 
          className={styles.backButton} 
          onClick={() => setActiveExperience(null)}
        >
          ← Back
        </button>
        {exp.component}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <BackgroundGlow />
      
      <header className={styles.header}>
        <TitleText 
          title="Soul Lab" 
          subtitle="A collection of interactive experiences and digital experiments." 
        />
        <FullscreenBtn />
      </header>

      <main>
        {experiences.length > 0 ? (
          <section className={styles.experienceGrid}>
            {experiences.map((exp, index) => (
              <div key={index} onClick={(e) => {
                e.preventDefault();
                setActiveExperience(exp.id);
              }} style={{ cursor: 'pointer' }}>
                <ExperienceCard 
                  title={exp.title}
                  description={exp.description}
                  path="#"
                />
              </div>
            ))}
          </section>
        ) : (
          <div className={styles.emptyState}>
            <p>Ready for new celestial experiences.</p>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Built with React & Vite.</p>
      </footer>
    </div>
  );
}

export default App;
