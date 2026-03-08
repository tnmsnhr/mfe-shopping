import React from "react";
import { Link } from "react-router-dom";

import Box           from "@mui/material/Box";
import Card          from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent   from "@mui/material/CardContent";
import Typography    from "@mui/material/Typography";
import Chip          from "@mui/material/Chip";
import Rating        from "@mui/material/Rating";
import Tooltip       from "@mui/material/Tooltip";
import IconButton    from "@mui/material/IconButton";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon       from "@mui/icons-material/Favorite";

/**
 * ProductCard — shared card component exposed from the product-details MFE.
 *
 * Props:
 *   product         — product object from Firestore
 *   isWishlisted    — boolean, true if user has wishlisted this product
 *   onToggleWishlist — (event, productId) => void
 */
const ProductCard = ({ product, isWishlisted, onToggleWishlist }) => {
  const mrp      = product.mrp      || Math.round(product.price * 1.4);
  const discount = product.discount || Math.round((1 - product.price / mrp) * 100);

  return (
    <Card
      sx={{
        borderRadius: 2,
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow .2s",
        "&:hover": { boxShadow: "0 6px 20px rgba(0,0,0,0.1)" },
        "&:hover .product-img-emoji": { transform: "scale(1.1)" },
      }}
    >
      <CardActionArea
        component={Link}
        to={`/product/${product.id}`}
        sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
      >
        {/* ── Image area ── */}
        <Box
          sx={{
            position: "relative",
            height: 220,
            bgcolor: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Emoji thumbnail */}
          <Typography
            className="product-img-emoji"
            sx={{
              fontSize: "5rem",
              lineHeight: 1,
              transition: "transform .25s ease",
              display: "block",
              userSelect: "none",
            }}
          >
            {product.image}
          </Typography>

          {/* Discount badge */}
          {discount > 0 && (
            <Chip
              label={`${discount}% OFF`}
              size="small"
              sx={{
                position: "absolute",
                top: 10,
                left: 10,
                bgcolor: "#fce4ec",
                color: "primary.main",
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 22,
              }}
            />
          )}

          {/* Out-of-stock overlay */}
          {!product.inStock && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(255,255,255,0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Out of Stock
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── Product info ── */}
        <CardContent sx={{ p: 2, flex: 1 }}>
          {/* Brand */}
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {product.brand}
          </Typography>

          {/* Name */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mt: 0.25,
              mb: 0.75,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.name}
          </Typography>

          {/* Rating */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            <Rating value={product.rating ?? 0} precision={0.5} readOnly size="small" />
            <Typography variant="caption" color="text.secondary">
              ({product.reviews?.toLocaleString() ?? 0})
            </Typography>
          </Box>

          {/* Pricing */}
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
              ${product.price.toLocaleString()}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", textDecoration: "line-through" }}
            >
              ${mrp.toLocaleString()}
            </Typography>
            {discount > 0 && (
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                {discount}% off
              </Typography>
            )}
          </Box>

          {/* Free delivery badge */}
          {product.inStock && (
            <Typography
              variant="caption"
              color="success.main"
              sx={{ fontWeight: 600, mt: 0.5, display: "block" }}
            >
              ✔ Free Delivery
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      {/* ── Wishlist button (always above the CardActionArea z-index) ── */}
      <Tooltip title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.preventDefault();
            if (onToggleWishlist) onToggleWishlist(e, product.id);
          }}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(255,255,255,0.9)",
            "&:hover": { bgcolor: "#fff", color: "primary.main" },
            width: 32,
            height: 32,
          }}
        >
          {isWishlisted
            ? <FavoriteIcon       sx={{ fontSize: 18, color: "primary.main" }} />
            : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Tooltip>
    </Card>
  );
};

export default ProductCard;
