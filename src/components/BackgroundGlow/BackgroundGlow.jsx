import React from 'react';
import styles from './BackgroundGlow.module.css';

const BackgroundGlow = () => {
  return (
    <>
      <div className={`${styles.ambientGlow} ${styles.orb1}`}></div>
      <div className={`${styles.ambientGlow} ${styles.orb2}`}></div>
      <div className={`${styles.ambientGlow} ${styles.orb3}`}></div>
    </>
  );
};

export default BackgroundGlow;
