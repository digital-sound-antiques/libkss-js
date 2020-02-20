cmake_minimum_required(VERSION 2.8)

project(LIBKSS_JS)

set(CMAKE_C_FLAGS "-O3 -Wall -s WASM=0")

add_subdirectory(modules/libkss)

include_directories(modules/libkss)

add_executable(libkss src/main.c)
target_link_libraries(libkss kss)

set (exported_function_list
  _KSSPLAY_new
  _KSSPLAY_reset
  _KSSPLAY_set_data
  _KSSPLAY_delete
  _KSSPLAY_calc
  _KSSPLAY_calc_silent
  _KSSPLAY_get_loop_count
  _KSSPLAY_get_fade_flag
  _KSSPLAY_fade_start
  _KSSPLAY_get_stop_flag
  _KSSPLAY_set_device_quality
  _KSSPLAY_set_silent_limit
  _KSSPLAY_set_rcf
  _KSSPLAY_set_iowrite_handler
  _KSSPLAY_set_memwrite_handler
  _KSSPLAY_get_MGS_jump_count
  _KSSPLAY_write_io
  _KSSPLAY_write_memory
  _KSS_new
  _KSS_get_title
  _KSS_delete
  _KSS_bin2kss
)

list(JOIN exported_function_list "','" exported_functions)

if(EMSCRIPTEN)
  set(CMAKE_EXE_LINKER_FLAGS "-s RESERVED_FUNCTION_POINTERS=16 -s MODULARIZE=1 --memory-init-file 0 -O3 -s EXPORTED_FUNCTIONS=\"['${exported_functions}']\" -s EXTRA_EXPORTED_RUNTIME_METHODS=\"['ccall', 'cwrap','addFunction','removeFunction']\"")
endif()
