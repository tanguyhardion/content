import React from 'react';
import styles from './ExperienceCard.module.css';

const ExperienceCard = ({ title, description, path }) => {
  return (
    <a href={path} className={styles.experienceCard}>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className={styles.cardFooter}>
        <span className="launch-text">Launch Experience →</span>
      </div>
    </a>
  );
};

export default ExperienceCard;
