@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo   Udemy Extension Packager for GitHub Release
echo ====================================================
echo.

:: Read version from manifest.json using PowerShell
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content manifest.json | ConvertFrom-Json).version"') do set "VERSION=%%i"

if "%VERSION%"=="" (
    echo [ERROR] Could not read version from manifest.json
    pause
    exit /b 1
)

echo [INFO] Extension version detected: v%VERSION%

:: Accept optional version override from argument (e.g. called by skill)
if not "%~1"=="" set "VERSION=%~1"

set "RELEASE_DIR=release"
set "HISTORY_DIR=release-history\v%VERSION%"
set "ZIP_NAME=Udemy-One-Click-Course-Downloader-v%VERSION%.zip"
set "ZIP_PATH=%RELEASE_DIR%\%ZIP_NAME%"

:: Create release directory if it doesn't exist
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

:: Create versioned history directory if it doesn't exist
if not exist "%HISTORY_DIR%" (
    echo [INFO] Creating release history folder: %HISTORY_DIR%
    mkdir "%HISTORY_DIR%"
)

:: Delete old zip for same version if it exists
if exist "%ZIP_PATH%" (
    echo [INFO] Removing old zip: %ZIP_PATH%
    del "%ZIP_PATH%"
)

echo [INFO] Zipping extension files...

powershell -NoProfile -Command "Compress-Archive -Path 'manifest.json', 'background.js', 'content.js', 'popup.html', 'popup.js', 'images' -DestinationPath '%ZIP_PATH%' -Force"

if exist "%ZIP_PATH%" (
    echo.
    echo [SUCCESS] Extension v%VERSION% successfully packaged!
    echo [SUCCESS] Zip ready at: %cd%\%ZIP_PATH%
    echo [SUCCESS] History folder: %cd%\%HISTORY_DIR%
    echo.
    echo ZIP_PATH=%ZIP_PATH%
    echo VERSION=%VERSION%
    echo HISTORY_DIR=%HISTORY_DIR%
) else (
    echo.
    echo [ERROR] Failed to create the zip file.
    exit /b 1
)

pause
