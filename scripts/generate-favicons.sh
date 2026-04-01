#!/bin/bash

# Favicon Generation Script
# Generates all favicon sizes deterministically from the master source
# Usage: npm run generate-favicons
# Source: public/favicon.png (should be 1024x1024 or larger)

set -e

SOURCE_IMAGE="public/favicon.png"
OUTPUT_DIR="public"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
  echo "❌ Error: Source image not found at $SOURCE_IMAGE"
  echo "Please ensure public/favicon.png exists (recommended: 1024x1024 or larger)"
  exit 1
fi

echo "🎨 Generating favicons from $SOURCE_IMAGE..."

# Generate favicon.ico (32x32)
echo "  → Generating favicon.ico (32x32)..."
ffmpeg -i "$SOURCE_IMAGE" -vf scale=32:32 "$OUTPUT_DIR/favicon.ico" -y 2>/dev/null || true

# Generate favicon-16x16.png
echo "  → Generating favicon-16x16.png..."
ffmpeg -i "$SOURCE_IMAGE" -vf scale=16:16 "$OUTPUT_DIR/favicon-16x16.png" -y 2>/dev/null || true

# Generate favicon-32x32.png
echo "  → Generating favicon-32x32.png..."
ffmpeg -i "$SOURCE_IMAGE" -vf scale=32:32 "$OUTPUT_DIR/favicon-32x32.png" -y 2>/dev/null || true

# Generate apple-touch-icon.png (180x180)
echo "  → Generating apple-touch-icon.png (180x180)..."
ffmpeg -i "$SOURCE_IMAGE" -vf scale=180:180 "$OUTPUT_DIR/apple-touch-icon.png" -y 2>/dev/null || true

echo "✅ Favicon generation complete!"
echo "Generated files:"
ls -lh "$OUTPUT_DIR"/favicon* "$OUTPUT_DIR"/apple-touch-icon.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
