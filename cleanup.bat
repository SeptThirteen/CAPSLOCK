@echo off
for /d %%i in (tmpclaude-*) do (
    echo Deleting %%i...
    rd /s /q "%%i"
)
echo Done!
