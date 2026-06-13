#!/bin/bash
cd /home/suchen/calc-tools-v2

# 提取 token
TOKEN=$(grep "github.com" ~/.git-credentials 2>/dev/null | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')

# 创建临时目录
rm -rf /tmp/gh-pages-deploy
mkdir -p /tmp/gh-pages-deploy
cp -r dist/* /tmp/gh-pages-deploy/

# 进入临时目录并初始化 git
cd /tmp/gh-pages-deploy
git init
git add .
git commit -m "Deploy with Link wrapper for BentoCard"

# 添加 remote 并推送
git remote add origin https://zzsscc1001:${TOKEN}@github.com/zzsscc1001/calc-tools-v2.git
git push -f origin master:gh-pages 2>&1
