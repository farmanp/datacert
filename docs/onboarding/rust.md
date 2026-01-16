# Rust Crash Course for DataCert Developers

Welcome to the DataCert team! This guide is your fast track to understanding the Rust code in this project. We'll focus on the essentials you need to be productive in your first week.

## Philosophy: "Learn by Doing"

The best way to learn Rust is to write it. Your first week will be a mix of reading and hands-on coding. We'll follow a "Hear one, see one, do one" approach:

1.  **Hear One (Concepts):** We introduce a core concept.
2.  **See One (Examples):** We show you how it's used in the DataCert codebase.
3.  **Do One (Exercises):** You'll implement a small, targeted exercise.

## Week 1: Your Rust Journey

### Day 1: The Basics & The Compiler is Your Friend

Your main goal today is to get comfortable with Rust's syntax and, most importantly, its compiler. The Rust compiler is famously helpful. Your job is to learn to read and understand its error messages.

**Concepts:**

*   **Variables & Mutability:** `let` vs. `let mut`.
*   **Basic Data Types:** `i32`, `f64`, `bool`, `char`, `&str`.
*   **Functions:** Syntax and type annotations.
*   **Control Flow:** `if`, `else`, `for`, `while`, `match`.

**"See One" - Where to Look:**

*   `src/wasm/src/stats/` - Look for simple functions and data types.
*   `src/wasm/src/parser/` - See how we handle different data types.

**"Do One" - Your First Task:**

1.  Clone the project locally.
2.  Navigate to the `src/wasm` directory.
3.  Open `src/lib.rs` and add a new "hello world" function:
    ```rust
    #[wasm_bindgen]
    pub fn hello_rust() -> String {
        "Hello from Rust!".to_string()
    }
    ```
4.  Run `npm run build:wasm`. It should compile successfully.
5.  Now, introduce a deliberate error. Change the function to:
    ```rust
    #[wasm_bindgen]
    pub fn hello_rust() -> String {
        "Hello from Rust!" // Note the missing .to_string()
    }
    ```
6.  Run `npm run build:wasm` again. Read the compiler error. It will tell you exactly what's wrong (`expected String, found &str`).
7.  Fix the error and recompile.

**Pro-Tip:** Spend your first day getting comfortable in the `src/wasm` directory. Read the code, make small changes, and see what the compiler says.

### Day 2: Ownership, Borrowing, and Lifetimes

This is the most unique and powerful aspect of Rust. It's how Rust guarantees memory safety without a garbage collector.

**Concepts:**

*   **Ownership:** Every value has a single "owner."
*   **Borrowing:** You can "borrow" access to a value without taking ownership (using `&`).
*   **Mutable Borrows:** You can borrow a mutable reference to a value (using `&mut`).
*   **Lifetimes:** The scope for which a reference is valid. For now, trust the compiler. It will guide you.

**"See One" - Where to Look:**

*   Look for functions that take `&self` or `&mut self`. This is borrowing in action.
*   Notice how we pass references (`&`) to functions to avoid moving ownership.

**"Do One" - Your Second Task:**

1.  In `src/wasm/src/lib.rs`, create a new struct and a function:
    ```rust
    pub struct MyData {
        pub value: i32,
    }

    // This function takes ownership of data
    pub fn process_data(data: MyData) -> i32 {
        data.value * 2
    }
    ```
2.  Try to use `data` after calling `process_data`:
    ```rust
    let my_data = MyData { value: 10 };
    let result = process_data(my_data);
    // println!("{}", my_data.value); // This will cause a compiler error!
    ```
3.  Run `cargo check` in `src/wasm`. You'll get an error about using a "moved value."
4.  Now, change `process_data` to borrow instead:
    ```rust
    pub fn process_data(data: &MyData) -> i32 {
        data.value * 2
    }
    ```
5.  Update the call site: `let result = process_data(&my_data);`.
6.  The code now compiles. You've successfully borrowed!

### Day 3: Structs, Enums, and `Result`

Now we move on to how Rust structures data and handles errors.

**Concepts:**

