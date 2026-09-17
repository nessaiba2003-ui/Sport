$ErrorActionPreference = "Stop"
$base = "https://web-production-3502a.up.railway.app"
$railway = Join-Path $PSScriptRoot "..\.tools\railway\railway.exe"
$vars = & $railway variables --service web --json | ConvertFrom-Json
$loginBody = @{ email = $vars.DEMO_ADMIN_EMAIL; password = $vars.DEMO_ADMIN_PASSWORD } | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType "application/json" -Body $loginBody -TimeoutSec 30
$headers = @{ Authorization = "Bearer $($auth.token)" }
$current = Invoke-RestMethod -Uri "$base/api/bootstrap" -TimeoutSec 30

foreach ($id in @("evt_trip", "evt_tournament", "evt_ramadan", "evt_kids")) {
  if ($current.events.id -contains $id) {
    Invoke-RestMethod -Method Delete -Uri "$base/api/events/$id" -Headers $headers -TimeoutSec 30 | Out-Null
  }
}

foreach ($id in @("alb_summer", "alb_tournament", "alb_kids", "alb_31eda1d9")) {
  if ($current.memories.id -contains $id) {
    Invoke-RestMethod -Method Delete -Uri "$base/api/memories/$id" -Headers $headers -TimeoutSec 30 | Out-Null
  }
}

$events = @(
  @{ title = "Stage sportif à Villa Limoun"; category = "Stage"; description = "Entraînement en plein air, ateliers sportifs et cohésion d'équipe."; startsAt = "2026-01-01T09:00:00Z"; location = "Villa Limoun"; coverImageUrl = "/assets/activities/villa-limoun/30.jpg" },
  @{ title = "Ascension du Toubkal 2026"; category = "Randonnée"; description = "Une aventure collective au sommet fondée sur l'entraide et le dépassement de soi."; startsAt = "2026-01-01T09:00:00Z"; location = "Toubkal"; coverImageUrl = "/assets/activities/toubkal-2026/01.jpg" },
  @{ title = "Marche sportive de 12 km"; category = "Marche"; description = "Une marche sportive organisée par le club dans une ambiance conviviale."; startsAt = "2023-01-01T09:00:00Z"; location = "Taroudant"; coverImageUrl = "/assets/activities/marche-12km-2023/01.jpg" },
  @{ title = "Randonnée dans la région de Taskint"; category = "Randonnée"; description = "Découverte de la région montagneuse de Taskint avec les membres du club."; startsAt = "2026-01-01T09:00:00Z"; location = "Taskint"; coverImageUrl = "/assets/activities/sortie-taskint/01.jpg" },
  @{ title = "Stage d'entraînement à la salle Mribih"; category = "Entraînement"; description = "Une rencontre sportive intense animée par les coachs du club."; startsAt = "2026-01-01T09:00:00Z"; location = "Salle Mribih"; coverImageUrl = "/assets/activities/entrainement-mrbih/12.jpg" },
  @{ title = "Entraînement des élèves de l'école Moulay Zidane"; category = "Jeunes"; description = "Initiation sportive et partage avec les jeunes élèves."; startsAt = "2026-01-01T09:00:00Z"; location = "École Moulay Zidane"; coverImageUrl = "/assets/activities/ecole-moulay-zidane/01.jpg" },
  @{ title = "Petit-déjeuner à la piscine Maher"; category = "Communauté"; description = "Un moment de détente et de convivialité partagé après l'effort."; startsAt = "2026-01-01T09:00:00Z"; location = "Piscine Maher"; coverImageUrl = "/assets/activities/petit-dejeuner-piscine-maher/01.jpg" },
  @{ title = "Rencontre avec le Dr Belghiti"; category = "Santé"; description = "Échange autour de la santé, de la prévention et de la pratique sportive responsable."; startsAt = "2026-01-01T09:00:00Z"; location = "Taroudant"; coverImageUrl = "/assets/activities/rencontre-dr-belghiti/01.jpg" },
  @{ title = "Rencontre avec le Dr Bouras"; category = "Santé"; description = "Conseils et sensibilisation autour de la santé des sportifs."; startsAt = "2026-01-01T09:00:00Z"; location = "ALJAWARIH GYM"; coverImageUrl = "/assets/activities/rencontre-dr-bouras/01.jpg" }
)

