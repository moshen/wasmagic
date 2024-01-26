#include <stddef.h>
#include "magicfile.h"
#include "magic.h"

struct magic_set *ms = NULL;
void *magic_buffers = &dist_magic_mgc;
size_t *magic_buffers_sizes = (size_t*)&dist_magic_mgc_len;

void magic_wrapper_load(int flags)
{
  if (ms == NULL) {
    ms = magic_open(flags);
    magic_load_buffers(ms, &magic_buffers, magic_buffers_sizes, 1);
  }
}

const char* magic_wrapper_get_mime(const void *buf, size_t nb)
{
  return magic_buffer(ms, buf, nb);
}
