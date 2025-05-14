#!/bin/bash

# 设置项目目录
PROJECT_DIR="/var/www/running.mom"

# 如果项目还在 /root 目录下，则使用该路径
if [ ! -d "$PROJECT_DIR" ]; then
  PROJECT_DIR="/root/web3-running-new"
fi

echo "开始在 $PROJECT_DIR 中查找并替换文本..."

# 查找所有文本文件（排除二进制文件、图片等）
find "$PROJECT_DIR" -type f -not -path "*/\.*" -not -path "*/node_modules/*" | while read -r file; do
  # 检查文件类型，只处理文本文件
  file_type=$(file -b "$file")
  if [[ $file_type == *"text"* || $file_type == *"ASCII"* || $file_type == *"UTF-8"* || 
        "$file" == *".js" || "$file" == *".html" || "$file" == *".css" || 
        "$file" == *".json" || "$file" == *".md" || "$file" == *".conf" ]]; then
    
    # 替换文本
    if grep -q "神庙逃亡" "$file" || grep -q "H5神庙逃亡" "$file"; then
      echo "处理文件: $file"
      
      # 创建备份
      cp "$file" "${file}.bak"
      
      # 替换文本
      sed -i 's/神庙逃亡/Running/g' "$file"
      sed -i 's/H5神庙逃亡/Running/g' "$file"
      
      echo "  已替换文本"
    fi
  fi
done

echo "替换完成！"