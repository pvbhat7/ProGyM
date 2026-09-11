# Deploys both dist folders to Hostinger over SSH.
# Prereqs: OpenSSH client (built into Windows 10/11), and you know the SSH password.
#
# What it does:
#   1. Pushes webapp\dist\*       -> tavrostechinfo.com /public_html/PROGYM/ggs/webapp/dist/
#   2. Pushes webapp\dist-root\*  -> progym.co.in       /public_html/  (keeps wc2026/ untouched)
#
# Usage (from PowerShell in the webapp folder):
#   .\deploy.ps1                 # deploys both
#   .\deploy.ps1 -Target tavros  # deploys only the tavrostechinfo build
#   .\deploy.ps1 -Target progym  # deploys only the progym.co.in build

param(
    [ValidateSet('both','tavros','progym')]
    [string]$Target = 'both'
)

$ErrorActionPreference = 'Stop'

# ---- Hostinger SSH details (from the SSH Access page) --------------------
$SshHost = '45.130.228.206'
$SshPort = 65002
$SshUser = 'u636480992'

# ---- Remote paths --------------------------------------------------------
# NOTE: Verify these against Hostinger's actual folder layout the first time
# you run the script. On Hostinger shared hosting the convention is
# /home/<user>/domains/<domain>/public_html/
$TavrosRemote = "/home/$SshUser/domains/tavrostechinfo.com/public_html/PROGYM/ggs/webapp/dist"
$ProgymRemote = "/home/$SshUser/domains/progym.co.in/public_html"

# ---- Local paths ---------------------------------------------------------
$here          = Split-Path -Parent $MyInvocation.MyCommand.Path
$distTavros    = Join-Path $here 'dist'
$distProgym    = Join-Path $here 'dist-root'

function Assert-Path($p, $label) {
    if (-not (Test-Path $p)) {
        Write-Host "[ERROR] $label not found: $p" -ForegroundColor Red
        Write-Host "        Run .\build-all.bat first."           -ForegroundColor Yellow
        exit 1
    }
}

function Push-Dist($localDir, $remoteDir, $label) {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host "  Uploading $label"                                        -ForegroundColor Cyan
    Write-Host "  Local : $localDir"                                       -ForegroundColor Gray
    Write-Host "  Remote: ${SshUser}@${SshHost}:${remoteDir}"              -ForegroundColor Gray
    Write-Host "=========================================================" -ForegroundColor Cyan

    # Make sure the remote folder exists.
    ssh -p $SshPort "$SshUser@$SshHost" "mkdir -p '$remoteDir'"
    if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed for $remoteDir" }

    # Copy everything inside $localDir (including hidden files like .htaccess) into $remoteDir.
    # Trailing /* + hidden expansion done via a here-scp with explicit include of the dotfiles.
    Push-Location $localDir
    try {
        # Gather all top-level entries (dirs + files, including dotfiles).
        $entries = Get-ChildItem -Force | Where-Object { $_.Name -ne '.' -and $_.Name -ne '..' }
        if ($entries.Count -eq 0) { throw "No files inside $localDir" }

        $args = @('-P', $SshPort, '-r') + ($entries | ForEach-Object { $_.Name }) + @("${SshUser}@${SshHost}:${remoteDir}/")
        Write-Host "scp $($args -join ' ')" -ForegroundColor DarkGray
        & scp @args
        if ($LASTEXITCODE -ne 0) { throw "scp failed for $label" }
    } finally {
        Pop-Location
    }

    Write-Host "  [OK] $label uploaded." -ForegroundColor Green
}

# ---- Preflight -----------------------------------------------------------
if ($Target -in 'both','tavros') { Assert-Path $distTavros 'webapp\dist'      }
if ($Target -in 'both','progym') { Assert-Path $distProgym 'webapp\dist-root' }

# ---- Confirmation --------------------------------------------------------
Write-Host ""
Write-Host "About to deploy to PRODUCTION on Hostinger." -ForegroundColor Yellow
Write-Host "  Target : $Target"                          -ForegroundColor Yellow
Write-Host "  SSH    : $SshUser@$SshHost:$SshPort"       -ForegroundColor Yellow
$reply = Read-Host "Type YES to continue"
if ($reply -ne 'YES') {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

# ---- Do it ---------------------------------------------------------------
if ($Target -in 'both','tavros') { Push-Dist $distTavros $TavrosRemote 'tavrostechinfo.com/progym/ (dist)' }
if ($Target -in 'both','progym') { Push-Dist $distProgym $ProgymRemote 'progym.co.in root (dist-root)'      }

Write-Host ""
Write-Host "All uploads completed." -ForegroundColor Green
Write-Host "Verify:"
Write-Host "  https://tavrostechinfo.com/progym/"
Write-Host "  https://progym.co.in/tab"
Write-Host "  https://progym.co.in/wc2026/  (should still work — folder was left in place)"