*   **Structs:** Custom data types.
*   **Enums:** Types that can be one of several variants.
*   **`Option<T>`:** A way to represent an optional value (`Some(T)` or `None`).
*   **`Result<T, E>`:** A way to represent a value that could be success (`Ok(T)`) or an error (`Err(E)`). The `?` operator is your friend for propagating errors.

**"See One" - Where to Look:**

*   `src/wasm/src/types.rs`: You'll see many of our custom `struct` definitions.
*   Throughout the codebase, look for functions that return `Result`. This is our primary error-handling mechanism.
*   `serde` is used heavily with these structs. `#[derive(Serialize, Deserialize)]` is how we make our Rust structs available to the JavaScript side.

**"Do One" - Your Third Task:**

1.  Define a `struct` representing a user.
2.  Write a function that "finds" a user by ID. If the ID is 0, it should return an error. Otherwise, it returns the user. Use `Result`.
    ```rust
    #[derive(Debug)] // For easy printing
    pub struct User {
        id: u32,
        username: String,
    }

    pub fn find_user(id: u32) -> Result<User, String> {
        if id == 0 {
            Err("Invalid user ID".to_string())
        } else {
            Ok(User {
                id,
                username: "testuser".to_string(),
            })
        }
    }
    ```
3.  Write a function that calls `find_user` and uses `match` to handle the `Result`.
4.  Then, write another function that uses the `?` operator to propagate the error.

### Day 4-5: The Broader Ecosystem & Project-Specifics

**Concepts:**

*   **Cargo:** Rust's build system and package manager. `Cargo.toml` is like `package.json`.
*   **Crates:** Rust's term for packages/libraries. `crates.io` is like `npm`.
*   **`wasm-pack` and `wasm-bindgen`:** Our tools for compiling Rust to WebAssembly. `#[wasm_bindgen]` is a macro that makes Rust code accessible to JavaScript.
*   **`serde`:** A crate for serializing and deserializing Rust data structures. We use it to pass complex data between Rust and JS.

**"See One" - Where to Look:**

*   `src/wasm/Cargo.toml`: See the crates we depend on.
*   `src/wasm/src/lib.rs`: Look for `#[wasm_bindgen]` annotations.
*   `src/app/services/worker.ts`: See how we call the Wasm functions from TypeScript.

**"Do One" - Your Final Task:**

1.  Add a new dependency to `src/wasm/Cargo.toml`. A good one to try is `rand` for generating random numbers.
2.  Create a new function in `src/wasm/src/lib.rs` that uses this new crate to generate a random number and returns it.
    ```rust
    use wasm_bindgen::prelude::*;
    use rand::prelude::*;

    #[wasm_bindgen]
    pub fn get_random_number() -> f64 {
        let mut rng = rand::thread_rng();
        rng.gen()
    }
    ```
3.  Run `npm run build:wasm` to build your changes.
4.  (Bonus) Go to `src/app/services/worker.ts` and call your new `get_random_number` function.

## You're Ready!

By the end of the week, you won't be a Rust expert, but you will have the foundational knowledge and hands-on experience to start contributing to the DataCert codebase. Don't be afraid to ask questions, and remember: the compiler is your best friend!

## Week 2: Becoming a Contributor

Welcome to your second week. Now it's time to bridge the gap from learning Rust basics to actively contributing to DataCert. This week, we focus on patterns and practices you'll see every day in the codebase.

### Day 6-7: Traits and Generics

**Concepts:**

*   **Traits:** A way to define shared behavior, similar to interfaces in other languages. We use traits to define a common API for all our statistics calculators.
*   **Generics:** A way to write code that can operate on multiple data types. You'll see this in our code that handles both `i64` and `f64` columns.

**"See One" - Where to Look:**

*   **`src/wasm/src/stats/statistic.rs`**: This is the heart of our statistics engine. You'll find the `Statistic` trait defined here. Every statistic we calculate (mean, median, etc.) implements this trait.
*   Notice how the `Statistic` trait has methods like `update`, `merge`, and `get_result`. This ensures every statistic can be calculated in a streaming and parallel fashion.

