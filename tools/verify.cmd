@echo off
rem 3d-lab\tools\verify.cmd - static checks + mock smoke for 3D LAB
call "%~dp0node.cmd" "%~dp0..\scripts\verify.mjs" %*
exit /b %ERRORLEVEL%
