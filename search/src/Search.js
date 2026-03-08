import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const TRENDING = ["Laptop", "Headphones", "Smart Watch", "Gaming", "Camera", "iPhone"];

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
      <mark style={{ background: "rgba(255,63,108,0.18)", color: "#ff3f6c", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
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
          (p.brand    && p.brand.toLowerCase().includes(query.toLowerCase())) ||
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
      if (selIdx >= 0 && results[selIdx]) handleSelect(results[selIdx].id);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelIdx(-1);
      inputRef.current?.blur();
    }
  };

  const showDropdown  = isOpen;
  const showTrending  = showDropdown && query.trim().length === 0;
  const showResults   = showDropdown && query.trim().length > 0;

  return (
    <Box
      ref={wrapperRef}
      sx={{ position: "relative", flex: 1, maxWidth: 560 }}
    >
      {/* ── Search bar ── */}
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          bgcolor: isOpen ? "#fff" : "#f5f5f6",
          border: "1.5px solid",
          borderColor: isOpen ? "primary.main" : "transparent",
          borderRadius: 1,
          px: 1.5,
          height: 40,
          gap: 0.5,
          transition: "all 0.2s",
          boxShadow: isOpen ? "0 0 0 3px rgba(255,63,108,0.1)" : "none",
        }}
      >
        {loading
          ? <CircularProgress size={16} color="primary" sx={{ flexShrink: 0 }} />
          : <SearchIcon sx={{ fontSize: 18, color: "text.disabled", flexShrink: 0 }} />
        }
        <InputBase
          inputRef={inputRef}
          value={query}
          placeholder="Search for products, brands and more"
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setSelIdx(-1); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          sx={{ flex: 1, fontSize: "0.88rem", "& input": { p: 0 } }}
        />
        {query ? (
          <IconButton
            size="small"
            onClick={() => { setQuery(""); setSelIdx(-1); inputRef.current?.focus(); }}
            tabIndex={-1}
            sx={{ p: 0.25, color: "text.disabled" }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : (
          <Typography variant="caption" sx={{ color: "text.disabled", bgcolor: "#eee", borderRadius: 0.5, px: 0.75, py: 0.25, fontFamily: "monospace", flexShrink: 0 }}>
            ⌘K
          </Typography>
        )}
      </Paper>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            bgcolor: "#fff",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            zIndex: 9999,
            overflow: "hidden",
            animation: "dropIn 0.15s ease",
            "@keyframes dropIn": {
              from: { opacity: 0, transform: "translateY(-8px)" },
              to:   { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          {/* ── Trending ── */}
          {showTrending && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 2, pt: 1.5, pb: 0.75 }}>
                <TrendingUpIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "text.disabled" }}>
                  Trending Searches
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, p: 1.5 }}>
                {TRENDING.map((term) => (
                  <Chip
                    key={term}
                    label={term}
                    size="small"
                    icon={<TrendingUpIcon />}
                    onClick={() => handleTrending(term)}
                    variant="outlined"
                    sx={{
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      "&:hover": { bgcolor: "rgba(255,63,108,0.06)", borderColor: "primary.main", color: "primary.main" },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* ── Results ── */}
          {showResults && (
            <>
              {results.length === 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 5, gap: 1 }}>
                  <Typography sx={{ fontSize: "2.2rem" }}>🔎</Typography>
                  <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 500 }}>
                    No results for <strong>"{query}"</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Try searching for brands or categories
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 2, pt: 1.5, pb: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "text.disabled" }}>
                      📦 Products
                    </Typography>
                    <Box
                      component="span"
                      sx={{ ml: "auto", bgcolor: "rgba(255,63,108,0.08)", color: "primary.main", px: 1, py: 0.1, borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}
                    >
                      {results.length} found
                    </Box>
                  </Box>
                  <Divider />
                  <Box
                    component="ul"
                    role="listbox"
                    sx={{ m: 0, p: "4px 0", listStyle: "none", maxHeight: 380, overflowY: "auto", scrollbarWidth: "thin" }}
                  >
                    {results.map((product, i) => (
                      <Box
                        component="li"
                        key={product.id}
                        role="option"
                        aria-selected={selIdx === i}
                        onClick={() => handleSelect(product.id)}
                        onMouseEnter={() => setSelIdx(i)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          px: 2,
                          py: 1.25,
                          cursor: "pointer",
                          bgcolor: selIdx === i ? "rgba(255,63,108,0.04)" : "transparent",
                          opacity: product.inStock === false ? 0.6 : 1,
                          "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
                          transition: "background 0.1s",
                        }}
                      >
                        {/* Thumbnail */}
                        <Box
                          sx={{
                            width: 48, height: 48,
                            borderRadius: 1,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "1.6rem",
                            flexShrink: 0,
                            bgcolor: CATEGORY_COLORS[product.category] || "#f5f5f5",
                          }}
                        >
                          {product.image}
                        </Box>

                        {/* Info */}
                        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.25 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", color: "text.primary" }}>
                            <Highlight text={product.brand || ""} query={query} />
                          </Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <Highlight text={product.name} query={query} />
                          </Typography>
                          <Box
                            component="span"
                            sx={{
                              display: "inline-block",
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              px: 0.75, py: 0.2,
                              borderRadius: 10,
                              bgcolor: CATEGORY_COLORS[product.category] || "#f5f5f5",
                              color: "text.primary",
                              width: "fit-content",
                            }}
                          >
                            <Highlight text={product.category || ""} query={query} />
                          </Box>
                        </Box>

                        {/* Price + stock */}
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                            ${product.price?.toLocaleString()}
                          </Typography>
                          {product.inStock === false && (
                            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                              Out of stock
                            </Typography>
                          )}
                        </Box>

                        <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled", flexShrink: 0 }} />
                      </Box>
                    ))}
                  </Box>

                  {/* Footer hints */}
                  <Divider />
                  <Box sx={{ px: 2, py: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="caption" color="text.disabled">
                      Press
                    </Typography>
                    {["↑", "↓"].map((k) => (
                      <Box key={k} component="kbd" sx={{ bgcolor: "#f0f0f0", border: "1px solid #ddd", borderRadius: 0.5, px: 0.75, py: 0.1, fontSize: "0.68rem", fontFamily: "monospace", color: "text.primary", mx: 0.25 }}>
                        {k}
                      </Box>
                    ))}
                    <Typography variant="caption" color="text.disabled">to navigate ·</Typography>
                    <Box component="kbd" sx={{ bgcolor: "#f0f0f0", border: "1px solid #ddd", borderRadius: 0.5, px: 0.75, py: 0.1, fontSize: "0.68rem", fontFamily: "monospace", color: "text.primary", mx: 0.25 }}>
                      Enter
                    </Box>
                    <Typography variant="caption" color="text.disabled">to select ·</Typography>
                    <Box component="kbd" sx={{ bgcolor: "#f0f0f0", border: "1px solid #ddd", borderRadius: 0.5, px: 0.75, py: 0.1, fontSize: "0.68rem", fontFamily: "monospace", color: "text.primary", mx: 0.25 }}>
                      Esc
                    </Box>
                    <Typography variant="caption" color="text.disabled">to close</Typography>
                  </Box>
                </>
              )}
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default Search;
