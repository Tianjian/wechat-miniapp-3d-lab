@echo off
rem 3d-lab\tools\node.cmd - resolve Node: NODE_EXE > PATH > DSH bundled runtime
setlocal
if defined NODE_EXE goto :use_env
where node >nul 2>nul
if %ERRORLEVEL%==0 goto :use_path
set "BUNDLED=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if exist "%BUNDLED%" goto :use_bundled
echo [tools] Node runtime not found. Set NODE_EXE or add Node to PATH.
exit /b 1

:use_env
"%NODE_EXE%" %*
exit /b %ERRORLEVEL%

:use_path
node %*
exit /b %ERRORLEVEL%

:use_bundled
"%BUNDLED%" %*
exit /b %ERRORLEVEL%
