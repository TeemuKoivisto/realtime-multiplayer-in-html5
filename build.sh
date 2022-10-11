#!/usr/bin/env bash

docker build -t realtime-multiplayer -f ./packages/server/Dockerfile .

# and to run use eg
# docker run -p 5090:5090 realtime-multiplayer