# Cleanverse Authentication & Encryption Specification

## Authentication
All API requests require the `api-id` header to identify the application.
- Header: `api-id: <your_api_id>`
- The `api-key` is **never sent** in headers or requests. It is used locally to encrypt and decrypt the request/response payloads.

## Encryption
Selected endpoints (like `generate_apass`, `register_atoken`, `validator/register`, etc.) require their JSON request bodies to be encrypted and wrapped in a single `data` field.

- **Algorithm**: AES
- **Cipher Mode**: AES/CBC/PKCS5Padding
- **Cipher IV**: 16 zero bytes (`0x00, 0x00...`)
- **Key Source**: Base64-decoded `api-key` provided by Cleanverse
- **Encoding**: Base64
- **Character Set**: UTF-8

### Encryption Process
1. Convert the JSON request body to a UTF-8 string.
2. Decode the Base64-encoded `api-key` to bytes. Use these bytes as the AES encryption key.
3. Encrypt the JSON string using AES/CBC/PKCS5Padding with the 16-zero-byte IV.
4. Encode the resulting encrypted bytes to a Base64 string.
5. Send the payload as `{"data": "<Base64_encrypted_string>"}`.

### Decryption Process
1. Receive the Base64-encoded encrypted response (`{"data": "<Base64_encrypted_string>"}`).
2. Decode the Base64 string to bytes.
3. Decrypt the bytes using AES/CBC/PKCS5Padding with the decoded `api-key` and 16-zero-byte IV.
4. Parse the decrypted UTF-8 string as JSON.
