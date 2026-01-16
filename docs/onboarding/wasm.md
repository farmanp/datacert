# Wasm Crash Course for DataCert Developers

Welcome to the team! This guide will get you up to speed on how we use WebAssembly (Wasm) in the DataCert project. You don't need to be a Wasm expert, but understanding the "why" and "how" will make you much more effective.

## What is Wasm and Why Do We Use It?

Think of WebAssembly as a way to run code written in languages like Rust, C++, or Go directly in the browser at near-native speed.

For DataCert, this is a game-changer:

1.  **Performance:** Data profiling involves heavy computations. JavaScript, being single-threaded and interpreted, can be slow for this. Our Rust engine, compiled to Wasm, is significantly faster.
2.  **Code Reuse:** We can use the same high-performance Rust engine for both our web app and our future command-line interface (CLI).
3.  **Security & Portability:** Wasm runs in the same sandbox as JavaScript, so it's safe. And it's an open standard, supported by all modern browsers.

## How It Works in DataCert: A High-Level View

Our setup involves a "bridge" between the JavaScript/TypeScript world and the Rust/Wasm world.

```
+---------------------------+       +-------------------------+
|      JavaScript/TS        |       |        Rust/Wasm        |
|  (UI, State, Workers)     |       |   (Parsing, Stats)      |
+---------------------------+       +-------------------------+
           ^   |
           |   | (JS objects)               |   | (Rust structs)
           |   v                            |   v
+-------------------------------------------------------------+
|               The Bridge (wasm-bindgen / Serde)             |
+-------------------------------------------------------------+
```

1.  **The JavaScript Side (TypeScript):** Our SolidJS application. It handles the UI. When a user drops a file, our app sends the data to a Web Worker.
2.  **The Bridge (`wasm-bindgen` and `serde`):** This is the magic.
    *   `wasm-bindgen`: A tool that allows JavaScript and Rust to call each other's functions.
    *   `serde` (and `serde-wasm-bindgen`): A library that converts (serializes/deserializes) data between JavaScript objects and Rust structs.
3.  **The Rust Side (Wasm):** Our core engine. It receives data from JavaScript, processes it, and returns the results.

## The Developer Workflow

You're a JavaScript developer and you need to interact with the Wasm module. Here's your mental model:

1.  **Define Your Data Structures:** Any data you want to pass between JS and Rust must have a corresponding `struct` in Rust. You'll find these in `src/wasm/src/types.rs`. Notice they all have `#[derive(Serialize, Deserialize)]`. This is the `serde` magic.

    ```rust
    // In Rust (src/wasm/src/types.rs)
    use serde::{Serialize, Deserialize};

    #[derive(Serialize, Deserialize)]
    pub struct ProfileArgs {
        pub content: String,
        pub has_headers: bool,
    }
    ```

2.  **Expose a Rust Function:** In `src/wasm/src/lib.rs`, we have functions that we want to call from JS. We mark them with `#[wasm_bindgen]`.

    ```rust
    // In Rust (src/wasm/src/lib.rs)
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub fn profile(args: JsValue) -> Result<JsValue, JsValue> {
        // We receive a generic JsValue...
        let args: ProfileArgs = serde_wasm_bindgen::from_value(args)?;
        
        // ... do some work ...
        let results = perform_profiling(args.content, args.has_headers);

        // We return a generic JsValue...
        Ok(serde_wasm_bindgen::to_value(&results)?)
    }
    ```
    **Key Point:** Notice we don't use `ProfileArgs` directly in the function signature. We use `JsValue`, which is a generic JavaScript value. Then, inside the function, we use `serde_wasm_bindgen` to parse it into our specific Rust struct. This is the most robust way to handle the boundary.

3.  **Build the Wasm Module:** Whenever you make changes to the Rust code in `src/wasm`, you must re-compile it by running:
    ```bash
    npm run build:wasm
    ```
    This command uses `wasm-pack` to compile the Rust code and generate the necessary JavaScript "glue" code in `src/wasm/pkg`.

4.  **Call it from TypeScript:** Our `npm run build:wasm` command also generates a TypeScript definition file (`.d.ts`). This gives us type-safe access to our Wasm functions from TypeScript.

    ```typescript
    // In TypeScript (e.g., src/app/services/worker.ts)
    import init, { profile } from '../../wasm/pkg';
    import { ProfileArgs } from '../types'; // This is a TS type, not the Rust one

    // ... inside an async function ...
    await init(); // Initialize the Wasm module

    const args: ProfileArgs = {
        content: 'col1,col2\n1,2',
        hasHeaders: true, // Note camelCase in JS
    };
    
    try {
        const resultJsValue = profile(args); // wasm-bindgen handles the arg conversion
        const results = resultJsValue.into(serde_wasm_bindgen.from_value); // Convert back to JS object
        console.log(results);
    } catch (error) {
        console.error("Wasm execution failed:", error);
    }
    ```

## Your "Hello Wasm" Task

1.  **Follow the Rust guide first** to get a basic `hello_rust` function working.
2.  Now, modify that function to take an argument:
    ```rust
    // In src/wasm/src/lib.rs
    #[wasm_bindgen]
    pub fn greet(name: &str) -> String {
        format!("Hello, {}!", name)
    }
    ```
