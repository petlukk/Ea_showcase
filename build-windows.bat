@echo off
title Build Eä Performance Showcase (Windows)

:: ── Reset PATH before vcvars64.bat ───────────────────────────────────────────
:: The inherited PowerShell PATH can exceed CMD's 8191-char limit once vcvars
:: prepends MSVC entries. Start from a clean minimal PATH instead.
set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0"

echo Setting up MSVC environment...
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 (
    echo Failed to initialize MSVC environment
    exit /b 1
)

:: Add user tools back that vcvars64.bat doesn't know about
set "PATH=%PATH%;%USERPROFILE%\.cargo\bin"
set "PATH=%PATH%;C:\Program Files\nodejs"
set "PATH=%PATH%;C:\Program Files\Git\cmd"
set "PATH=%PATH%;%APPDATA%\npm"
set "PATH=%PATH%;C:\Program Files\LLVM\bin"
:: LLVM 18 tools (lld-link.exe) — ea.exe invokes this to produce .dll files
set "PATH=%PATH%;C:\llvm-18-msvc\bin"

:: Add Python (check common per-user install locations)
if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
    set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python313"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python312"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python311"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python310"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python39\python.exe" (
    set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python39"
) else (
    echo WARNING: Python not found in common locations. PyInstaller step may fail.
    set "PYTHON_DIR="
)
if defined PYTHON_DIR (
    set "PATH=%PATH%;%PYTHON_DIR%;%PYTHON_DIR%\Scripts"
    echo   Python: %PYTHON_DIR%
)

echo WinSDK: %WindowsSdkDir%

echo.
echo ============================================================
echo   Step 1: Build ea.exe (Eä compiler for Windows)
echo ============================================================
echo.

set LLVM_SYS_180_PREFIX=C:\llvm-18-msvc

if not exist "%LLVM_SYS_180_PREFIX%\bin\llvm-config.exe" (
    echo ERROR: llvm-config.exe not found at %LLVM_SYS_180_PREFIX%\bin\
    pause
    exit /b 1
)
echo   LLVM: %LLVM_SYS_180_PREFIX%
echo   MSVC: %VCToolsInstallDir%

:: Create libxml2s.lib stub if missing.
:: The LLVM MSVC tarball was built with libxml2 but doesn't ship it.
:: The Eä compiler never calls LLVM's XML/manifest code, so an empty
:: placeholder lib is enough to satisfy the linker.
if not exist "%LLVM_SYS_180_PREFIX%\lib\libxml2s.lib" (
    echo   Creating libxml2s.lib stub...
    echo int _libxml2_stub = 0; > "%TEMP%\_xml2stub.c"
    cl.exe /nologo /c /W0 /Fo"%TEMP%\_xml2stub.obj" "%TEMP%\_xml2stub.c" >nul 2>&1
    lib.exe /nologo /machine:x64 /out:"%LLVM_SYS_180_PREFIX%\lib\libxml2s.lib" "%TEMP%\_xml2stub.obj" >nul 2>&1
    del "%TEMP%\_xml2stub.c" "%TEMP%\_xml2stub.obj" >nul 2>&1
    echo   Done.
)

echo   Building ea.exe (this takes 1-3 min on first run)...
cd /d C:\Users\peter\Desktop\EA2\E-
cargo build --release
if errorlevel 1 (
    echo.
    echo ERROR: ea.exe build failed. See output above.
    pause
    exit /b 1
)

echo.
echo   Copying ea.exe to Speed_UI\resources\...
if not exist "C:\Users\peter\Desktop\Speed_UI\resources" mkdir "C:\Users\peter\Desktop\Speed_UI\resources"
copy /y "C:\Users\peter\Desktop\EA2\E-\target\release\ea.exe" "C:\Users\peter\Desktop\Speed_UI\resources\ea.exe"
echo   Done: Speed_UI\resources\ea.exe

echo.
echo ============================================================
echo   Step 2: Pre-compile Eä kernels to DLLs
echo ============================================================
echo.
:: This runs on the dev machine where ea.exe + MSVC link.exe are available.
:: The resulting DLLs are bundled with the installer so end users need neither
:: ea.exe at runtime nor any linker or compiler installed.

if not exist "C:\Users\peter\Desktop\Speed_UI\resources\kernels" (
    mkdir "C:\Users\peter\Desktop\Speed_UI\resources\kernels"
)

set "EA_PATH=C:\Users\peter\Desktop\Speed_UI\resources\ea.exe"
:: EA_LINKER_DIR tells compile_ea to explicitly prepend this to PATH for ea.exe.
:: ea.exe was built with llvm-18-msvc and invokes lld-link.exe from that dir.
set "EA_LINKER_DIR=C:\llvm-18-msvc\bin"
echo   EA_PATH: %EA_PATH%
echo   EA_LINKER_DIR: %EA_LINKER_DIR%
echo   Compiling 7 kernels...

python "C:\Users\peter\Desktop\Speed_UI\benchmarks\run_benchmark.py" ^
    --build-kernels "C:\Users\peter\Desktop\Speed_UI\resources\kernels"
if errorlevel 1 (
    echo.
    echo ERROR: Kernel compilation failed. See output above.
    pause
    exit /b 1
)
echo   Done: Speed_UI\resources\kernels\

echo.
echo ============================================================
echo   Step 3: Build run_benchmark.exe (self-contained Python+NumPy)
echo ============================================================
echo.

:: Ensure PyInstaller and NumPy are installed
python -m pip install pyinstaller numpy --quiet --disable-pip-version-check
if errorlevel 1 (
    echo ERROR: pip install failed. Make sure Python is in PATH.
    pause
    exit /b 1
)

:: Freeze run_benchmark.py into a single .exe with Python+NumPy embedded.
:: --onefile   = single .exe, no extraction directory needed by end user
:: --distpath  = output goes straight to resources\
:: --workpath / --specpath = temp build files go to %TEMP% (keep repo clean)
echo   Running PyInstaller...
python -m PyInstaller ^
    --onefile ^
    --name run_benchmark ^
    --distpath "C:\Users\peter\Desktop\Speed_UI\resources" ^
    --workpath "%TEMP%\pyinstaller_build" ^
    --specpath "%TEMP%" ^
    "C:\Users\peter\Desktop\Speed_UI\benchmarks\run_benchmark.py"
if errorlevel 1 (
    echo.
    echo ERROR: PyInstaller failed. See output above.
    pause
    exit /b 1
)
echo   Done: Speed_UI\resources\run_benchmark.exe

echo.
echo ============================================================
echo   Step 4: Build Electron app (Windows installer + zip)
echo ============================================================
echo.

cd /d C:\Users\peter\Desktop\Speed_UI

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found in PATH. Install Node.js from nodejs.org
    pause
    exit /b 1
)

echo   Installing npm dependencies...
npm install

echo   Running: npm run build:win
npm run build:win
if errorlevel 1 (
    echo.
    echo ERROR: Electron build failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   BUILD COMPLETE
echo ============================================================
echo.
echo   Outputs in: C:\Users\peter\Desktop\Speed_UI\dist\
dir "C:\Users\peter\Desktop\Speed_UI\dist\" /b
echo.
pause
