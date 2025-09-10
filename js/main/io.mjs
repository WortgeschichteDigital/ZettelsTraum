
import fs from "node:fs/promises";
import zlib from "node:zlib";

const io = {
  // read ZTJ or ZTB file
  //   path = string
  async read (path) {
    try {
      // decompress data
      const buffer = await fs.readFile(path);
      const contents = await this.unzipData(buffer);

      // usually, the file contents is compressed
      // (ZTJ files were compressed from version 0.24.0 onwards)
      if (typeof contents !== "string") {
        try {
          // stringify and validate the file data
          const data = buffer.toString();
          JSON.parse(data);
          return data;
        } catch (err) {
          // something went wrong => return an error message
          return err;
        }
      }

      // the file data is not compressed => return the raw data
      return contents;
    } catch (err) {
      return err;
    }
  },

  // decompress data
  //   data = buffer (compressed file buffer)
  unzipData (data) {
    return new Promise(resolve => {
      zlib.unzip(data, (err, buffer) => {
        // error while unpacking
        // (that also happens if the data was not compressed in the first place)
        if (err) {
          resolve(err);
          return;
        }
        // return stringified data
        // (default encoding is UTF-8)
        resolve(buffer.toString());
      });
    });
  },

  // write ZTJ or ZTB file
  //   path = string
  //   data = string (JSON)
  async write (path, data) {
    // compress data
    const buffer = await this.gzipData(data);

    // error handling
    if (buffer.message) {
      return buffer;
    }

    // write data to file
    try {
      await fs.writeFile(path, buffer);
      return true;
    } catch (err) {
      return err;
    }
  },

  // compress data
  //   data = string (JSON)
  gzipData (data) {
    return new Promise(resolve => {
      zlib.gzip(data, (err, buffer) => {
        // error while compressing
        if (err) {
          resolve(err);
          return;
        }
        // return compressed data
        resolve(buffer);
      });
    });
  },
};

export default {
  read: async (...args) => await io.read(...args),
  write: async (...args) => await io.write(...args),
};
