import React from 'react';
import styles from './TitleText.module.css';

const TitleText = ({ title, subtitle, gradient = true }) => {
  return (
    <div className={styles.titleContainer}>
      <h1 className={styles.mainTitle}>
        {gradient ? <span className={styles.gradientText}>{title}</span> : title}
      </h1>
      {subtitle && <p className={styles.subtitleText}>{subtitle}</p>}
    </div>
  );
};

export default TitleText;
