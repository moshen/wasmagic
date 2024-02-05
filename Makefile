.PHONY = test package clean clean-dist clean-vendor-file clean-submodules docker-builder-build docker-builder-run fmt update-dependencies
SHELL := bash

ts_files := $(wildcard src/*.ts src/test/integration/*.ts types/*.ts)
fmt_files := $(shell echo examples/{worker,stream-detection}/*.{js,md} .github/workflows/*.yml *.js{,on} *.md)

export EMCC_CFLAGS = -msimd128 -O2

test: dist/index.js
	TZ='UTC' npm run test

package: dist/index.js dist/libmagic.LICENSE

dist/index.js: $(ts_files) dist/libmagic-wrapper.js
	npx tsc -d

dist/libmagic-wrapper.js: src/libmagic-wrapper.c dist/magicfile.h dist/libmagic.so dist/libmagic-wrapper.d.ts
	emcc -s MODULARIZE -s WASM=1 \
	-s EXPORTED_RUNTIME_METHODS='["cwrap"]' \
	-s EXPORTED_FUNCTIONS='["_magic_wrapper_load", "_magic_wrapper_get_mime", "_malloc", "_free"]' \
	-s ALLOW_MEMORY_GROWTH=1 \
	-I./vendor/file/src -I./dist -L./dist \
	-lmagic \
	-o dist/libmagic-wrapper.js \
	src/libmagic-wrapper.c

dist/libmagic-wrapper.d.ts: types/libmagic-wrapper.d.ts
	cp types/libmagic-wrapper.d.ts dist/libmagic-wrapper.d.ts

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

dist/magicfile.h: dist/magic.mgc
	xxd -i dist/magic.mgc dist/magicfile.h

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
		/bin/bash -c "cd /app && make dist/libmagic-wrapper.js"

fmt: $(ts_files) $(fmt_files)
	npx --no-install prettier --ignore-path .gitignore -w $(ts_files) $(fmt_files)

fmt-check: $(ts_files) $(fmt_files)
	npx --no-install prettier --ignore-path .gitignore -c $(ts_files) $(fmt_files)

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
