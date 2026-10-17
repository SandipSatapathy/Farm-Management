# Build FarmLog APK
$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

$JavaHome = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
if (-not (Test-Path $JavaHome)) {
    $found = Get-ChildItem "C:\Program Files\Microsoft\jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $JavaHome = $found.FullName }
}

$env:JAVA_HOME = $JavaHome
$env:Path = "$JavaHome\bin;" + $env:Path

$SdkDir = "C:\Users\sandi\AppData\Local\Android\Sdk"
$env:ANDROID_HOME = $SdkDir
$env:ANDROID_SDK_ROOT = $SdkDir

$CmdLineToolsDir = Join-Path $SdkDir "cmdline-tools\latest\bin"
$env:Path = "$CmdLineToolsDir;$SdkDir\platform-tools;" + $env:Path

Write-Host "Compiling fresh web assets (npm run build)..."
Set-Location $PSScriptRoot
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Web build failed! Halting APK build."
    exit 1
}

Write-Host "`nSyncing web assets to Android container..."
& npx.cmd cap sync android

Write-Host "`nBuilding FarmLog Debug APK..."
$androidDir = Join-Path $PSScriptRoot "android"
Set-Location $androidDir

$localProps = Join-Path $androidDir "local.properties"
"sdk.dir=$($SdkDir.Replace('\', '/'))" | Set-Content -Path $localProps -Encoding ASCII

$apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
$destPath = Join-Path $PSScriptRoot "FarmLog-debug.apk"

if (Test-Path $apkPath) { Remove-Item -Path $apkPath -Force }
if (Test-Path $destPath) { Remove-Item -Path $destPath -Force }

.\gradlew.bat assembleDebug --rerun-tasks

if (Test-Path $apkPath) {
    Copy-Item -Path $apkPath -Destination $destPath -Force
    $sizeMb = [math]::Round(((Get-Item $destPath).Length / 1MB), 2)
    Write-Host "`n==================================================================" -ForegroundColor Green
    Write-Host "🎉 SUCCESS! FarmLog APK successfully built ($sizeMb MB)!" -ForegroundColor Green
    Write-Host "Location in Project Root: $destPath" -ForegroundColor Cyan
    Write-Host "Native Build Location:   $apkPath" -ForegroundColor Gray
    Write-Host "==================================================================`n" -ForegroundColor Green
} else {
    Write-Host "Build finished. Check outputs in android/app/build/outputs/apk/"
}
