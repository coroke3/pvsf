import { useState, useEffect } from 'react';
import Link from "next/link";
import styles from "../styles/worksSidebar.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import React from 'react';

const WorksSidebar = React.memo(function WorksSidebar({ works = [], currentId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isWideScreen, setIsWideScreen] = useState(false);

    // 画面幅のチェックと監視
    useEffect(() => {
        const checkWidth = () => {
            setIsWideScreen(window.innerWidth > 1000);
            if (window.innerWidth > 1000) {
                setIsOpen(true);
            }
        };

        // 初期チェック
        checkWidth();

        // リサイズ時のチェック
        window.addEventListener('resize', checkWidth);
        return () => window.removeEventListener('resize', checkWidth);
    }, []);

    // ESCキーでサイドバーを閉じる（画面幅が1000px以下の場合のみ）
    useEffect(() => {
        const handleEsc = (event) => {
            if (!isWideScreen && event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isWideScreen]);

    // 画面幅が1000px以下の時、サイドバーを開くとスクロールを無効化
    useEffect(() => {
        if (!isWideScreen && isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, isWideScreen]);

    return (
        <>
            {!isWideScreen && (
                <button
                    className={styles.sidebarToggle}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle sidebar"
                >
                    <FontAwesomeIcon icon={isOpen ? faChevronRight : faChevronLeft} />
                </button>
            )}
            {!isWideScreen && (
                <div
                    className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
                    onClick={() => setIsOpen(false)}
                />
            )}
            <div className={`${styles.s3f} ${isOpen || isWideScreen ? styles.open : ''}`}>
                {works.map((work) => {
                    const showIcon = work.icon !== undefined && work.icon !== "";
                    const isActive = work.timestamp.toString() === currentId;

                    return (
                        <Link
                            href={`/release/${work.timestamp}`}
                            key={work.id}
                            scroll={false}
                            onClick={() => {
                                if (!isWideScreen) {
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
});

export default WorksSidebar; 