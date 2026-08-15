# Feature: File Management

## Purpose
Let teachers upload and manage educational resources (PDFs, images,
documents, videos) attached to courses/lessons.

## Data
`files/{fileId}` — see `database/collections.md`.

## Flow
See `cloudinary/README.md` for the signed-upload sequence. Metadata is
persisted to Firestore only after Cloudinary confirms the upload.

## Authorization
Only the owning teacher can upload/delete files under their own
`teacherId` folder; the signing endpoint enforces this before ever
issuing a signature.
