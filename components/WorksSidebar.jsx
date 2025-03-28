import { useState, useEffect } from 'react';
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import React from 'react';

const WorksSidebar = React.memo(function WorksSidebar({ works = [], currentId }) {
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
                className="sidebarToggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle sidebar"
            >
                <FontAwesomeIcon icon={isOpen ? faChevronRight : faChevronLeft} />
            </button>
            <div
                className={`overlay ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(false)}
            />
            <div className={`s3f ${isOpen ? 'open' : ''}`}>
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
                            <div className={`works ${isActive ? 'active' : ''}`}>
                                {showIcon && (
                                    <img
                                        src={`https://lh3.googleusercontent.com/d/${work.icon.slice(33)}`}
                                        className="icon"
                                        alt={`${work.creator} | PVSF archive`}
                                    />
                                )}
                                <div className="w1">{work.creator}</div>
                                <div className="w2">{work.title}</div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </>
    );
});

export default WorksSidebar; 