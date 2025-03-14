import { useState, useEffect, MouseEvent, KeyboardEvent } from 'react';
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import React from 'react';

interface Work {
    id: string;
    timestamp: string;
    creator: string;
    title: string;
    icon?: string;
}

interface WorksSidebarProps {
    works?: Work[];
    currentId?: string;
}

const WorksSidebar = React.memo(function WorksSidebar({ works = [], currentId }: WorksSidebarProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth <= 1000) {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'unset';
            }
        }
        return () => {
            if (typeof document !== 'undefined') {
                document.body.style.overflow = 'unset';
            }
        };
    }, [isOpen]);

    const handleOverlayClick = (event: MouseEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setIsOpen(false);
    };

    const handleToggleClick = (event: MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        setIsOpen(!isOpen);
    };

    const handleLinkClick = (): void => {
        if (typeof window !== 'undefined' && window.innerWidth <= 1000) {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                className="sidebarToggle"
                onClick={handleToggleClick}
                aria-label="Toggle sidebar"
                type="button"
            >
                <FontAwesomeIcon icon={isOpen ? faChevronRight : faChevronLeft} />
            </button>
            <div
                className={`overlay ${isOpen ? 'open' : ''}`}
                onClick={handleOverlayClick}
                role="presentation"
            />
            <div className={`s3f ${isOpen ? 'open' : ''}`}>
                {works.map((work: Work) => {
                    const showIcon = typeof work.icon === 'string' && work.icon.length > 0;
                    const isActive = work.timestamp.toString() === currentId?.toString();

                    return (
                        <Link
                            href={`/release/${encodeURIComponent(work.timestamp)}`}
                            key={work.id}
                            onClick={handleLinkClick}
                            passHref
                        >
                            <div className={`works ${isActive ? 'active' : ''}`}>
                                {showIcon && work.icon && (
                                    <img
                                        src={`https://lh3.googleusercontent.com/d/${work.icon.slice(33)}`}
                                        className="icon"
                                        alt={`${work.creator} | PVSF archive`}
                                        width={50}
                                        height={50}
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

WorksSidebar.displayName = 'WorksSidebar';

export default WorksSidebar; 