3.  Run `npm run build:wasm`.
4.  Go to a TypeScript file (e.g., `src/app/App.tsx`) and add a temporary `useEffect`:
    ```typescript
    import { onMount } from 'solid-js';
    import init, { greet } from '../wasm/pkg';

    onMount(async () => {
        await init();
        const message = greet("DataCert Developer");
        console.log(message); // Should log "Hello, DataCert Developer!"
    });
    ```
5.  Run `npm run dev` and check your browser's console.

This simple exercise walks you through the entire round-trip: from your TypeScript code, across the Wasm bridge, into Rust, and back with a result. This is the core workflow you'll use when working with our Rust engine.

## Deeper Dive: Performance and Debugging

Once you're comfortable with the basics, it's time to understand the nuances of the JS-Wasm boundary.

### The Cost of Crossing the Bridge

Every call from JavaScript to Wasm, and every piece of data returned, has to cross the "bridge." This is not free. The primary cost is **serialization and deserialization**.

*   `serde_wasm_bindgen::from_value(js_value)`: Parses a generic `JsValue` and creates a brand new Rust `struct`. This involves memory allocation and validation.
*   `serde_wasm_bindgen::to_value(&rust_struct)`: Serializes a Rust `struct` into a new `JsValue`.

**Pro-Tip on Performance:**

1.  **Be Chunky, Not Chatty:** It's much cheaper to make one call to Wasm with a large data payload than to make hundreds of small calls. Our `profile` function is a good example: we send the entire file content at once.
2.  **Avoid Unnecessary Serialization:** If a piece of data is only ever used within the Wasm module, don't pass it back and forth. Keep it in Rust-land.
3.  **Consider Zero-Copy (Advanced):** For extreme performance needs, `wasm-bindgen` allows you to directly access the Wasm linear memory from JavaScript. This avoids serialization entirely but is much more complex to handle. We don't use this extensively yet, but it's a tool in our arsenal.

### Debugging Your Wasm Code

Debugging Wasm can seem intimidating, but it's quite manageable.

1.  **Build with Debug Symbols:** Make sure your `src/wasm/Cargo.toml` is configured to include debug information in `dev` builds. This is usually the default.
2.  **Use `console.log` from Rust:** The `web-sys` crate provides bindings to browser APIs, including `console.log`.
    ```rust
    use web_sys::console;

    console::log_1(&"Hello from Rust!".into());
    ```
3.  **Browser DevTools:** Modern browsers (like Chrome and Firefox) have decent Wasm debugging support.
    *   **Enable DWARF Support:** In Chrome DevTools, go to Settings (cog icon) -> Experiments and check "WebAssembly Debugging: Enable DWARF support".
    *   **Set Breakpoints:** You can then open your `.rs` files directly in the "Sources" tab and set breakpoints just like you would with JavaScript! When the Wasm code is executed, the debugger will pause, and you can inspect variables.

### Advanced Exercise: Filtering Data

Let's write a function that takes an array of objects from JavaScript, filters them in Rust, and returns the filtered array.

**Goal:** Create a `filter_users` function. It will accept an array of `User` objects and a `min_age`. It should return a new array containing only the users older than `min_age`.

1.  **Define the Data Structures (Rust):**
    In a relevant file like `src/wasm/src/lib.rs`, define the `User` struct.
    ```rust
    use serde::{Serialize, Deserialize};

    #[derive(Serialize, Deserialize, Debug)]
    pub struct User {
        pub id: u32,
        pub username: String,
        pub age: u32,
    }
    ```
2.  **Expose the Function (Rust):**
    ```rust
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub fn filter_users(users_js: JsValue, min_age: u32) -> Result<JsValue, JsValue> {
        // Deserialize the JS array into a Vec of Rust structs
        let users: Vec<User> = serde_wasm_bindgen::from_value(users_js)?;

        // Perform the filtering logic using standard Rust iterators
        let filtered_users: Vec<User> = users
            .into_iter()
            .filter(|user| user.age > min_age)
            .collect();

        // Serialize the result back into a JS value
        Ok(serde_wasm_bindgen::to_value(&filtered_users)?)
    }
    ```
3.  **Build the Wasm Module:**
    ```bash
    npm run build:wasm
    ```
4.  **Call it from TypeScript:**
    In a component or test file, create some sample data and call your new function.
    ```typescript
    // In a temporary test or component
    import init, { filter_users } from '../wasm/pkg';

    async function testFilter() {
        await init();

        const users = [
            { id: 1, username: 'alice', age: 25 },
            { id: 2, username: 'bob', age: 35 },
            { id: 3, username: 'charlie', age: 30 },
        ];

        try {
            const filteredJs = filter_users(users, 30);
            const filtered = filteredJs.into(serde_wasm_bindgen.from_value); // Convert back
            console.log(filtered); // Should log: [{ id: 2, username: 'bob', age: 35 }]
        } catch(e) {
            console.error("Wasm call failed:", e);
        }
    }

    testFilter();
    ```
This exercise forces you to handle a collection of complex objects, which is a very common real-world scenario. It demonstrates the power of using Rust's expressive iterators and the cost of serializing data collections across the boundary.

