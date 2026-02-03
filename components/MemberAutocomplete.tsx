// MemberAutocomplete Component - Enhanced for Cloudflare Pages compatibility
// Uses client-side Firestore access instead of API routes
import { useState, useEffect, useRef, useCallback } from 'react';
import { searchMembers, MemberSuggestion } from '@/libs/memberService';

interface MemberAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (suggestion: MemberSuggestion) => void;
    placeholder?: string;
    className?: string;
    field: 'xid' | 'name';
}

export default function MemberAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder,
    className = '',
    field
}: MemberAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();

    // Fetch suggestions using client-side service
    const fetchSuggestions = useCallback(async (query: string) => {
        setIsLoading(true);
        try {
            const results = await searchMembers(query);
            setSuggestions(results);
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Show loading immediately for better UX
        if (value && value.length >= 1) {
            debounceRef.current = setTimeout(() => {
                fetchSuggestions(value);
            }, 150); // Faster debounce for local data
        } else {
            // Clear or show initial suggestions
            debounceRef.current = setTimeout(() => {
                fetchSuggestions('');
            }, 150);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [value, fetchSuggestions]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle selection
    const handleSelect = (suggestion: MemberSuggestion) => {
        onChange(field === 'xid' ? suggestion.xid : suggestion.name);
        if (onSelect) {
            onSelect(suggestion);
        }
        setShowDropdown(false);
        setHighlightedIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || suggestions.length === 0) {
            // Open dropdown on arrow down even when closed
            if (e.key === 'ArrowDown' && !showDropdown) {
                setShowDropdown(true);
                fetchSuggestions(value);
                return;
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    handleSelect(suggestions[highlightedIndex]);
                }
                break;
            case 'Tab':
                if (highlightedIndex >= 0) {
                    e.preventDefault();
                    handleSelect(suggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    // Highlight matching text
    const highlightMatch = (text: string, query: string) => {
        if (!query) return text;
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return text;
        return (
            <>
                {text.slice(0, index)}
                <mark>{text.slice(index, index + query.length)}</mark>
                {text.slice(index + query.length)}
            </>
        );
    };

    return (
        <div ref={containerRef} className="member-autocomplete">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShowDropdown(true);
                    setHighlightedIndex(-1);
                }}
                onFocus={() => {
                    setShowDropdown(true);
                    if (suggestions.length === 0) {
                        fetchSuggestions(value);
                    }
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`form-input ${className}`}
                autoComplete="off"
            />

            {showDropdown && suggestions.length > 0 && (
                <ul className="autocomplete-dropdown">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.xid}
                            className={`autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                            onClick={() => handleSelect(suggestion)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            <span className="suggestion-name">
                                {highlightMatch(suggestion.name, value)}
                            </span>
                            <span className="suggestion-xid">
                                @{highlightMatch(suggestion.xid, value)}
                            </span>
                            {suggestion.usageCount && suggestion.usageCount > 1 && (
                                <span className="suggestion-count">{suggestion.usageCount}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {showDropdown && suggestions.length === 0 && value && !isLoading && (
                <div className="autocomplete-empty">
                    該当するメンバーが見つかりません
                </div>
            )}

            {isLoading && (
                <div className="autocomplete-loading">
                    <span className="loading-dot"></span>
                </div>
            )}

            <style jsx>{`
                .member-autocomplete {
                    position: relative;
                    width: 100%;
                }

                .autocomplete-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    max-height: 250px;
                    overflow-y: auto;
                    background: #1a1a2e;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    margin-top: 4px;
                    padding: 0;
                    list-style: none;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
                }

                .autocomplete-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    transition: background 0.15s;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .autocomplete-item:last-child {
                    border-bottom: none;
                }

                .autocomplete-item:hover,
                .autocomplete-item.highlighted {
                    background: rgba(100, 255, 218, 0.1);
                }

                .suggestion-name {
                    font-weight: 500;
                    color: #fff;
                    flex: 1;
                }

                .suggestion-xid {
                    font-size: 0.85rem;
                    color: #64ffda;
                    opacity: 0.9;
                }

                .suggestion-count {
                    font-size: 0.75rem;
                    color: #8892b0;
                    background: rgba(255, 255, 255, 0.08);
                    padding: 0.125rem 0.375rem;
                    border-radius: 4px;
                    min-width: 1.5rem;
                    text-align: center;
                }

                .suggestion-name :global(mark),
                .suggestion-xid :global(mark) {
                    background: rgba(100, 255, 218, 0.25);
                    color: inherit;
                    padding: 0 1px;
                    border-radius: 2px;
                }

                .autocomplete-empty {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    padding: 0.75rem 1rem;
                    background: #1a1a2e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    margin-top: 4px;
                    color: #8892b0;
                    font-size: 0.9rem;
                    text-align: center;
                }

                .autocomplete-loading {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                }

                .loading-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: #64ffda;
                    border-radius: 50%;
                    animation: pulse 1s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
