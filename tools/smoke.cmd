@echo off
rem tools\smoke.cmd - mock runtime smoke tests only
call "%~dp0node.cmd" "%~dp0..\scripts\smoke.mjs" %*
exit /b %ERRORLEVEL%