**"Do One" - A Deeper Dive into Traits:**

1.  Read the `Statistic` trait in `src/wasm/src/stats/statistic.rs`.
2.  Now, look at `src/wasm/src/stats/mean.rs`. See how the `Mean` struct implements the `Statistic` trait.
3.  Pay close attention to the `update` method. It takes a generic type `T` that must be convertible to `f64`. This is a great example of using traits and generics together.

### Day 8-9: Real-World Error Handling

In Week 1, you used `Result<T, String>` for errors. In a real application, this is not robust enough. We need structured, specific errors.

**Concepts:**

*   **Custom Error Enums:** We define our own error types to represent all the things that can go wrong in our application.
*   **`thiserror` Crate:** A fantastic utility for creating boilerplate-free custom errors. It lets you derive the standard `Error` trait and `Display` formatting with simple annotations.

**"See One" - Where to Look:**

*   **`src/wasm/src/error.rs`**: This file contains our primary `DataCertError` enum. Notice the `#[derive(thiserror::Error, Debug)]` and the `#[error(...)]` annotations. This is `thiserror` in action.
*   Look for functions that return `Result<T, DataCertError>`. This is the standard return type for fallible functions in our Wasm module.
*   The `?` operator is used extensively to propagate these specific errors, not just strings.

### Day 10: Your First Contribution

Now, let's put it all together with a task that mirrors a real feature contribution.

**Goal:** Implement a new statistic: **Sum**. This statistic will calculate the sum of all numbers in a column.

**Step-by-Step Guide:**

1.  **Create the File:** Create a new file `src/wasm/src/stats/sum.rs`.
2.  **Define the Struct:** Inside the new file, define a `Sum` struct. It will need a field to keep track of the running total.
    ```rust
    // src/wasm/src/stats/sum.rs
    use serde::{Serialize, Deserialize};
    use wasm_bindgen::prelude::*;
    // ... other necessary imports

    #[derive(Serialize, Deserialize, Debug, Default, Clone, PartialEq)]
    pub struct Sum {
        pub sum: f64,
    }
    ```
3.  **Implement the `Statistic` Trait:** This is the core of the task. You'll need to implement the `update`, `merge`, and `get_result` methods for your `Sum` struct.
    ```rust
    // In the same file, after your struct definition
    use super::statistic::Statistic;
    use crate::types::Value;
    use crate::error::DataCertError;

    impl Statistic for Sum {
        fn update(&mut self, value: &Value) -> Result<(), DataCertError> {
            if let Some(number) = value.as_f64() {
                self.sum += number;
            }
            Ok(())
        }

        fn merge(&mut self, other: &dyn Statistic) -> Result<(), DataCertError> {
            // Downcast 'other' to a concrete 'Sum' type
            if let Some(other_sum) = other.as_any().downcast_ref::<Sum>() {
                self.sum += other_sum.sum;
                Ok(())
            } else {
                Err(DataCertError::MergeError("Mismatched statistic types".to_string()))
            }
        }

        fn get_result(&self) -> Result<Value, DataCertError> {
            Ok(Value::F64(self.sum))
        }

        fn as_any(&self) -> &dyn std::any::Any {
            self
        }
    }
    ```
4.  **Integrate it:**
    *   Add `pub mod sum;` to `src/wasm/src/stats/mod.rs`.
    *   (This step is simplified for the exercise) In a real ticket, you would add your new `Sum` statistic to the list of statistics to be computed for a column. For now, just having it compile is a success.
5.  **Build and Test:**
    *   Run `npm run build:wasm`. The compiler will be your guide. You might have missing `use` statements or type mismatches. Work through the errors one by one.
    *   (Bonus) Write a unit test for your `Sum` statistic in a new file `src/wasm/src/stats/sum.test.rs`. Look at `mean.test.rs` for inspiration.

By completing this exercise, you will have touched the most important parts of the Rust codebase: creating a new module, implementing a core trait, handling errors, and integrating your code into the existing structure. You're no longer just learning—you're contributing.
