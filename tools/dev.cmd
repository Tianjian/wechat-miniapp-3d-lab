@echo off
rem tools\dev.cmd - open / preview / upload this project in WeChat DevTools
call "%~dp0node.cmd" "%~dp0..\scripts\devtools.mjs" %*
exit /b %ERRORLEVEL%
