# FitOS Windows 浏览器预览

在仓库根目录打开 PowerShell，运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-fitos-preview.ps1
```

脚本首次运行会在已忽略的 `local/` 目录安装固定版本 Bun（如果系统没有 Bun），再尝试按 `bun.lock` 安装依赖。如果 Windows 上 Bun 安装依赖失败，脚本会退回到仅用于 Web 预览的 npm 安装。启动后自动打开 <http://localhost:8090/>。再次运行会打开现有预览。终端会打印服务 PID 和停止命令。

浏览器页面可操作「概览」「计划」「今日训练」「历史」：选择 12 周中的任意一周和三天/四天节奏，选择课程，填写逐组重量与次数，标记完成，使用休息计时，保存训练，记录体重。三天节奏按照已完成的训练跨周轮换 Push → Pull → Legs → Upper。

Web 入口是 `index.web.tsx`，与原生 `index.ts` 分开。Web 只复用公开计划数据及纯训练逻辑，日志写到当前浏览器 `localStorage`。原生 App 继续使用 Expo SQLite。浏览器预览数据不会同步到 iPhone；预览不访问 HealthKit、Apple Watch、MMKV 或原生训练模块。清除浏览器站点数据会删除预览记录。请勿将 `local/` 下的个人记录提交到 Git。

Windows 可运行的检查：`bun run lint`、`bun run typecheck`、`bun run test:ci`，以及 `bunx expo export --platform web`。浏览器预览不代表 iOS 原生构建或真机健康数据同步已通过。
