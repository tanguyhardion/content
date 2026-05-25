import React from 'react';
import TitleText from './components/TitleText/TitleText';
import FullscreenBtn from './components/FullscreenBtn/FullscreenBtn';
import ExperienceCard from './components/ExperienceCard/ExperienceCard';
import BackgroundGlow from './components/BackgroundGlow/BackgroundGlow';
import styles from './App.module.css';

function App() {
  const experiences = [];

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
              <ExperienceCard 
                key={index}
                title={exp.title}
                description={exp.description}
                path={exp.path}
              />
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
