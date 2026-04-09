@echo off

:: Check for admin privileges and elevate if needed
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c', '\"%~f0\"' -Verb RunAs"
    exit /b
)

setlocal enabledelayedexpansion

:: Set the key and file pattern
set "REG_KEY=HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Epic Games\EOS"
set "REG_VALUE=OverlayPath"
set "FILE_PATTERN1=*EOSOverlay*"
set "FILE_PATTERN2=*EOSOVH*"

echo ===================================
echo Epic Games Store Overlay Disable Script
echo Author: ChemBoy1 - Version: 1.1.0
echo Description: Disables the EGS Overlay by deleting
echo    "EOSOverlay" and "EOSOVH" files.
echo ===================================
echo.
echo Using Administrator Privileges...
echo.

:: Get EGS Overlay path from registry
echo Reading registry key: %REG_KEY%
echo Value: %REG_VALUE%
echo.

:: Read registry
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

:: Display EOS Overlay path
echo Using EOS Overlay files path: !BASE_PATH!
echo.

:: Convert to short path to avoid spaces and parentheses
if not exist "!BASE_PATH!" (
    echo WARNING: EOS Overlay path does not exist: !BASE_PATH!
    set "BASE_PATH="
) else (
    for %%i in ("!BASE_PATH!") do set "SHORT_PATH=%%~si"
    if "!SHORT_PATH!"=="" (
        echo ERROR: Could not convert EOS path to short format.
        echo Original path: !BASE_PATH!
        echo.
        timeout /t 30
        exit
    )
    set "BASE_PATH=!SHORT_PATH!"
)

:: Check if EOS path exists (may have been cleared by short path check above)
if defined BASE_PATH (
    set "EOS_EXISTS=1"
) else (
    set "EOS_EXISTS=0"
)

:: Build the Launcher path by going up to Epic Games folder and adding the rest
if "!EOS_EXISTS!"=="1" (
    for %%i in ("!BASE_PATH!\..\..\..") do set "EPIC_GAMES_PATH=%%~fi"
    set "LAUNCHER_PATH=!EPIC_GAMES_PATH!\Launcher\Portal\Extras\Overlay"
) else (
    set "LAUNCHER_PATH=C:\Program Files (x86)\Epic Games\Launcher\Portal\Extras\Overlay"
)

if not exist "!LAUNCHER_PATH!" (
    echo WARNING: Launcher Overlay path does not exist: !LAUNCHER_PATH!
    set "LAUNCHER_EXISTS=0"
    echo.
) else (
    for %%i in ("!LAUNCHER_PATH!") do set "SHORT_PATH=%%~si"
    if "!SHORT_PATH!"=="" (
        echo ERROR: Could not convert Launcher path to short format.
        echo Original path: !LAUNCHER_PATH!
        echo.
        timeout /t 30
        exit
    )
    set "LAUNCHER_PATH=!SHORT_PATH!"
    set "LAUNCHER_EXISTS=1"
)

:: Display Launcher Overlay path
echo Using Launcher Overlay files path: !LAUNCHER_PATH!
echo.

:: Display files to be deleted (confirmation)
echo Files matching patterns "%FILE_PATTERN1%" and "%FILE_PATTERN2%":
echo.

set "FILES_FOUND=0"
set "LAUNCHER_FILES_FOUND=0"

if "!EOS_EXISTS!"=="1" (
    echo In EOS Overlay path:
    call :ListFilesIn "!BASE_PATH!"
    set "FILES_FOUND=!FOUND!"
    if "!FILES_FOUND!"=="0" (
        echo No files found.
    )
    echo.
)
if "!LAUNCHER_EXISTS!"=="1" (
    echo In Launcher Overlay path:
    call :ListFilesIn "!LAUNCHER_PATH!"
    set "LAUNCHER_FILES_FOUND=!FOUND!"
    if "!LAUNCHER_FILES_FOUND!"=="0" (
        echo No files found.
    )
    echo.
)

:: Check if any files were found at all
if "!EOS_EXISTS!"=="0" if "!LAUNCHER_EXISTS!"=="0" (
    echo ERROR: Neither path exists. Cannot proceed. 
    echo It is likely that Epic Games Store is not installed.
    echo.
    ::echo Exiting in 30 seconds... Press any key to close immediately.
    timeout /t 30
    exit
)

if "!FILES_FOUND!"=="0" if "!LAUNCHER_FILES_FOUND!"=="0" (
    echo No files to delete.
    echo Note that you will need to run this script again when Epic Games Store updates.
    echo.
    ::echo Exiting in 30 seconds... Press any key to close immediately.
    timeout /t 30
    exit
)

:: Prompt for confirmation
set /p "CONFIRM=Delete these files? (Y/N): "
if /i not "!CONFIRM!"=="Y" (
    echo Operation cancelled. No files deleted. Overlay will not be disabled.
    echo.
    ::echo Exiting in 30 seconds... Press any key to close immediately.
    timeout /t 30
    exit
)

:: Delete the files
set "DELETE_SUCCESS=1"

if "!EOS_EXISTS!"=="1" (
    echo Deleting files from EOS Overlay path...
    call :DeleteFilesIn "!BASE_PATH!"
    if "!DELETE_FAILED!"=="1" set "DELETE_SUCCESS=0"
    echo.
)

if "!LAUNCHER_EXISTS!"=="1" (
    echo Deleting files from Launcher Overlay path...
    call :DeleteFilesIn "!LAUNCHER_PATH!"
    if "!DELETE_FAILED!"=="1" set "DELETE_SUCCESS=0"
    echo.
)

if "!DELETE_SUCCESS!"=="1" (
    echo Files deleted successfully!
    echo.
) else (
    echo WARNING: Some files could not be deleted or no files were found.
    echo.
    ::echo Window will close in 30 seconds... Press any key to close immediately.
    timeout /t 30
    exit
)

:: Completion message
echo.
echo OPERATION COMPLETE
echo.
echo Note that you will need to run this script again when Epic Games Store updates.
::echo.
::echo Window will close in 30 seconds... Press any key to close immediately.
timeout /t 30
exit

:: METHODS

:ListFilesIn
set "FOUND=0"
for /f "delims=" %%f in ('dir /s /b "%~1\!FILE_PATTERN1!" 2^>nul') do (
    echo %%f
    set "FOUND=1"
)
for /f "delims=" %%f in ('dir /s /b "%~1\!FILE_PATTERN2!" 2^>nul') do (
    echo %%f
    set "FOUND=1"
)
exit /b

:DeleteFilesIn
set "DELETE_FAILED=0"
del /s /q "%~1\!FILE_PATTERN1!" 2>nul
del /s /q "%~1\!FILE_PATTERN2!" 2>nul
:: Verify files are actually gone
for /f "delims=" %%f in ('dir /s /b "%~1\!FILE_PATTERN1!" 2^>nul') do (
    set "DELETE_FAILED=1"
)
for /f "delims=" %%f in ('dir /s /b "%~1\!FILE_PATTERN2!" 2^>nul') do (
    set "DELETE_FAILED=1"
)
exit /b