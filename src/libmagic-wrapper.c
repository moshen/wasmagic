#include <stddef.h>
#include "magic.h"

struct magic_set *ms = NULL;

const char* magic_wrapper_load(
  char* magic_paths
) {
  if (ms != NULL) {
    return "Load called multiple times";
  }

  ms = magic_open(0 | MAGIC_MIME_TYPE);
  if (magic_load(ms, magic_paths) == -1) {
    return magic_error(ms);
  }

  return "";
}

const char* magic_wrapper_get_mime(const void *buf, size_t nb)
{
  return magic_buffer(ms, buf, nb);
}
