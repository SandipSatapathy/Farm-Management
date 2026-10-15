# Build FarmLog APK
$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

$JavaHome = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
if (-not (Test-Path $JavaHome)) {
    $found = Get-ChildItem "C:\Program Files\Microsoft\jdk*" -ErrorAction SilentlyContinue | Select-Object -First 1
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

# Ensure Java 17 compatibility
$capBuildGradle = Join-Path $PSScriptRoot "android\app\capacitor.build.gradle"
if (Test-Path $capBuildGradle) {
    (Get-Content $capBuildGradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content $capBuildGradle
}

$capLibGradle = Join-Path $PSScriptRoot "node_modules\@capacitor\android\capacitor\build.gradle"
if (Test-Path $capLibGradle) {
    (Get-Content $capLibGradle) -replace 'VERSION_21', 'VERSION_17' | Set-Content $capLibGradle
}

Write-Host "`nBuilding FarmLog Debug APK..."
$androidDir = Join-Path $PSScriptRoot "android"
Set-Location $androidDir

$localProps = Join-Path $androidDir "local.properties"
"sdk.dir=$($SdkDir.Replace('\', '/'))" | Set-Content -Path $localProps -Encoding ASCII

.\gradlew.bat assembleDebug

$apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
$destPath = Join-Path $PSScriptRoot "FarmLog-debug.apk"

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
