FROM emscripten/emsdk:4.0.23

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  autoconf \
  automake \
  libtool \
  && rm -rf /var/lib/apt/lists/*
