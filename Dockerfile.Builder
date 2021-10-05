FROM emscripten/emsdk:2.0.31

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  autoconf \
  automake \
  libtool \
  xxd \
  && rm -rf /var/lib/apt/lists/*
