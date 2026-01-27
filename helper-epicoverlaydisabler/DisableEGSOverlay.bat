:: Author: ChemBoy1
:: Version: 1.0.0
:: Script Description: Disables the EGS Overlay by deleting "EOSOverlay" files.

@echo off

:: Check for administrator privileges and auto-elevate if needed
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/k', '\"%~f0\"' -Verb RunAs"
    exit /b
)

setlocal enabledelayedexpansion

:: Set the key and file pattern
set "REG_KEY=HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Epic Games\EOS"
set "REG_VALUE=OverlayPath"
set "FILE_PATTERN=*EOSOverlay*"

echo ========================================
echo Epic Games Store Overlay Disable Script
echo ========================================
echo.
echo Running with Administrator privileges...
echo.

:: Get EGS Overlay path from registry
echo Reading registry key: %REG_KEY%
echo Value name: %REG_VALUE%
echo.

for /f "tokens=2*" %%a in ('reg query "%REG_KEY%" /v "%REG_VALUE%" 2^>nul ^| findstr /i "%REG_VALUE%"') do (
    set "BASE_PATH=%%b"
)

:: Remove any surrounding quotes and trailing spaces from the path
if defined BASE_PATH (
    set BASE_PATH=!BASE_PATH:"=!
    for /f "tokens=*" %%a in ("!BASE_PATH!") do set "BASE_PATH=%%a"
)

:: Check if registry value was found, if not use default path
if not defined BASE_PATH (
    echo WARNING: Registry key not found. Using default Epic Games path.
    set "BASE_PATH=C:\Program Files (x86)\Epic Games\Epic Online Services\managedArtifacts\98bc04bc842e4906993fd6d6644ffb8d"
    echo.
)

echo Found EGS path: !BASE_PATH!
echo.

:: Convert to short path (8.3 format) to avoid spaces and parentheses
for %%i in ("!BASE_PATH!") do set "BASE_PATH=%%~si"

:: Build the Launcher path by going up to Epic Games folder and adding the rest
for %%i in ("!BASE_PATH!\..\..\..") do set "EPIC_GAMES_PATH=%%~fi"
set "LAUNCHER_PATH=!EPIC_GAMES_PATH!\Launcher\Portal\Extras\Overlay"
for %%i in ("!LAUNCHER_PATH!") do set "LAUNCHER_PATH=%%~si"

:: Check if the EOS path exists
if not exist "!BASE_PATH!" (
    echo WARNING: EGS Overlay path does not exist: !BASE_PATH!
    echo Will only check Launcher Overlay path.
    set "EOS_EXISTS=0"
    echo.
) else (
    set "EOS_EXISTS=1"
)

echo Launcher Overlay path: !LAUNCHER_PATH!
echo.

:: Check if the Launcher path exists
if not exist "!LAUNCHER_PATH!" (
    echo WARNING: Launcher Overlay path does not exist: !LAUNCHER_PATH!
    echo Will only process EGS Overlay path.
    set "LAUNCHER_EXISTS=0"
    echo.
) else (
    set "LAUNCHER_EXISTS=1"
)

:: Display files to be deleted (confirmation)
echo Files matching pattern "%FILE_PATTERN%":
echo.
if "!EOS_EXISTS!"=="1" (
    echo In EOS Overlay path:
    call :ListFiles
    if "!FILES_FOUND!"=="0" (
        echo No files found.
    )
    echo.
)
if "!LAUNCHER_EXISTS!"=="1" (
    echo In Launcher Overlay path:
    call :ListLauncherFiles
    if "!LAUNCHER_FILES_FOUND!"=="0" (
        echo No files found.
    )
    echo.
)

:: Check if any files were found at all
if "!EOS_EXISTS!"=="0" (
    if "!LAUNCHER_EXISTS!"=="0" (
        echo ERROR: Neither path exists. Cannot proceed.
        timeout /t 30
        exit
    )
    if "!LAUNCHER_FILES_FOUND!"=="0" (
        echo No files to delete. Exiting in 30 seconds...
        echo Press any key to close immediately.
        timeout /t 30
        exit
    )
)
if "!FILES_FOUND!"=="0" (
    if "!LAUNCHER_EXISTS!"=="0" (
        echo No files to delete. Exiting in 30 seconds...
        echo Press any key to close immediately.
        timeout /t 30
        exit
    )
    if "!LAUNCHER_FILES_FOUND!"=="0" (
        echo No files to delete. Exiting in 30 seconds...
        echo Press any key to close immediately.
        timeout /t 30
        exit
    )
)

:: Prompt for confirmation
set /p "CONFIRM=Delete these files? (Y/N): "
if /i not "!CONFIRM!"=="Y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

:: Delete the files
echo.
if "!EOS_EXISTS!"=="1" (
    echo Deleting files from EOS Overlay path...
    call :DeleteFiles
)

if "!LAUNCHER_EXISTS!"=="1" (
    echo Deleting files from Launcher Overlay path...
    call :DeleteLauncherFiles
)

if !errorlevel! equ 0 (
    echo Files deleted successfully!
) else (
    echo Some files could not be deleted or no files were found.
)

echo.
echo Operation complete.
pause
exit /b

:ListFiles
set "FILES_FOUND=0"
for /f %%f in ('dir /s /b "!BASE_PATH!\*EOSOverlay*" 2^>nul') do (
    echo %%f
    set "FILES_FOUND=1"
)
exit /b

:ListLauncherFiles
set "LAUNCHER_FILES_FOUND=0"
for /f %%f in ('dir /s /b "!LAUNCHER_PATH!\*EOSOverlay*" 2^>nul') do (
    echo %%f
    set "LAUNCHER_FILES_FOUND=1"
)
exit /b

:DeleteFiles
del /s /q "!BASE_PATH!\*EOSOverlay*" 2>nul
exit /b

:DeleteLauncherFiles
del /s /q "!LAUNCHER_PATH!\*EOSOverlay*" 2>nul
exit /b