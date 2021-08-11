.PHONY = test package clean clean-dist clean-vendor-file clean-submodules docker-builder-build docker-builder-run fmt
SHELL := bash

test: dist/index.js
	npm run test

package: dist/*.js dist/libmagic.LICENSE

dist/index.js: src/*.ts src/test/integration/*.ts dist/wasmagic.js
	npx ttsc -d

dist/wasmagic.js: src/wasmagic.c dist/magic.mgc dist/libmagic.so
	emcc -s MODULARIZE -s WASM=1 \
	-s EXPORTED_RUNTIME_METHODS='["cwrap", "FS"]' \
	-s EXPORTED_FUNCTIONS='["_wasmagic_get_mime", "_free"]' \
	-s ALLOW_MEMORY_GROWTH=1 \
	-I./vendor/file/src -L./dist \
	-lmagic \
	-o dist/wasmagic.js \
	src/wasmagic.c

dist/libmagic.LICENSE: vendor/file/COPYING
	cp vendor/file/COPYING dist/libmagic.LICENSE

vendor/file/COPYING:
	git submodule init
	git submodule update

dist/magic.mgc: vendor/file/COPYING
	make clean-vendor-file \
	&& cd vendor/file \
	&& autoreconf -f -i \
	&& ./configure --disable-silent-rules \
	&& make \
	&& cp magic/magic.mgc ../../dist/

dist/libmagic.so: vendor/file/COPYING
	make clean-vendor-file \
	&& cd vendor/file \
	&& autoreconf -f -i \
	&& emconfigure ./configure --disable-silent-rules \
	&& cd src/ \
	&& emmake make \
	&& { { [[ -e .libs/libmagic.dylib ]] \
		&& mv .libs/libmagic.dylib .libs/libmagic.so; } || true; } \
	&& mv "$$(realpath .libs/libmagic.so)" ../../../dist/libmagic.so

clean: clean-dist clean-submodules

clean-dist:
	git clean -fx dist

clean-vendor-file:
	cd vendor/file \
		&& git reset --hard \
		&& git clean -fdx

clean-submodules:
	git submodule foreach git reset --hard
	git submodule foreach git clean -fdx

docker-builder-build:
	docker build -f Dockerfile.Builder -t wasmagic-builder .

docker-builder-run: docker-builder-build
	docker run -ti \
		-v "${PWD}:/app" \
		--user "$$UID:$$GID" \
		wasmagic-builder \
		/bin/bash -c "cd /app && make dist/wasmagic.js"

fmt:
	npm run fmt
