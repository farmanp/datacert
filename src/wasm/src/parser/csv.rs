use csv::{ReaderBuilder};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ParseResult {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub malformed_count: u32,
    pub total_rows: u32,
}

pub struct CsvParser {
    delimiter: u8,
    has_headers: bool,
    header_data: Option<Vec<String>>,
    malformed_count: u32,
    total_rows: u32,
    remainder: Vec<u8>,
}

impl CsvParser {
    pub fn new(delimiter: Option<u8>, has_headers: bool) -> Self {
        Self {
            delimiter: delimiter.unwrap_or(b','),
            has_headers,
            header_data: None,
            malformed_count: 0,
            total_rows: 0,
            remainder: Vec::new(),
        }
    }

    pub fn set_delimiter(&mut self, delimiter: u8) {
        self.delimiter = delimiter;
    }

    pub fn auto_detect_delimiter(data: &[u8]) -> u8 {
        let candidates = [b',', b'\t', b';', b'|'];
        let mut best_delimiter = b',';
        let mut max_score = 0;

        for &delim in &candidates {
            let mut rdr = ReaderBuilder::new()
                .delimiter(delim)
                .has_headers(false)
                .from_reader(data);
            
            let mut count = 0;
            let mut row_lengths = Vec::new();
            
            for result in rdr.records().take(10) {
                if let Ok(record) = result {
                    row_lengths.push(record.len());
                    count += 1;
                }
            }

            if count > 1 {
                let first_len = row_lengths[0];
                if first_len > 1 && row_lengths.iter().all(|&l| l == first_len) {
                    let score = count * first_len;
                    if score > max_score {
                        max_score = score;
                        best_delimiter = delim;
                    }
                }
            }
        }
        best_delimiter
    }

    pub fn parse_chunk(&mut self, chunk: &[u8]) -> ParseResult {
        let mut data = Vec::with_capacity(self.remainder.len() + chunk.len());
        data.extend_from_slice(&self.remainder);
        data.extend_from_slice(chunk);

        let last_newline = data.iter().rposition(|&b| b == b'\n');
        
        let (to_parse, next_remainder) = match last_newline {
            Some(pos) => (&data[..=pos], &data[pos + 1..]),
            None => (&[][..], &data[..]),
        };

        let mut rows = Vec::new();

        if !to_parse.is_empty() {
            let mut rdr = ReaderBuilder::new()
                .delimiter(self.delimiter)
                .has_headers(self.has_headers && self.header_data.is_none())
                .from_reader(to_parse);

            if self.has_headers && self.header_data.is_none() {
                if let Ok(headers) = rdr.headers() {
                    self.header_data = Some(headers.iter().map(|s| s.to_string()).collect());
                }
            }

            for result in rdr.records() {
                self.total_rows += 1;
                match result {
                    Ok(record) => {
                        rows.push(record.iter().map(|s| s.to_string()).collect::<Vec<String>>());
                    }
                    Err(_) => {
                        self.malformed_count += 1;
                    }
                }
            }
        }

        self.remainder = next_remainder.to_vec();

        ParseResult {
            headers: self.header_data.clone().unwrap_or_default(),
            rows,
            malformed_count: self.malformed_count,
            total_rows: self.total_rows,
        }
    }

    pub fn flush(&mut self) -> ParseResult {
        let mut rows = Vec::new();
        if !self.remainder.is_empty() {
            let mut rdr = ReaderBuilder::new()
                .delimiter(self.delimiter)
                .has_headers(false)
                .from_reader(&self.remainder[..]);

            for result in rdr.records() {
                self.total_rows += 1;
                match result {
                    Ok(record) => {
                        rows.push(record.iter().map(|s| s.to_string()).collect::<Vec<String>>());
                    }
                    Err(_) => {
                        self.malformed_count += 1;
                    }
                }
            }
            self.remainder.clear();
        }

        ParseResult {
            headers: self.header_data.clone().unwrap_or_default(),
            rows,
            malformed_count: self.malformed_count,
            total_rows: self.total_rows,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auto_detect_delimiter() {
        let comma_data = b"id,name,age\n1,Alice,30\n2,Bob,25";
        assert_eq!(CsvParser::auto_detect_delimiter(comma_data), b',');

        let tab_data = b"id\tname\tage\n1\tAlice\t30\n2\tBob\t25";
        assert_eq!(CsvParser::auto_detect_delimiter(tab_data), b'\t');

        let pipe_data = b"id|name|age\n1|Alice|30\n2|Bob|25";
        assert_eq!(CsvParser::auto_detect_delimiter(pipe_data), b'|');
    }

    #[test]
    fn test_chunked_parsing() {
        let mut parser = CsvParser::new(None, true);
        
        // Chunk 1: Header and partial first row
        let chunk1 = b"id,name\n1,Ali";
        let res1 = parser.parse_chunk(chunk1);
        assert_eq!(res1.headers, vec!["id", "name"]);
        assert_eq!(res1.rows.len(), 0);

        // Chunk 2: Rest of first row and second row
        let chunk2 = b"ce\n2,Bob\n";
        let res2 = parser.parse_chunk(chunk2);
        assert_eq!(res2.rows, vec![vec!["1", "Alice"], vec!["2", "Bob"]]);

        // Chunk 3: Partial third row
        let chunk3 = b"3,Carol";
        let res3 = parser.parse_chunk(chunk3);
        assert_eq!(res3.rows.len(), 0);

        // Final flush
        let res4 = parser.flush();
        assert_eq!(res4.rows, vec![vec!["3", "Carol"]]);
        assert_eq!(res4.total_rows, 3);
    }

    #[test]
    fn test_malformed_row() {
        let mut parser = CsvParser::new(None, true);
        let data = b"id,name\n1,Alice\n2,Bob,Extra\n3,Carol\n";
        let res = parser.parse_chunk(data);
        assert_eq!(res.rows.len(), 2);
        assert_eq!(res.malformed_count, 1);
        assert_eq!(res.total_rows, 3);
        
        let res2 = parser.flush();
        assert_eq!(res2.total_rows, 3);
    }
}
