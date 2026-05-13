#!/bin/bash
# Create WordPress plugin zip

PLUGIN_NAME="urban-churn-bakery-orders"
VERSION="2.0.0"
TEMP_DIR="/tmp/${PLUGIN_NAME}"
OUTPUT_ZIP="${PLUGIN_NAME}.zip"

# Clean up any existing temp and output
rm -rf "$TEMP_DIR"
rm -f "/home/runner/workspace/${OUTPUT_ZIP}"
mkdir -p "$TEMP_DIR"

# Copy plugin files
cp urban-churn-bakery-orders.php "$TEMP_DIR/"
cp readme.txt "$TEMP_DIR/"
cp CHANGELOG.md "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"
cp -r admin "$TEMP_DIR/"
cp -r assets "$TEMP_DIR/"
cp -r includes "$TEMP_DIR/"

# Copy public folder but exclude backup files
mkdir -p "$TEMP_DIR/public"
cp public/class-public.php "$TEMP_DIR/public/"

# Create languages directory
mkdir -p "$TEMP_DIR/languages"

# Remove any backup or temporary files
find "$TEMP_DIR" -name "*.backup" -delete
find "$TEMP_DIR" -name "*.bak" -delete
find "$TEMP_DIR" -name "*-FULL.php" -delete

echo "Plugin files copied to temp directory"

# Create zip file
cd /tmp
if command -v zip &> /dev/null; then
    zip -r "/home/runner/workspace/${OUTPUT_ZIP}" "${PLUGIN_NAME}" -q
    echo "✓ Created using zip command"
else
    # Fallback to tar if zip is not available
    tar -czf "/home/runner/workspace/${OUTPUT_ZIP}" "${PLUGIN_NAME}"
    echo "✓ Created using tar (install 'zip' package for better compatibility)"
fi

# Clean up
rm -rf "$TEMP_DIR"

echo "✓ Created: ${OUTPUT_ZIP}"
echo "✓ Plugin version: ${VERSION}"
echo "✓ Ready for WordPress installation"
echo ""
echo "To install:"
echo "1. Go to WordPress admin → Plugins → Add New → Upload Plugin"
echo "2. Choose ${OUTPUT_ZIP}"
echo "3. Click 'Install Now' and then 'Activate'"
