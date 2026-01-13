import pandas as pd
import json
import sys
import os

# Usage: python generate-baseline.py <input_file> <output_json>

def generate_stats(df):
    stats = {}
    
    # Total rows
    stats["total_rows"] = len(df)
    stats["columns"] = {}
    
    for col in df.columns:
        col_stats = {}
        series = df[col]
        
        # Base stats
        col_stats["count"] = int(series.count()) # Non-null count
        col_stats["missing"] = int(series.isnull().sum())
        col_stats["distinct"] = int(series.nunique())
        
        # Numeric stats
        if pd.api.types.is_numeric_dtype(series):
            col_stats["type"] = "numeric"
            col_stats["min"] = float(series.min()) if not series.empty else None
            col_stats["max"] = float(series.max()) if not series.empty else None
            col_stats["mean"] = float(series.mean()) if not series.empty else None
            col_stats["median"] = float(series.median()) if not series.empty else None
            col_stats["std_dev"] = float(series.std()) if not series.empty else None
            # Quantiles
            if not series.empty:
                col_stats["p25"] = float(series.quantile(0.25))
                col_stats["p50"] = float(series.quantile(0.50))
                col_stats["p75"] = float(series.quantile(0.75))
                col_stats["p90"] = float(series.quantile(0.90))
                col_stats["p99"] = float(series.quantile(0.99))
        else:
            col_stats["type"] = "string"
            # Top values for categorical
            value_counts = series.value_counts().head(5)
            col_stats["top_values"] = [{"value": str(k), "count": int(v)} for k, v in value_counts.items()]

        stats["columns"][col] = col_stats
        
    return stats

def main():
    if len(sys.argv) < 3:
        print("Usage: python generate-baseline.py <input_csv> <output_json>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    print(f"Reading {input_path}...")
    try:
        if input_path.endswith('.csv'):
            df = pd.read_csv(input_path)
        elif input_path.endswith('.parquet'):
            df = pd.read_parquet(input_path)
        else:
            print(f"Unsupported file type: {input_path}")
            sys.exit(1)
            
        print("Generating statistics...")
        stats = generate_stats(df)
        
        print(f"Writing to {output_path}...")
        with open(output_path, 'w') as f:
            json.dump(stats, f, indent=2)
            
        print("Done.")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
