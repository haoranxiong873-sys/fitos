$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$local = Join-Path $projectRoot 'local\fitos'
$bunExe = (Get-Command bun -ErrorAction SilentlyContinue).Source
if (-not $bunExe) {
    $bunExe = Join-Path $local 'bun-tool\node_modules\@oven\bun-windows-x64-baseline\bin\bun.exe'
    if (-not (Test-Path -LiteralPath $bunExe)) {
        Write-Host '首次运行：安装固定版本的 Windows Bun（仅放在忽略的 local 目录）...'
        New-Item -ItemType Directory -Force -Path (Join-Path $local 'bun-tool') | Out-Null
        npm install --no-save --prefix (Join-Path $local 'bun-tool') '@oven/bun-windows-x64-baseline@1.3.14'
        if ($LASTEXITCODE -ne 0) { throw 'Bun 安装失败。请检查网络后重试。' }
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules\.bin\expo.exe'))) {
    Write-Host '首次运行：按 bun.lock 安装项目依赖...'
    Push-Location $projectRoot
    try {
        & $bunExe install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'Bun 安装未成功，尝试仅用于 Web 预览的 npm 安装...'
            npm install --no-save --package-lock=false --ignore-scripts
            if ($LASTEXITCODE -ne 0) { throw '依赖安装失败。请检查网络后重试。' }
        }
    } finally { Pop-Location }
}

$previewUrl = 'http://localhost:8090/'
$existing = $false
try {
    $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
    $existing = $response.StatusCode -eq 200
} catch { }
if (-not $existing) {
    $out = Join-Path $local 'preview-web.stdout.log'
    $err = Join-Path $local 'preview-web.stderr.log'
    $env:EXPO_NO_DOTENV = '1'
    $env:EXPO_NO_TELEMETRY = '1'
    $env:__UNSAFE_EXPO_HOME_DIRECTORY = $local
    $process = Start-Process -FilePath $bunExe -ArgumentList @('run', 'preview:web') `
        -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $out -RedirectStandardError $err
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        Start-Sleep -Seconds 1
        if ($process.HasExited) { break }
        try {
            $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
    }
    if (-not $ready) {
        Write-Host "预览服务未启动。日志：$out 和 $err"
        if (Test-Path $err) { Get-Content -LiteralPath $err -Tail 15 }
        throw 'FitOS Web 预览启动失败。'
    }
    Write-Host "FitOS Web 预览服务 PID：$($process.Id)"
    Write-Host "停止命令：Stop-Process -Id $($process.Id)"
}
Write-Host "浏览器预览：$previewUrl"
Start-Process $previewUrl
