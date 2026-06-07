#!/bin/bash
# V4 Position Event Sync - Cron wrapper
# 用于 OpenClaw cron 调用，输出通知摘要

cd "$(dirname "$0")/.."

# 运行同步
OUTPUT=$(npx ts-node src/scripts/sync-v4-events.ts 2>&1)

# 检查是否有新事件
if echo "$OUTPUT" | grep -q "新增.*个事件"; then
  # 提取通知摘要（从 🔔 开始的部分）
  SUMMARY=$(echo "$OUTPUT" | sed -n '/🔔/,$ p')
  echo "$SUMMARY"
elif echo "$OUTPUT" | grep -q "❌"; then
  echo "⚠️ V4 事件同步失败"
  echo "$OUTPUT" | tail -5
else
  echo "HEARTBEAT_OK"
fi
