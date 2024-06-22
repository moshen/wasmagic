.PHONY = test package clean clean-dist clean-vendor-file clean-submodules docker-builder-build docker-builder-run fmt update-dependencies
SHELL := bash

ts_files := $(wildcard src/*.ts src/test/integration/*.ts types/*.ts)
fmt_files := $(shell echo examples/{worker/*.{mjs,md},stream-detection/*.{js,md}} .github/workflows/*.yml *.js{,on} *.md src/*.js)
num_processors := $(shell nproc || printf "1")

export EMCC_CFLAGS = -msimd128 -O2

test: dist/index.js dist/test/integration/foobar_magic dist/test/integration/png_magic dist/test/integration/jpeg_magic
	TZ='UTC' npm run test

dist/test/integration/foobar_magic dist/test/integration/png_magic dist/test/integration/jpeg_magic &:
	mkdir -p dist/test/integration \
	&& cp src/test/integration/*_magic dist/test/integration/

package: dist/index.js dist/libmagic.LICENSE

dist/index.js: $(ts_files) dist/libmagic-wrapper.js dist/LibmagicModule.d.ts dist/StdioOverrideFunction.d.ts
	node ./node_modules/.bin/tsc -d

dist/libmagic-wrapper.js: src/libmagic-wrapper.c dist/magic.mgc dist/libmagic.so dist/libmagic-wrapper.d.ts
	emcc -s MODULARIZE -s WASM=1 \
	-s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "FS"]' \
	-s EXPORTED_FUNCTIONS='["_magic_wrapper_load", "_magic_wrapper_detect", "_malloc", "_free"]' \
	-s ALLOW_MEMORY_GROWTH=1 \
	--pre-js ./src/pre.js \
	--embed-file ./dist/magic.mgc@/magic/magic.mgc \
	-I./vendor/file/src -I./dist -L./dist \
	-lmagic \
	-o dist/libmagic-wrapper.js \
	src/libmagic-wrapper.c

dist/libmagic-wrapper.d.ts: src/libmagic-wrapper.d.ts
	cp src/libmagic-wrapper.d.ts dist/libmagic-wrapper.d.ts

dist/LibmagicModule.d.ts: src/LibmagicModule.d.ts
	cp src/LibmagicModule.d.ts dist/LibmagicModule.d.ts

dist/StdioOverrideFunction.d.ts: src/StdioOverrideFunction.d.ts
	cp src/StdioOverrideFunction.d.ts dist/StdioOverrideFunction.d.ts

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
	&& make -j${num_processors} \
	&& cp magic/magic.mgc ../../dist/

dist/libmagic.so: vendor/file/COPYING
	make clean-vendor-file \
	&& cd vendor/file \
	&& autoreconf -f -i \
	&& emconfigure ./configure --disable-silent-rules \
	&& cd src/ \
	&& emmake make -j${num_processors} \
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
		/bin/bash -c "cd /app && make dist/libmagic-wrapper.js"

fmt: $(ts_files) $(fmt_files)
	./node_modules/.bin/biome format --write $(ts_files) $(fmt_files)

fmt-check: $(ts_files) $(fmt_files)
	./node_modules/.bin/biome format $(ts_files) $(fmt_files)

lint: $(ts_files) $(fmt_files)
	./node_modules/.bin/biome lint --write $(ts_files) $(fmt_files)

lint-check: $(ts_files) $(fmt_files)
	./node_modules/.bin/biome lint $(ts_files) $(fmt_files)

update-dependencies:
	directories=("." "examples/worker" "examples/stream-detection"); \
	packageLockFlag=""; \
	for i in $${!directories[@]}; do \
		if [[ $$i -gt 0 ]]; then \
			packageLockFlag="--no-package-lock"; \
		fi; \
		pushd "$${directories[$$i]}"; \
		jq -r '.devDependencies | keys | .[]' < package.json \
		| xargs -n1 npm info --json \
		| jq -r '"\(.name)@\(.["dist-tags"].latest)"' \
		| xargs npm install --save-dev "$$packageLockFlag"; \
		popd; \
	done
