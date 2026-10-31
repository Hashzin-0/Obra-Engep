-- The bucket currently has no objects and no application upload path.
-- Keep it private and disable direct client writes until a server-side
-- decoder/re-encoder is implemented; MIME metadata alone is not a file signature.
drop policy if exists user_media_insert on storage.objects;
drop policy if exists user_media_update on storage.objects;
drop policy if exists user_media_delete on storage.objects;
drop policy if exists user_media_read on storage.objects;
