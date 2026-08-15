# ADR 0004: Signed Cloudinary Uploads via Server Signature

## Status
Accepted

## Context
Need to let teachers upload media without exposing `CLOUDINARY_API_SECRET`
to the client, while still keeping uploads reasonably fast (not proxying
full file bytes through our own server).

## Decision
Client uploads directly to Cloudinary using parameters signed by a
short-lived server-generated signature (`/api/uploads/sign`), which also
enforces authorization (does this teacher own the target folder?) before
signing.

## Consequences
- No file bytes pass through our Vercel functions (avoids serverless
  payload/time limits for large videos).
- The signing endpoint is the authorization choke point and must be kept
  in sync with folder-structure conventions (`cloudinary/README.md`).
