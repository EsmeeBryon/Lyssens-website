# Lyssens Decoratie & Interieur

Nieuwe website voor Lyssens Decoratie & Interieur in Merksem.
Dit is het ontwerp in gewone HTML en CSS, klaar om later om te zetten naar een
WordPress blokthema zodat de zaak zelf teksten en foto's kan aanpassen.

## Bekijken

**https://esmeebryon.github.io/Lyssens-website/**

Dit is nog een voorbeeldversie. Zoekmachines krijgen de instructie hem te
negeren, via `robots.txt` en een `noindex` op elke pagina. Enkel wie de link
krijgt, vindt de site. Zet die twee terug zodra de site echt live mag.

Elke wijziging op `main` komt automatisch online.

## Mappen

| Map | Inhoud |
| --- | --- |
| `prototype/` | De website zelf. Dit is wat online komt. |
| `video/` | Korte rondleiding van 20 seconden om door te sturen. |

## Container

Bij elke wijziging op `main` wordt ook een container gebouwd en gepubliceerd op
`ghcr.io/afasgroep/lyssens-website`. Die draait op poort 8080.

```bash
docker run --rm -p 8080:8080 ghcr.io/afasgroep/lyssens-website:latest
```

## Nog te doen

- Foto's van de ploeg, nu staan er grijze plaatshouders
- Echte Google-recensies in plaats van voorbeelden
- Het formulier aansluiten zodat aanvragen echt verstuurd worden
- Omzetten naar een WordPress blokthema
