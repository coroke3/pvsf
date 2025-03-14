import { useState, useEffect } from 'react';
import Link from "next/link";
import styles from "../styles/releases.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

export default function WorksSidebar({ works = [], currentId }) {
    const [isOpen, setIsOpen] = useState(false);

    // ESCキーでサイドバーを閉じる
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, []);

    // 画面幅が1000px以下の時、サイドバーを開くとスクロールを無効化
    useEffect(() => {
        if (window.innerWidth <= 1000) {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'unset';
            }
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <>
            <button
                className={styles.sidebarToggle}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle sidebar"
            >
                <FontAwesomeIcon icon={isOpen ? faChevronRight : faChevronLeft} />
            </button>
            <div
                className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(false)}
            />
            <div className={`${styles.s3f} ${isOpen ? styles.open : ''}`}>
                {works.map((work) => {
                    const showIcon = work.icon !== undefined && work.icon !== "";
                    const isActive = work.timestamp.toString() === currentId;

                    return (
                        <Link
                            href={`/release/${work.timestamp}`}
                            key={work.id}
                            scroll={false}
                            onClick={() => {
                                if (window.innerWidth <= 1000) {
                                    setIsOpen(false);
                                }
                            }}
                        >
                            <div className={`${styles.works} ${isActive ? styles.active : ''}`}>
                                {showIcon && (
                                    <img
                                        src={`https://lh3.googleusercontent.com/d/${work.icon.slice(33)}`}
                                        className={styles.icon}
                                        alt={`${work.creator} | PVSF archive`}
                                    />
                                )}
                                <div className={styles.w1}>{work.creator}</div>
                                <div className={styles.w2}>{work.title}</div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </>
    );
} 