#!/usr/bin/env python3
"""
Create a proper ZIP file for WordPress plugin that Windows can read
"""
import os
import zipfile
from pathlib import Path

PLUGIN_NAME = "urban-churn-bakery-orders"
VERSION = "2.0.0"
OUTPUT_ZIP = f"{PLUGIN_NAME}.zip"

# Files and directories to include
FILES_TO_INCLUDE = [
    "urban-churn-bakery-orders.php",
    "readme.txt",
    "CHANGELOG.md",
    "README.md",
]

DIRS_TO_INCLUDE = [
    "admin",
    "assets",
    "includes",
]

def create_plugin_zip():
    """Create WordPress plugin ZIP file"""
    
    # Remove existing zip if present
    if os.path.exists(OUTPUT_ZIP):
        os.remove(OUTPUT_ZIP)
        print(f"Removed existing {OUTPUT_ZIP}")
    
    # Create ZIP file
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
        
        # Add individual files
        for filename in FILES_TO_INCLUDE:
            if os.path.exists(filename):
                arcname = f"{PLUGIN_NAME}/{filename}"
                zipf.write(filename, arcname)
                print(f"Added: {arcname}")
        
        # Add directories
        for dirname in DIRS_TO_INCLUDE:
            if os.path.isdir(dirname):
                for root, dirs, files in os.walk(dirname):
                    # Skip backup files
                    dirs[:] = [d for d in dirs if not d.startswith('.')]
                    
                    for file in files:
                        # Skip backup and temp files
                        if file.endswith(('.backup', '.bak', '-FULL.php')):
                            continue
                        
                        filepath = os.path.join(root, file)
                        arcname = f"{PLUGIN_NAME}/{filepath}"
                        zipf.write(filepath, arcname)
                        print(f"Added: {arcname}")
        
        # Add public/class-public.php specifically (not the backup files)
        public_file = "public/class-public.php"
        if os.path.exists(public_file):
            arcname = f"{PLUGIN_NAME}/{public_file}"
            zipf.write(public_file, arcname)
            print(f"Added: {arcname}")
        
        # Create empty languages directory
        languages_dir = f"{PLUGIN_NAME}/languages/"
        zipf.writestr(languages_dir, '')
        print(f"Added: {languages_dir}")
    
    # Get file size
    file_size = os.path.getsize(OUTPUT_ZIP)
    size_kb = file_size / 1024
    
    print("\n" + "="*60)
    print("✓ Created: " + OUTPUT_ZIP)
    print(f"✓ File size: {size_kb:.1f} KB ({file_size:,} bytes)")
    print(f"✓ Plugin version: {VERSION}")
    print("✓ Format: Standard ZIP (Windows compatible)")
    print("="*60)
    print("\nREADY FOR WORDPRESS INSTALLATION!")
    print("\nTo install:")
    print("1. Go to WordPress admin → Plugins → Add New → Upload Plugin")
    print(f"2. Choose {OUTPUT_ZIP}")
    print("3. Click 'Install Now' and then 'Activate'")

if __name__ == "__main__":
    os.chdir("/home/runner/workspace")
    create_plugin_zip()
