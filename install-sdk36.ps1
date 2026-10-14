$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

$sdkDir = "C:\Users\sandi\AppData\Local\Android\Sdk"
$sdkManager = "$sdkDir\cmdline-tools\latest\bin\sdkmanager.bat"

# Generate standard android-sdk-license file with LF endings
$licenses = @(
    "24333f8a63b1d7f48e323be2f155874b82404fcc",
    "8937776255001fecdb2f170fb5425d28b0e138a5",
    "d56f5187479451eabf01fb78af6dfcb131a6481e",
    "84831b9409646a918e30573bab4c9c91346d8abd",
    "601085b94cd77f0b54ff86406957099fed7926d4",
    "33b6a2b649204008299f802dc89311c22452190c"
)

$licPath = "$sdkDir\licenses\android-sdk-license"
[System.IO.File]::WriteAllText($licPath, ($licenses -join "`n") + "`n")

Write-Host "Installing platforms;android-36 and build-tools;35.0.0..."
& $sdkManager "platforms;android-36" "build-tools;35.0.0"
Write-Host "Done!"
