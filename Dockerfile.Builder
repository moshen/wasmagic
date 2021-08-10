FROM emscripten/emsdk:2.0.26

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  autoconf \
  automake \
  libtool \
  && rm -rf /var/lib/apt/lists/*