foreach ($event in $events) {
  if ($current.events.title -notcontains $event.title) {
    $event.priceMad = 0
    $created = Invoke-RestMethod -Method Post -Uri "$base/api/events" -Headers $headers -ContentType "application/json" -Body ($event | ConvertTo-Json) -TimeoutSec 30
    Invoke-RestMethod -Method Put -Uri "$base/api/events/$($created.id)" -Headers $headers -ContentType "application/json" -Body (@{ registrationOpen = $false; capacity = $null } | ConvertTo-Json) -TimeoutSec 30 | Out-Null
  }
}

$albums = @(
  @{ slug = "entrainement-2022"; title = "Entraînement du club 2022"; year = 2022; category = "Entraînement"; location = "Taroudant"; story = "Une séance collective qui rassemble les adhérents autour de l'effort, de la discipline et de l'esprit d'équipe."; count = 11; cover = 1; start = 1 },
  @{ slug = "entrainement-mrbih"; title = "Stage d'entraînement à la salle Mribih"; year = 2026; category = "Entraînement"; location = "Salle Mribih"; story = "Une rencontre sportive intense animée par les coachs du club."; count = 20; cover = 12; start = 1 },
  @{ slug = "ecole-moulay-zidane"; title = "Entraînement des élèves de l'école Moulay Zidane"; year = 2026; category = "Jeunes"; location = "École Moulay Zidane"; story = "Initiation sportive, énergie et partage avec les jeunes élèves."; count = 6; cover = 1; start = 1 },
  @{ slug = "marche-12km-2023"; title = "Marche sportive de 12 km"; year = 2023; category = "Marche"; location = "Taroudant"; story = "Douze kilomètres parcourus ensemble dans une ambiance sportive et conviviale."; count = 10; cover = 1; start = 1 },
  @{ slug = "toubkal-2026"; title = "Ascension du Toubkal 2026"; year = 2026; category = "Randonnée"; location = "Toubkal"; story = "Une aventure collective au sommet, symbole de dépassement de soi et de solidarité."; count = 16; cover = 1; start = 1 },
  @{ slug = "sortie-taskint"; title = "Randonnée dans la région de Taskint"; year = 2026; category = "Randonnée"; location = "Taskint"; story = "Découverte d'une région montagneuse dans un esprit d'entraide et d'exploration."; count = 6; cover = 1; start = 1 },
  @{ slug = "petit-dejeuner-piscine-maher"; title = "Petit-déjeuner à la piscine Maher"; year = 2026; category = "Communauté"; location = "Piscine Maher"; story = "Un moment de détente et de convivialité partagé après l'effort."; count = 4; cover = 1; start = 1 },
  @{ slug = "villa-limoun"; title = "Stage sportif à Villa Limoun"; year = 2026; category = "Stage"; location = "Villa Limoun"; story = "Entraînement en plein air, ateliers sportifs et cohésion d'équipe."; count = 23; cover = 30; start = 9 },
  @{ slug = "rencontre-dr-belghiti"; title = "Rencontre avec le Dr Belghiti"; year = 2026; category = "Santé"; location = "Taroudant"; story = "Un échange consacré à la santé, à la prévention et à la pratique sportive responsable."; count = 2; cover = 1; start = 1 },
  @{ slug = "rencontre-dr-bouras"; title = "Rencontre avec le Dr Bouras"; year = 2026; category = "Santé"; location = "ALJAWARIH GYM"; story = "Conseils, sensibilisation et dialogue autour de la santé des sportifs."; count = 4; cover = 1; start = 1 }
)

foreach ($album in $albums) {
  if ($current.memories.title -notcontains $album.title) {
    $media = @()
    for ($index = 0; $index -lt $album.count; $index++) {
      $number = ($index + $album.start).ToString("00")
      $media += @{ type = "image/jpeg"; url = "/assets/activities/$($album.slug)/$number.jpg" }
    }
    $cover = $album.cover.ToString("00")
    $body = @{ title = $album.title; year = $album.year; category = $album.category; location = $album.location; story = $album.story; items = $album.count; videos = 0; coverUrl = "/assets/activities/$($album.slug)/$cover.jpg"; media = $media }
    Invoke-RestMethod -Method Post -Uri "$base/api/memories" -Headers $headers -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 6) -TimeoutSec 30 | Out-Null
  }
}

$final = Invoke-RestMethod -Uri "$base/api/bootstrap" -TimeoutSec 30
[pscustomobject]@{
  events = $final.events.Count
  memories = $final.memories.Count
  photos = (($final.memories | Measure-Object -Property items -Sum).Sum)
  villaPhotos = (($final.memories | Where-Object title -eq "Stage sportif à Villa Limoun").items)
} | ConvertTo-Json -Compress
