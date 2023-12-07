importFile=$(grep -Po '(?<=await import\()(.+)\"' dist/sw.js)
echo "Captured ${importFile}"
ESCAPED_REPLACE=$(printf '%s\n' "$importFile" | sed -e 's/[\/&]/\\&/g')
sed -i -e '1s/^/import { FileSystemWritableFileStream } from '${ESCAPED_REPLACE}';\n/' \
  -e 's/.*await import.*/\/\//' \
  -e 's/return new t(await this\[ee\]\.createWritable(e));/return new FileSystemWritableFileStream(await this\[ee\]\.createWritable(e));/' dist/sw.js
