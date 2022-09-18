cmake_minimum_required(VERSION 3.0)

project(LIBKSS_JS)

set(CMAKE_C_FLAGS "-O3 -Wall")

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
  _malloc
  _free
  _KSS2VGM_new
  _KSS2VGM_kss2vgm
  _KSS2VGM_setup
  _KSS2VGM_process
  _KSS2VGM_get_result
  _KSS2VGM_delete
  _KSS2VGM_Result_delete
  _KSS2VGM_Result_vgm_ptr
  _KSS2VGM_Result_vgm_size
)

list(JOIN exported_function_list "," exported_functions)

if(EMSCRIPTEN)
  set(CMAKE_EXE_LINKER_FLAGS "-s WASM=1 -s SINGLE_FILE=1 -s FILESYSTEM=0 -s RESERVED_FUNCTION_POINTERS=16 -s MODULARIZE=1 --memory-init-file 0 -O3 -s EXPORTED_FUNCTIONS=\"[${exported_functions}]\" -s EXPORTED_RUNTIME_METHODS=\"[ccall,cwrap,addFunction,removeFunction]\"")
endif()
