# User Personas

These personas represent the core user base for DataLens Profiler. They guide feature development, prioritization, and design decisions to ensure we are solving real problems for real professionals.

## Primary Personas

### 1. "Pipeline Pat" - The Senior Data Engineer
> *"I just need to know why the nightly build failed without spinning up a cluster."*

*   **Role:** Data Infrastructure / ETL Engineer
*   **Tech Stack:** Python, SQL, Spark/Databricks, dbt, Airflow, Parquet, Docker.
*   **Context:** Manages massive data pipelines. Often receives "bad data" from upstream vendors or legacy systems that breaks ingestion jobs.
*   **Pain Points:**
    *   Spinning up a Spark cluster or Jupyter notebook just to check the header row or null count of a 500MB file takes 10+ minutes.
    *   Opening large CSV/Parquet files in VS Code or Excel crashes the editor.
    *   Privacy policies forbid uploading production data to "free online tools."
*   **Why DataLens:**
    *   **Speed:** Drag-and-drop instant profiling beats writing boilerplate pandas code.
    *   **Formats:** Native support for Parquet and GCS allows direct debugging of "lake" data.
    *   **Privacy:** Local-first WASM engine meets strict compliance requirements (PII never leaves the laptop).
    *   **Integration:** "Copy as Markdown" lets them paste the root cause directly into a GitHub Issue or Jira ticket.

### 2. "Insight Isabel" - The Data Analyst
> *"Is this dataset clean enough to build a dashboard on?"*

*   **Role:** Business Intelligence / Data Analyst
*   **Tech Stack:** SQL, Tableau/Looker, Excel, some Python.
*   **Context:** Receives ad-hoc data dumps from various departments (marketing, sales) and needs to assess their quality before importing them into the warehouse.
*   **Pain Points:**
    *   Excel struggles with 1M+ rows.
    *   Hard to visualize distributions (histograms) quickly in spreadsheets.
    *   Needs to communicate "data quality issues" (missing values, duplicates) to non-technical stakeholders quickly.
*   **Why DataLens:**
    *   **Visuals:** Instant histograms and correlation matrices reveal data shape immediately.
    *   **Quality Scores:** The "Health Score" and missing value badges provide a quick "Go/No-Go" metric.
    *   **Sharing:** HTML Export allows sharing a full interactive report with stakeholders who don't have the tool.

### 3. "Model Mike" - The ML Engineer
> *"I need to check for feature skew and outliers before training."*

*   **Role:** Machine Learning Engineer / Data Scientist
*   **Tech Stack:** Python (PyTorch/TensorFlow), Pandas, Scikit-learn.
*   **Context:** preparing datasets for training models. Needs to understand statistical properties deeply (Variance, Skewness, Kurtosis).
*   **Pain Points:**
    *   Repeatedly writing the same `.describe()` and `matplotlib` code for every new CSV.
    *   Notebooks becoming messy and slow with large datasets.
*   **Why DataLens:**
    *   **Advanced Stats:** Native calculation of Skewness, Kurtosis, and Quantiles (P25/P50/P75/P90/P99).
    *   **Correlation:** Interactive correlation matrix helps identify redundant features instantly.
    *   **Focus:** Allows them to focus on *modeling* rather than *exploratory data analysis (EDA)* boilerplate.

## Secondary Personas

### 4. "Security Sam" - The Compliance Officer
> *"No customer data leaves the corporate network. Period."*

*   **Role:** Information Security / Compliance Lead
*   **Goals:** Prevent data leaks and Shadow IT.
*   **Why DataLens:**
    *   **Architecture:** The "Local-First" architecture is the primary selling point. They can whitelist the application knowing it has zero backend data retention.
    *   **GCS Integration:** The use of official Google Identity Services (OAuth) and direct browser-to-bucket streaming aligns with zero-trust security models.

## User Journey Map (Example: Pipeline Pat)

1.  **Trigger:** An Airflow job fails with `SchemaMismatchError` on a 2GB Parquet file in GCS.
2.  **Action:** Pat opens DataLens.
3.  **Interaction:** Authenticates via Google Sign-In, pastes the `gs://` URL.
4.  **Result:** Profiling finishes in 15 seconds.
5.  **Discovery:** Notices the `user_id` column has `null` values (should be unique/non-null) and the inferred type is `String` instead of `Integer` due to a "N/A" value in row 50,000.
6.  **Resolution:** Pat clicks "Copy as Markdown," pastes the stats into a Slack message to the data provider: *"File rejected. `user_id` contains strings and nulls. See profile attached."*
7.  **Outcome:** 1 hour saved vs. writing a PySpark debugging script.
