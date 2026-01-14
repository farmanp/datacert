# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a streaming data engineer
I want to profile Apache Avro files directly
So that I can analyze Kafka exports and data lake artifacts without format conversion

**Success Looks Like:**
Avro files (.avro) are parsed with schema extraction, and profiled with the same statistics and quality metrics as other formats.

## 2. Context & Constraints (Required)
**Background:**
Apache Avro is the standard serialization format for Kafka and many data lake architectures. Streaming engineers frequently need to inspect Avro files from Kafka consumers, Spark jobs, or data lake exports. Currently they must convert to CSV/JSON first, losing schema information and adding friction.

**Scope:**
- **In Scope:**
  - .avro file parsing (Object Container Files)
  - Schema extraction from Avro header
  - Support for primitive types: null, boolean, int, long, float, double, bytes, string
  - Support for complex types: records, arrays, maps, enums, fixed
  - Logical types: date, time, timestamp, decimal, uuid
  - Union types (nullable fields)
  - Display extracted schema in UI
  - Same statistics and quality metrics as other formats

- **Out of Scope:**
  - Avro RPC / protocol files
  - Schema Registry integration
  - Snappy/deflate codec support (initially - add if common)
  - Writing Avro files
  - Streaming Avro from Kafka directly

**Constraints:**
- Use avro-js or implement minimal parser in Rust/WASM
- Avro files are typically smaller but denser than CSV
- Must handle nested records (flatten to dot notation like JSON)
- Schema is embedded in file header - extract and display

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Parse Avro file with primitive types**
Given an Avro file with schema {id: long, name: string, active: boolean}
When the file is dropped into DataCert
Then the file is recognized as Avro format
And all 3 columns are detected with correct types
And statistics are computed for each column

**Scenario: Extract and display schema**
Given an Avro file with embedded schema
When profiling completes
Then the UI shows an "Avro Schema" section
And the full schema JSON is viewable
And field types are shown next to column names

**Scenario: Handle nested records**
Given an Avro file with nested record: {user: {name: string, age: int}}
When the file is parsed
Then columns are flattened to "user.name" and "user.age"
And statistics are computed for flattened columns

**Scenario: Handle nullable fields (unions)**
Given an Avro file with union type ["null", "string"] for field "email"
When profiling completes
Then null values are correctly counted as missing
And type is inferred as "string (nullable)"

**Scenario: Handle logical types**
Given an Avro file with logical types: date, timestamp-millis, decimal
When profiling completes
Then dates are parsed as temporal type
And timestamps show temporal statistics
And decimals are treated as numeric

**Scenario: Large Avro file**
Given a 100MB Avro file with 1 million records
When the file is processed
Then parsing completes within 20 seconds
And memory usage stays reasonable
And progress is reported

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/components/FileDropzone.tsx` - Add .avro to accepted types
- `src/app/components/AvroSchemaViewer.tsx` - New component (create)
- `src/wasm/src/parser/avro.rs` - Avro parser (create)
- `src/wasm/src/parser/mod.rs` - Add Avro module
- `src/wasm/Cargo.toml` - Add avro dependency if using Rust
- `src/app/workers/parser.worker.ts` - Add Avro handling

**Must NOT Change:**
- Statistics engine
- Other parsers (CSV, JSON, Parquet)
- Core UI components

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
- feat(parser): add avro file format detection
- feat(parser): implement avro parser with schema extraction
- feat(parser): handle avro nested records with flattening
- feat(parser): support avro logical types (date, timestamp, decimal)
- feat(ui): create avro schema viewer component
- test(avro): add avro parsing test suite

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass
- [ ] Primitive types parsed correctly
- [ ] Nested records flattened
- [ ] Union/nullable types handled
- [ ] Logical types converted appropriately
- [ ] Schema displayed in UI
- [ ] Performance: 100MB < 20s
- [ ] Code reviewed

## 7. Resources
- Apache Avro spec: https://avro.apache.org/docs/current/specification/
- avro-js: https://github.com/apache/avro/tree/main/lang/js
- Rust avro crate: https://docs.rs/apache-avro/
- Test files: Generate from Kafka/Spark samples
