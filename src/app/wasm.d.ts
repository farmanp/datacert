declare module '*/pkg/datalens_wasm' {
  export default function init(): Promise<void>;

  export class DataLensProfiler {
    constructor(delimiter?: number, has_headers: boolean);
    auto_detect_delimiter(chunk: Uint8Array): number;
    parse_and_profile_chunk(chunk: Uint8Array): unknown;
    finalize(): unknown;
  }

  export class CsvStreamingParser {
    constructor(delimiter?: number, has_headers: boolean);
    auto_detect_delimiter(chunk: Uint8Array): number;
    parse_chunk(chunk: Uint8Array): unknown;
    flush(): unknown;
  }
}
