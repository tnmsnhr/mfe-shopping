import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import "./Search.css";

const TRENDING = [
  "Laptop", "Headphones", "Smart Watch", "Gaming", "Camera", "iPhone",
];

const CATEGORY_COLORS = {
  Electronics: "#e8f4fd",
  Audio:       "#fef3e8",
  Wearables:   "#e8fef3",
  Cameras:     "#fde8f4",
  Gaming:      "#ede8fe",
  Accessories: "#fefde8",
};

// Highlight matching portion of text
const Highlight = ({ text = "", query = "" }) => {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
};

const Search = () => {
  const navigate   = useNavigate();
  const inputRef   = useRef(null);
  const wrapperRef = useRef(null);

  const [query,    setQuery]    = useState("");
  const [products, setProducts] = useState([]);
  const [isOpen,   setIsOpen]   = useState(false);
  const [selIdx,   setSelIdx]   = useState(-1);
  const [loading,  setLoading]  = useState(false);

  // Fetch all products once for client-side filtering
  useEffect(() => {
    setLoading(true);
    api.getProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Click outside → close
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSelIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter products by query (name, brand, category)
  const results = query.trim().length > 0
    ? products
        .filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.brand  && p.brand.toLowerCase().includes(query.toLowerCase())) ||
          (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 8)
    : [];

  const handleSelect = useCallback((productId) => {
    setIsOpen(false);
    setQuery("");
    setSelIdx(-1);
    navigate(`/product/${productId}`);
  }, [navigate]);

  const handleTrending = (term) => {
    setQuery(term);
    setSelIdx(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (selIdx >= 0 && results[selIdx]) {
        handleSelect(results[selIdx].id);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelIdx(-1);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSelIdx(-1);
    inputRef.current?.focus();
  };

  const showDropdown = isOpen;
  const showTrending = showDropdown && query.trim().length === 0;
  const showResults  = showDropdown && query.trim().length > 0;

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      {/* ── Input bar ── */}
      <div className={`search-bar ${isOpen ? "active" : ""}`}>
        <span className="search-bar-icon">
          {loading ? <span className="search-spinner" /> : "🔍"}
        </span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search for products, brands and more"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelIdx(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {query && (
          <button className="search-clear-btn" onClick={clearSearch} tabIndex={-1}>
            ✕
          </button>
        )}
        {!query && (
          <span className="search-kbd">⌘K</span>
        )}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div className="search-dropdown">
          {/* ── Trending ── */}
          {showTrending && (
            <div className="search-section">
              <div className="search-section-label">
                <span className="section-label-icon">🔥</span> Trending Searches
              </div>
              <div className="trending-list">
                {TRENDING.map((term) => (
                  <button
                    key={term}
                    className="trending-item"
                    onClick={() => handleTrending(term)}
                  >
                    <span className="trending-icon">↗</span>
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {showResults && (
            <>
              {results.length === 0 ? (
                <div className="search-no-results">
                  <span className="no-results-icon">🔎</span>
                  <p>No results for <strong>"{query}"</strong></p>
                  <span className="no-results-hint">Try searching for brands or categories</span>
                </div>
              ) : (
                <>
                  <div className="search-section-label">
                    <span className="section-label-icon">📦</span>
                    Products
                    <span className="results-count">{results.length} found</span>
                  </div>
                  <ul className="results-list" role="listbox">
                    {results.map((product, i) => (
                      <li
                        key={product.id}
                        role="option"
                        aria-selected={selIdx === i}
                        className={`result-item ${selIdx === i ? "selected" : ""} ${!product.inStock ? "oos" : ""}`}
                        onClick={() => handleSelect(product.id)}
                        onMouseEnter={() => setSelIdx(i)}
                      >
                        {/* Emoji thumbnail */}
                        <div
                          className="result-thumb"
                          style={{ background: CATEGORY_COLORS[product.category] || "#f5f5f5" }}
                        >
                          {product.image}
                        </div>

                        {/* Info */}
                        <div className="result-info">
                          <span className="result-brand">
                            <Highlight text={product.brand || ""} query={query} />
                          </span>
                          <span className="result-name">
                            <Highlight text={product.name} query={query} />
                          </span>
                          <span
                            className="result-category-tag"
                            style={{ background: CATEGORY_COLORS[product.category] }}
                          >
                            <Highlight text={product.category || ""} query={query} />
                          </span>
                        </div>

                        {/* Price + stock */}
                        <div className="result-meta">
                          <span className="result-price">${product.price.toLocaleString()}</span>
                          {!product.inStock && (
                            <span className="result-oos">Out of stock</span>
                          )}
                        </div>

                        <span className="result-arrow">›</span>
                      </li>
                    ))}
                  </ul>

                  <div className="search-footer">
                    Press <kbd>↑</kbd><kbd>↓</kbd> to navigate &nbsp;·&nbsp;
                    <kbd>Enter</kbd> to select &nbsp;·&nbsp; <kbd>Esc</kbd> to close
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
