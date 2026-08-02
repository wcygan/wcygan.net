use serde_json::json;
use std::{error::Error, fs, io};

fn list_directory(directory: &str) -> io::Result<Vec<String>> {
    let mut entries = fs::read_dir(directory)?
        .map(|entry| Ok(entry?.file_name().to_string_lossy().into_owned()))
        .collect::<io::Result<Vec<_>>>()?;
    entries.sort();
    Ok(entries)
}

fn list_directory_tool(directory: &str) -> Result<String, Box<dyn Error>> {
    let entries = list_directory(directory)?;
    Ok(serde_json::to_string_pretty(
        &json!({ "entries": entries }),
    )?)
}

fn harness() -> Result<(), Box<dyn Error>> {
    println!("{}", list_directory_tool("src/components")?);
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    harness()
}
