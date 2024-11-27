use anchor_lang::prelude::*;
use std::str::FromStr;

declare_id!("ZixJjM4iWwtnwkr6qD6cgNBC8xjFYbGjsLaoNDKzyWA");

#[program]
mod string_to_address_mapping {
    use super::*;

    // This function retrieves a mapped address based on an input string
    pub fn get_address(_ctx: Context<Empty>, input: String) -> Result<Pubkey> {
        // Define a hardcoded mapping between strings and public keys
        let mapping = [
            (
                "+1234567890".to_string(),
                Pubkey::from_str("BCuSYsckaRs5WK1w8bbpSbnKCe6xWFjLDSFo7AAwjUAo").unwrap(),
            ),
            (
                "+2222222222".to_string(),
                Pubkey::from_str("5FvNyzr7RY7Eemw75bQFGjQqvctH9TFxy62zGRNiXXDL").unwrap(),
            ),
            (
                "+3333333333".to_string(),
                Pubkey::from_str("J5gLzp9UPqEkPfA9xskspJeALAzxPbLiyG58d7CHhx3v").unwrap(),
            ),
        ];

        // Iterate through the mapping to find a match for the input
        for (key, address) in mapping.iter() {
            if *key == input {
                // Log the found address
                msg!("Found address for {}: {}", key, address);
                return Ok(*address); // Return the corresponding address
            }
        }

        // If no match is found, return an error
        msg!("No mapping found for input: {}", input);
        Err(ErrorCode::MappingNotFound.into())
    }
}

// Empty context struct since no specific accounts are needed for this function
#[derive(Accounts)]
pub struct Empty {}

// Define custom error types
#[error_code]
pub enum ErrorCode {
    #[msg("Mapping not found for the given input string.")]
    MappingNotFound,
}
