# Bedienen van de opstelling op de Pi vanaf deze machine.
#
# Zet PI goed voor jouw Pi, of geef het per keer mee:
#   make deploy PI=pi@192.168.0.42
PI  ?= pi@pi.local
DIR ?= ~/waterput-sensor

.PHONY: deploy logs status

## Haalt de compose-file én de nieuwste images op en herstart wat veranderd is.
deploy:
	ssh $(PI) 'cd $(DIR) \
	  && git pull --ff-only \
	  && docker compose pull \
	  && docker compose up -d \
	  && docker image prune -f \
	  && docker compose ps'

## Meelezen met beide containers.
logs:
	ssh $(PI) 'cd $(DIR) && docker compose logs -f --tail=50'

## Wat draait er, en van welke image.
status:
	ssh $(PI) 'cd $(DIR) && docker compose ps && docker compose images'
