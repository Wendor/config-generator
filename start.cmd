chcp 65001
@echo off

IF NOT EXIST node_modules (
    echo "Установка зависимостей"
    npm i && npm run start
) ELSE (
    npm run start
)
