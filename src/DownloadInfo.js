import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaApple, FaArrowDown, FaArrowLeft, FaBell,
  FaCheckCircle, FaCog, FaDollarSign, FaGooglePlay,
  FaMapMarkedAlt, FaMotorcycle
} from 'react-icons/fa';
import styles from './DownloadInfo.module.css';

// Using the original filenames as requested, accessed from the public folder.
const screenshot1 = process.env.PUBLIC_URL + '/WhatsApp Image 2025-12-09 at 23.56.33.jpeg';
const screenshot2 = process.env.PUBLIC_URL + '/WhatsApp Image 2025-12-09 at 23.56.47.jpeg';
const apkUrl = process.env.PUBLIC_URL + '/app-release.apk';

const screenshots = [screenshot1, screenshot2];

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate('/')} className={styles.goBack} aria-label="Go Back">
      <FaArrowLeft className={styles.goBackArrow} />
    </button>
  );
};

const Header = () => (
  <header className={styles.header}>
    <h1 className={styles.appName}>SureBoda</h1>
    <p className={styles.appTagline}>Seamless Swapping, Smarter Riding</p>
  </header>
);

const AppPreview = () => {
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImg((prevImg) => (prevImg + 1) % screenshots.length);
    }, 3000); // Change image every 3 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.previewColumn}>
      <div className={styles.phoneMockup}>
        {screenshots.map((img, index) => (
          <img
            key={img}
            src={img}
            alt={`App screenshot ${index + 1}`}
            className={styles.screenshot}
            style={{ opacity: currentImg === index ? 1 : 0 }}
          />
        ))}
      </div>
    </div>
  );
};

const DownloadCard = () => (
    <div className={`${styles.infoCard} ${styles.downloadSection}`}>
      <h2 className={styles.cardTitle}><FaArrowDown /> Download the App</h2>
      <a href={apkUrl} download className={styles.downloadBtn}>
        Download for Android
      </a>
      <p className={styles.versionInfo}>Version 1.0.0 | Requires Android 7.0+</p>
    </div>
);

const featureList = [
    { icon: <FaMotorcycle className={styles.featureIcon} />, text: 'Instant bike & battery swaps' },
    { icon: <FaDollarSign className={styles.featureIcon} />, text: 'Easy transaction management' },
    { icon: <FaMapMarkedAlt className={styles.featureIcon} />, text: 'Find swap stations near you' },
    { icon: <FaBell className={styles.featureIcon} />, text: 'Real-time notifications' },
    { icon: <FaCheckCircle className={styles.featureIcon} />, text: 'Secure & verified process' },
    { icon: <FaCog className={styles.featureIcon} />, text: 'Manage your account settings'},
];

const FeaturesCard = () => (
  <div className={styles.infoCard}>
    <h2 className={styles.cardTitle}>Everything You Need</h2>
    <ul className={styles.featureList}>
      {featureList.map((feature, index) => (
        <li key={index} className={styles.featureItem}>
          {feature.icon}
          <span>{feature.text}</span>
        </li>
      ))}
    </ul>
  </div>
);

const StoreAvailability = () => (
    <section className={styles.storeSection}>
      <h2 className={styles.storeTitle}>Also Coming Soon To</h2>
      <div className={styles.storeBadges}>
        <div className={styles.storeBadge}>
          <FaGooglePlay className={styles.storeIcon} />
          <div className={styles.storeText}>
            <div className={styles.storeName}>Google Play</div>
            <div className={styles.storeStatus}>Under Review</div>
          </div>
        </div>
        <div className={styles.storeBadge}>
          <FaApple className={styles.storeIcon} />
          <div className={styles.storeText}>
            <div className={styles.storeName}>App Store</div>
            <div className={styles.storeStatus}>In Development</div>
          </div>
        </div>
      </div>
    </section>
);

export default function DownloadInfo() {
  return (
    <div className={styles.page}>
      <BackButton />
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.infoColumn}>
          <DownloadCard />
          <FeaturesCard />
        </div>
        <AppPreview />
      </main>
      <StoreAvailability />
    </div>
  );
}