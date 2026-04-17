# Generates build/appicon.png (1024x1024) for "Bảng Công Tự Động".
# Uses GDI+ via System.Drawing — Windows-native, no external deps.
Add-Type -AssemblyName System.Drawing

$outPath = Join-Path $PSScriptRoot 'appicon.png'
$size = 1024

$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'HighQuality'
$g.Clear([System.Drawing.Color]::Transparent)

function New-RoundedRect($x, $y, $w, $h, $r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

# 1. Blue rounded background (full bleed)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point 0, $size),
    [System.Drawing.Color]::FromArgb(96, 165, 250),
    [System.Drawing.Color]::FromArgb(37, 99, 235)
)
$bgPath = New-RoundedRect 0 0 $size $size 220
$g.FillPath($bgBrush, $bgPath)

# 2. Clipboard clip (darker rounded rect at top)
$clipW = 320; $clipH = 100
$clipX = ($size - $clipW) / 2
$clipY = 150
$clipBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(148, 163, 184))
$clipPath = New-RoundedRect $clipX $clipY $clipW $clipH 28
$g.FillPath($clipBrush, $clipPath)

# 3. White clipboard body
$cardX = 160; $cardY = 200; $cardW = 704; $cardH = 720
$cardBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$cardPath = New-RoundedRect $cardX $cardY $cardW $cardH 56
$g.FillPath($cardBrush, $cardPath)

# 4. Inner rows — 4 horizontal lines simulating attendance entries
$lineBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(226, 232, 240))
$rowY = 360
$rowSpacing = 120
$rowLeft = $cardX + 80
$rowRight = $cardX + $cardW - 80
for ($i = 0; $i -lt 4; $i++) {
    $y = $rowY + ($i * $rowSpacing)
    $rowPath = New-RoundedRect $rowLeft $y ($rowRight - $rowLeft) 44 22
    $g.FillPath($lineBrush, $rowPath)
}

# 5. Green check circle — covers bottom-right, overlaps clipboard
$checkCx = 820; $checkCy = 820; $checkR = 190
$checkBgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point ($checkCx - $checkR), ($checkCy - $checkR)),
    (New-Object System.Drawing.Point ($checkCx + $checkR), ($checkCy + $checkR)),
    [System.Drawing.Color]::FromArgb(52, 211, 153),
    [System.Drawing.Color]::FromArgb(16, 185, 129)
)
# White ring first to visually separate from card
$ringBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillEllipse($ringBrush, ($checkCx - $checkR - 16), ($checkCy - $checkR - 16), ($checkR + 16) * 2, ($checkR + 16) * 2)
$g.FillEllipse($checkBgBrush, ($checkCx - $checkR), ($checkCy - $checkR), $checkR * 2, $checkR * 2)

# Check mark stroke
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 52
$pen.StartCap = 'Round'
$pen.EndCap = 'Round'
$pen.LineJoin = 'Round'
$checkPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$checkPath.AddLines(@(
    (New-Object System.Drawing.PointF ($checkCx - 86), ($checkCy + 6)),
    (New-Object System.Drawing.PointF ($checkCx - 20), ($checkCy + 70)),
    (New-Object System.Drawing.PointF ($checkCx + 92), ($checkCy - 56))
))
$g.DrawPath($pen, $checkPath)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output "Saved: $outPath"
