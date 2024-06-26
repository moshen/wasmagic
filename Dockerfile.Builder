FROM emscripten/emsdk:3.1.61

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  autoconf \
  automake \
  libtool \
  && rm -rf /var/lib/apt/lists/*
