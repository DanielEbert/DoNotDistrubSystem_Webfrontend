// Daniel Ebert (65926)

import {
  crypto_sign_detached,
  to_base64,
  from_base64,
  base64_variants,
} from "libsodium-wrappers-sumo";

// Convert and return 'input' from a string to a Uint8Array.
export function string_to_uint8array(input) {
  var textEncoder = new TextEncoder();
  return textEncoder.encode(input);
}

// Convert and return 'input' from a Uint8Array to a string.
export function uint8array_to_string(input) {
  var textDecoder = new TextDecoder();
  return textDecoder.decode(input);
}

// Return the signature for 'message' using 'private_key'
// Uses the Edwards-Curve Digital Signature Algorithm (EdDSA) from the
// third-party libsodium library to create the signature.
// 'message' is a string.
// 'private_key' is a base64 encoded string.
// The return type is a base64 encoded string.
export function generate_signature(message, private_key) {
  let message_uint8array = string_to_uint8array(message);
  let private_key_uint8array = from_base64(
    private_key,
    base64_variants.ORIGINAL
  );
  const signature_uint8array = crypto_sign_detached(
    message_uint8array,
    private_key_uint8array
  );
  const signature_string_base64 = to_base64(
    signature_uint8array,
    base64_variants.ORIGINAL
  );
  return signature_string_base64;
}

// The MQTT message that is sent to the backend must be idempotent, so that
// noone can replay the message later (e.g. after the user unregisters the
// device).
// The MQTT message is made idempotent by adding a timestamp. This timestamp
// is in epoch time (i.e. the time in seconds since 1.1.1970 UTC).
// The following code is from https://futurestud.io/tutorials/get-number-of-seconds-since-epoch-in-javascript
export function signature_timestamp() {
  const date = new Date();
  const utcMilllisecondsSinceEpoch =
    date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  // epoch time in UTC timezone
  const timestamp = Math.round(utcMilllisecondsSinceEpoch / 1000).toString();
  return timestamp;
}
