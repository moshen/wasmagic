#include <stddef.h>
#include "magic.h"

struct magic_set *ms = NULL;

void wasmagic_load()
{
  if (ms == NULL) {
    ms = magic_open(0 | MAGIC_MIME_TYPE);
    magic_load(ms, "/magic.mgc");
  }
}

const char* wasmagic_get_mime(const void *buf, size_t nb)
{
  wasmagic_load();
  return magic_buffer(ms, buf, nb);
}
